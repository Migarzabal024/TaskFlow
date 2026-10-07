const { eq, and, or, inArray, isNull, isNotNull } = require("drizzle-orm");
const { db } = require("../db/client");
const { tasks, taskHistory, familyMembers } = require("../db/schema");
const AppError = require("../utils/AppError");

async function assertAssigneeInFamily(familyId, assignedToId) {
  const [membership] = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, assignedToId)));

  if (!membership) {
    throw new AppError("El usuario asignado no pertenece a esta familia", 400);
  }
}

async function getTaskOrThrow(familyId, taskId) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, Number(taskId)), eq(tasks.familyId, familyId)));

  if (!task) {
    throw new AppError("Tarea no encontrada", 404);
  }

  return task;
}

async function getSubtaskOrThrow(familyId, parentId, subtaskId) {
  const [subtask] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, Number(subtaskId)),
        eq(tasks.parentTaskId, Number(parentId)),
        eq(tasks.familyId, familyId)
      )
    );

  if (!subtask) {
    throw new AppError("Subtarea no encontrada", 404);
  }

  return subtask;
}

async function assertCanView(task, user, familyMembership) {
  if (familyMembership.role === "LEADER") return;
  if (task.assignedToId === user.id) return;

  // Tarea compuesta sin assignee propio: el miembro puede verla si tiene
  // al menos una subtarea asignada (necesita el contexto del padre).
  const [subtask] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, task.id), eq(tasks.assignedToId, user.id)))
    .limit(1);

  if (subtask) return;

  throw new AppError("No tenés permiso para ver esta tarea", 403);
}

// Recalcula el status del padre a partir de sus subtareas (spec seccion 4).
// Nunca se guarda manualmente: se deriva cada vez que una subtarea cambia.
async function recomputeParentStatus(parentId, actingUserId) {
  const subtasks = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.parentTaskId, parentId));

  if (subtasks.length === 0) return;

  const allCompleted = subtasks.every((s) => s.status === "COMPLETED");
  const anyActive = subtasks.some((s) => s.status === "IN_PROGRESS" || s.status === "COMPLETED");
  const newStatus = allCompleted ? "COMPLETED" : anyActive ? "IN_PROGRESS" : "PENDING";

  const [parent] = await db.select().from(tasks).where(eq(tasks.id, parentId));
  if (!parent || parent.status === newStatus) return;

  const patch = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "IN_PROGRESS" && !parent.startedAt) patch.startedAt = new Date();
  if (newStatus === "COMPLETED" && !parent.completedAt) patch.completedAt = new Date();

  await db.update(tasks).set(patch).where(eq(tasks.id, parent.id));

  await db.insert(taskHistory).values({
    taskId: parent.id,
    userId: actingUserId,
    action: "STATUS_CHANGED",
    previousStatus: parent.status,
    newStatus,
    metadata: { derivedFromSubtasks: true },
  });
}

async function createSimpleTask(user, familyId, data) {
  await assertAssigneeInFamily(familyId, data.assignedToId);

  const [task] = await db
    .insert(tasks)
    .values({
      familyId,
      createdById: user.id,
      assignedToId: data.assignedToId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      priority: data.priority,
      status: "PENDING",
    })
    .returning();

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId: user.id,
    action: "CREATED",
    newStatus: "PENDING",
  });

  return { ...task, subtasks: [] };
}

async function createCompositeTask(user, familyId, data) {
  for (const sub of data.subtasks) {
    await assertAssigneeInFamily(familyId, sub.assignedToId);
  }

  const [parent] = await db
    .insert(tasks)
    .values({
      familyId,
      createdById: user.id,
      assignedToId: null,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      priority: data.priority,
      status: "PENDING",
    })
    .returning();

  await db.insert(taskHistory).values({
    taskId: parent.id,
    userId: user.id,
    action: "CREATED",
    newStatus: "PENDING",
  });

  const createdSubtasks = [];
  for (const sub of data.subtasks) {
    const [subtaskRow] = await db
      .insert(tasks)
      .values({
        familyId,
        parentTaskId: parent.id,
        createdById: user.id,
        assignedToId: sub.assignedToId,
        title: sub.title,
        description: sub.description,
        dueDate: parent.dueDate,
        dueTime: sub.dueTime,
        priority: sub.priority,
        status: "PENDING",
      })
      .returning();

    await db.insert(taskHistory).values({
      taskId: subtaskRow.id,
      userId: user.id,
      action: "CREATED",
      newStatus: "PENDING",
    });

    createdSubtasks.push(subtaskRow);
  }

  return { ...parent, subtasks: createdSubtasks };
}

async function createTask(user, familyId, data) {
  if (data.subtasks) {
    return createCompositeTask(user, familyId, data);
  }
  return createSimpleTask(user, familyId, data);
}

async function listTasks(user, familyMembership, filters) {
  const conditions = [
    eq(tasks.familyId, familyMembership.familyId),
    isNull(tasks.deletedAt),
    isNull(tasks.parentTaskId),
  ];

  if (familyMembership.role !== "LEADER") {
    const assignedSubtaskParents = await db
      .select({ parentTaskId: tasks.parentTaskId })
      .from(tasks)
      .where(
        and(
          eq(tasks.familyId, familyMembership.familyId),
          eq(tasks.assignedToId, user.id),
          isNotNull(tasks.parentTaskId)
        )
      );

    const parentIds = assignedSubtaskParents.map((r) => r.parentTaskId);

    conditions.push(
      parentIds.length > 0
        ? or(eq(tasks.assignedToId, user.id), inArray(tasks.id, parentIds))
        : eq(tasks.assignedToId, user.id)
    );
  } else if (filters.assignedToId) {
    conditions.push(eq(tasks.assignedToId, filters.assignedToId));
  }

  if (filters.status) conditions.push(eq(tasks.status, filters.status));
  if (filters.priority) conditions.push(eq(tasks.priority, filters.priority));
  if (filters.dueDate) conditions.push(eq(tasks.dueDate, filters.dueDate));

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(tasks.dueDate);
}

async function getTaskById(user, familyMembership, taskId) {
  const task = await getTaskOrThrow(familyMembership.familyId, taskId);
  await assertCanView(task, user, familyMembership);

  const subtasks = await db.select().from(tasks).where(eq(tasks.parentTaskId, task.id));

  return { ...task, subtasks };
}

async function updateTask(user, familyMembership, taskId, data) {
  const task = await getTaskOrThrow(familyMembership.familyId, taskId);

  const [updated] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, task.id))
    .returning();

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId: user.id,
    action: "UPDATED",
    metadata: data,
  });

  return updated;
}

async function assignTask(user, familyMembership, taskId, assignedToId) {
  const task = await getTaskOrThrow(familyMembership.familyId, taskId);

  await assertAssigneeInFamily(familyMembership.familyId, assignedToId);

  const action = task.assignedToId ? "REASSIGNED" : "ASSIGNED";

  const [updated] = await db
    .update(tasks)
    .set({ assignedToId, updatedAt: new Date() })
    .where(eq(tasks.id, task.id))
    .returning();

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId: user.id,
    action,
    metadata: { previousAssignedToId: task.assignedToId, newAssignedToId: assignedToId },
  });

  return updated;
}

const ALLOWED_TRANSITIONS = {
  IN_PROGRESS: ["PENDING"],
  COMPLETED: ["PENDING", "IN_PROGRESS"],
};

async function updateStatus(user, familyMembership, taskId, status) {
  const task = await getTaskOrThrow(familyMembership.familyId, taskId);

  const isLeader = familyMembership.role === "LEADER";
  const isAssignee = task.assignedToId === user.id;
  if (!isLeader && !isAssignee) {
    throw new AppError("No tenés permiso para actualizar esta tarea", 403);
  }

  const [anySubtask] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.parentTaskId, task.id))
    .limit(1);

  if (anySubtask) {
    throw new AppError(
      "El estado de una tarea compuesta se deriva de sus subtareas, no se puede cambiar manualmente",
      400
    );
  }

  const allowedFrom = ALLOWED_TRANSITIONS[status] || [];
  if (!allowedFrom.includes(task.status)) {
    throw new AppError(`No se puede pasar de ${task.status} a ${status}`, 400);
  }

  const patch = { status, updatedAt: new Date() };
  const action = status === "IN_PROGRESS" ? "STARTED" : "COMPLETED";
  if (status === "IN_PROGRESS") patch.startedAt = new Date();
  if (status === "COMPLETED") patch.completedAt = new Date();

  const [updated] = await db.update(tasks).set(patch).where(eq(tasks.id, task.id)).returning();

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId: user.id,
    action,
    previousStatus: task.status,
    newStatus: status,
  });

  return updated;
}

// --- Subtareas ---------------------------------------------------------

async function listSubtasks(familyId, parentId) {
  await getTaskOrThrow(familyId, parentId);
  return db.select().from(tasks).where(eq(tasks.parentTaskId, Number(parentId)));
}

async function createSubtask(user, familyId, parentId, data) {
  const parent = await getTaskOrThrow(familyId, parentId);

  if (parent.parentTaskId !== null) {
    throw new AppError("No se pueden agregar subtareas a una subtarea", 400);
  }

  if (parent.assignedToId !== null) {
    throw new AppError("No se pueden agregar subtareas a una tarea simple", 400);
  }

  await assertAssigneeInFamily(familyId, data.assignedToId);

  const [subtask] = await db
    .insert(tasks)
    .values({
      familyId,
      parentTaskId: parent.id,
      createdById: user.id,
      assignedToId: data.assignedToId,
      title: data.title,
      description: data.description,
      dueDate: parent.dueDate,
      dueTime: data.dueTime,
      priority: data.priority,
      status: "PENDING",
    })
    .returning();

  await db.insert(taskHistory).values({
    taskId: subtask.id,
    userId: user.id,
    action: "CREATED",
    newStatus: "PENDING",
  });

  await recomputeParentStatus(parent.id, user.id);

  return subtask;
}

async function updateSubtask(user, familyMembership, parentId, subtaskId, data) {
  const subtask = await getSubtaskOrThrow(familyMembership.familyId, parentId, subtaskId);

  const [updated] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, subtask.id))
    .returning();

  await db.insert(taskHistory).values({
    taskId: subtask.id,
    userId: user.id,
    action: "UPDATED",
    metadata: data,
  });

  return updated;
}

async function assignSubtask(user, familyMembership, parentId, subtaskId, assignedToId) {
  const subtask = await getSubtaskOrThrow(familyMembership.familyId, parentId, subtaskId);

  await assertAssigneeInFamily(familyMembership.familyId, assignedToId);

  const action = subtask.assignedToId ? "REASSIGNED" : "ASSIGNED";

  const [updated] = await db
    .update(tasks)
    .set({ assignedToId, updatedAt: new Date() })
    .where(eq(tasks.id, subtask.id))
    .returning();

  await db.insert(taskHistory).values({
    taskId: subtask.id,
    userId: user.id,
    action,
    metadata: { previousAssignedToId: subtask.assignedToId, newAssignedToId: assignedToId },
  });

  return updated;
}

async function updateSubtaskStatus(user, familyMembership, parentId, subtaskId, status) {
  const subtask = await getSubtaskOrThrow(familyMembership.familyId, parentId, subtaskId);

  const isLeader = familyMembership.role === "LEADER";
  const isAssignee = subtask.assignedToId === user.id;
  if (!isLeader && !isAssignee) {
    throw new AppError("No tenés permiso para actualizar esta subtarea", 403);
  }

  const allowedFrom = ALLOWED_TRANSITIONS[status] || [];
  if (!allowedFrom.includes(subtask.status)) {
    throw new AppError(`No se puede pasar de ${subtask.status} a ${status}`, 400);
  }

  const patch = { status, updatedAt: new Date() };
  const action = status === "IN_PROGRESS" ? "STARTED" : "COMPLETED";
  if (status === "IN_PROGRESS") patch.startedAt = new Date();
  if (status === "COMPLETED") patch.completedAt = new Date();

  const [updated] = await db.update(tasks).set(patch).where(eq(tasks.id, subtask.id)).returning();

  await db.insert(taskHistory).values({
    taskId: subtask.id,
    userId: user.id,
    action,
    previousStatus: subtask.status,
    newStatus: status,
  });

  await recomputeParentStatus(Number(parentId), user.id);

  return updated;
}

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  assignTask,
  updateStatus,
  listSubtasks,
  createSubtask,
  updateSubtask,
  assignSubtask,
  updateSubtaskStatus,
};

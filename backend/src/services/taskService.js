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

// Una tarea esta vencida si su dueDate (+ dueTime si lo tiene, si no fin
// del dia) ya paso. Solo aplica a tareas todavia accionables.
function isOverdue(task, now) {
  const deadline = new Date(`${task.dueDate}T${task.dueTime || "23:59:59"}`);
  return deadline < now;
}

const EXPIRABLE_STATUSES = ["PENDING", "IN_PROGRESS"];

// Barrido perezoso de expiracion (spec seccion 5: "Overdue incomplete tasks
// can become EXPIRED according to backend expiration logic"). No hay
// scheduler en el MVP: se ejecuta en cada lectura de tareas de la familia,
// lo que garantiza datos correctos sin infraestructura de cron adicional.
// Documentado en docs/decisiones.md.
async function expireOverdueFamilyTasks(familyId) {
  const now = new Date();

  const candidates = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.familyId, familyId),
        isNull(tasks.deletedAt),
        inArray(tasks.status, EXPIRABLE_STATUSES)
      )
    );

  const overdue = candidates.filter((t) => isOverdue(t, now));
  if (overdue.length === 0) return;

  const affectedParents = new Set();

  for (const task of overdue) {
    await db
      .update(tasks)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(tasks.id, task.id));

    await db.insert(taskHistory).values({
      taskId: task.id,
      userId: task.createdById,
      action: "STATUS_CHANGED",
      previousStatus: task.status,
      newStatus: "EXPIRED",
      metadata: { reason: "overdue", automatic: true },
    });

    if (task.parentTaskId) affectedParents.add(task.parentTaskId);
  }

  for (const parentId of affectedParents) {
    await recomputeParentStatus(parentId, overdue.find((t) => t.parentTaskId === parentId).createdById);
  }
}

// Recalcula el status del padre a partir de sus subtareas (spec seccion 4).
// Nunca se guarda manualmente: se deriva cada vez que una subtarea cambia.
// Las subtareas CANCELLED se excluyen del calculo (como si no existieran).
// CANNOT_COMPLETE y EXPIRED cuentan como "activas" pero nunca permiten que
// el padre se de por completado: necesitan intervencion del lider.
async function recomputeParentStatus(parentId, actingUserId) {
  const allSubtasks = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.parentTaskId, parentId));

  const subtasks = allSubtasks.filter((s) => s.status !== "CANCELLED");

  if (subtasks.length === 0) return;

  const allCompleted = subtasks.every((s) => s.status === "COMPLETED");
  const anyActive = subtasks.some((s) =>
    ["IN_PROGRESS", "COMPLETED", "CANNOT_COMPLETE", "EXPIRED"].includes(s.status)
  );
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
  await expireOverdueFamilyTasks(familyMembership.familyId);

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
  await expireOverdueFamilyTasks(familyMembership.familyId);

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

// Reporte de imposibilidad de completar (spec seccion 10). Solo el
// responsable directo de la tarea/subtarea puede reportarlo, nunca el
// lider en su lugar. La razon nunca se sobreescribe silenciosamente: una
// vez en CANNOT_COMPLETE, un nuevo intento es rechazado.
async function cannotComplete(user, familyMembership, taskId, reason) {
  const task = await getTaskOrThrow(familyMembership.familyId, taskId);

  if (task.assignedToId !== user.id) {
    throw new AppError("Solo el responsable de la tarea puede reportar que no puede completarla", 403);
  }

  if (!["PENDING", "IN_PROGRESS"].includes(task.status)) {
    throw new AppError(`No se puede reportar CANNOT_COMPLETE desde el estado ${task.status}`, 400);
  }

  const [updated] = await db
    .update(tasks)
    .set({ status: "CANNOT_COMPLETE", cannotCompleteReason: reason, updatedAt: new Date() })
    .where(eq(tasks.id, task.id))
    .returning();

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId: user.id,
    action: "CANNOT_COMPLETE",
    previousStatus: task.status,
    newStatus: "CANNOT_COMPLETE",
    metadata: { reason },
  });

  if (task.parentTaskId) {
    await recomputeParentStatus(task.parentTaskId, user.id);
  }

  return updated;
}

// Cancelacion logica (spec seccion 12). Solo el LEADER puede cancelar.
// Si la tarea tiene subtareas activas, se cancelan en cascada (una tarea
// cancelada no puede dejar subtareas sueltas accionables). Si la tarea es
// en si misma una subtarea, se recalcula el status del padre despues.
async function cancelTask(user, familyMembership, taskId) {
  const task = await getTaskOrThrow(familyMembership.familyId, taskId);

  if (["COMPLETED", "CANCELLED"].includes(task.status)) {
    throw new AppError(`No se puede cancelar una tarea en estado ${task.status}`, 400);
  }

  const now = new Date();

  const [cancelled] = await db
    .update(tasks)
    .set({ status: "CANCELLED", cancelledAt: now, cancelledById: user.id, deletedAt: now, updatedAt: now })
    .where(eq(tasks.id, task.id))
    .returning();

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId: user.id,
    action: "CANCELLED",
    previousStatus: task.status,
    newStatus: "CANCELLED",
  });

  // Cascada: cancelar subtareas todavia activas de este padre.
  const activeSubtasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.parentTaskId, task.id),
        inArray(tasks.status, ["PENDING", "IN_PROGRESS", "CANNOT_COMPLETE"])
      )
    );

  for (const sub of activeSubtasks) {
    await db
      .update(tasks)
      .set({ status: "CANCELLED", cancelledAt: now, cancelledById: user.id, deletedAt: now, updatedAt: now })
      .where(eq(tasks.id, sub.id));

    await db.insert(taskHistory).values({
      taskId: sub.id,
      userId: user.id,
      action: "CANCELLED",
      previousStatus: sub.status,
      newStatus: "CANCELLED",
      metadata: { cascadedFromParent: task.id },
    });
  }

  if (task.parentTaskId) {
    await recomputeParentStatus(task.parentTaskId, user.id);
  }

  return cancelled;
}

// --- Subtareas ---------------------------------------------------------

async function listSubtasks(familyId, parentId) {
  await expireOverdueFamilyTasks(familyId);
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
  cannotComplete,
  cancelTask,
  listSubtasks,
  createSubtask,
  updateSubtask,
  assignSubtask,
  updateSubtaskStatus,
};

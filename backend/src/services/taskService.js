const { eq, and, isNull } = require("drizzle-orm");
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

function assertCanView(task, user, familyMembership) {
  if (familyMembership.role === "LEADER") return;
  if (task.assignedToId !== user.id) {
    throw new AppError("No tenés permiso para ver esta tarea", 403);
  }
}

async function createTask(user, familyId, data) {
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

  return task;
}

async function listTasks(user, familyMembership, filters) {
  const conditions = [eq(tasks.familyId, familyMembership.familyId), isNull(tasks.deletedAt)];

  if (familyMembership.role !== "LEADER") {
    conditions.push(eq(tasks.assignedToId, user.id));
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
  assertCanView(task, user, familyMembership);
  return task;
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

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  assignTask,
  updateStatus,
};

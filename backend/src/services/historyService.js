const { eq } = require("drizzle-orm");
const { db } = require("../db/client");
const { taskHistory, users } = require("../db/schema");
const taskService = require("./taskService");

// Misma regla de visibilidad que el detalle de la tarea (spec seccion 17:
// Task Detail muestra "history").
async function getTaskHistory(user, familyMembership, taskId) {
  const task = await taskService.getTaskOrThrow(familyMembership.familyId, taskId);
  await taskService.assertCanView(task, user, familyMembership);

  return db
    .select({
      id: taskHistory.id,
      action: taskHistory.action,
      previousStatus: taskHistory.previousStatus,
      newStatus: taskHistory.newStatus,
      metadata: taskHistory.metadata,
      createdAt: taskHistory.createdAt,
      userId: users.id,
      userName: users.name,
    })
    .from(taskHistory)
    .innerJoin(users, eq(taskHistory.userId, users.id))
    .where(eq(taskHistory.taskId, task.id))
    .orderBy(taskHistory.createdAt);
}

module.exports = { getTaskHistory };

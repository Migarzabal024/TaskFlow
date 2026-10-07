const { eq } = require("drizzle-orm");
const { db } = require("../db/client");
const { taskMessages } = require("../db/schema");
const taskService = require("./taskService");
const notificationService = require("./notificationService");

// No hay chat familiar general (spec seccion 11): todo mensaje pertenece a
// una tarea. La autorizacion para leer/enviar reutiliza exactamente la
// misma regla de visibilidad que ver el detalle de la tarea (LEADER, el
// assignee directo, o un assignee de alguna subtarea).

async function listMessages(user, familyMembership, taskId) {
  const task = await taskService.getTaskOrThrow(familyMembership.familyId, taskId);
  await taskService.assertCanView(task, user, familyMembership);

  return db.select().from(taskMessages).where(eq(taskMessages.taskId, task.id)).orderBy(taskMessages.createdAt);
}

async function sendMessage(user, familyMembership, taskId, content) {
  const task = await taskService.getTaskOrThrow(familyMembership.familyId, taskId);
  await taskService.assertCanView(task, user, familyMembership);

  const [message] = await db
    .insert(taskMessages)
    .values({ taskId: task.id, senderId: user.id, content })
    .returning();

  const watchers = await taskService.getTaskWatchers(task);
  await notificationService.createMany(
    watchers,
    "TASK_MESSAGE",
    task.id,
    `Nuevo mensaje de ${user.name} en "${task.title}"`,
    user.id
  );

  return message;
}

module.exports = { listMessages, sendMessage };

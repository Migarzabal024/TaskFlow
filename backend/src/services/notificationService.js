const { eq, and, isNull } = require("drizzle-orm");
const { db } = require("../db/client");
const { notifications } = require("../db/schema");
const AppError = require("../utils/AppError");

// Crea una notificacion para un usuario.
async function create(userId, type, taskId, message) {
  const [notification] = await db
    .insert(notifications)
    .values({ userId, type, taskId, message })
    .returning();
  return notification;
}

// Crea la misma notificacion para varios usuarios a la vez, excluyendo
// opcionalmente al actor que disparo el evento (no tiene sentido
// notificarse a uno mismo) y sin duplicar ids.
async function createMany(userIds, type, taskId, message, excludeUserId) {
  const uniqueIds = [...new Set(userIds)].filter((id) => id !== excludeUserId);
  if (uniqueIds.length === 0) return [];

  return db
    .insert(notifications)
    .values(uniqueIds.map((userId) => ({ userId, type, taskId, message })))
    .returning();
}

async function listForUser(userId) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(notifications.createdAt);
}

async function markRead(userId, notificationId) {
  const [notification] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, Number(notificationId)), eq(notifications.userId, userId)));

  if (!notification) {
    throw new AppError("Notificacion no encontrada", 404);
  }

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, notification.id))
    .returning();

  return updated;
}

async function markAllRead(userId) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

module.exports = { create, createMany, listForUser, markRead, markAllRead };

const notificationService = require("../services/notificationService");
const { sendSuccess } = require("../utils/apiResponse");

async function listNotifications(req, res) {
  const notifications = await notificationService.listForUser(req.user.id);
  return sendSuccess(res, { data: { notifications } });
}

async function markRead(req, res) {
  const notification = await notificationService.markRead(req.user.id, req.params.id);
  return sendSuccess(res, { data: { notification } });
}

async function markAllRead(req, res) {
  await notificationService.markAllRead(req.user.id);
  return sendSuccess(res, { data: { message: "Todas las notificaciones marcadas como leidas" } });
}

module.exports = { listNotifications, markRead, markAllRead };

import apiClient from "./apiClient";

export async function listNotifications() {
  const { data } = await apiClient.get("/notifications");
  return data.data.notifications;
}

export async function markRead(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data.data.notification;
}

export async function markAllRead() {
  await apiClient.patch("/notifications/read-all");
}

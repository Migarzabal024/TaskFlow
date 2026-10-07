import apiClient from "./apiClient";

export async function listTasks(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null));
  const { data } = await apiClient.get("/tasks", { params });
  return data.data.tasks;
}

export async function getTask(id) {
  const { data } = await apiClient.get(`/tasks/${id}`);
  return data.data.task;
}

export async function createTask(payload) {
  const { data } = await apiClient.post("/tasks", payload);
  return data.data.task;
}

export async function updateTask(id, payload) {
  const { data } = await apiClient.put(`/tasks/${id}`, payload);
  return data.data.task;
}

export async function assignTask(id, assignedToId) {
  const { data } = await apiClient.patch(`/tasks/${id}/assign`, { assignedToId });
  return data.data.task;
}

export async function updateTaskStatus(id, status) {
  const { data } = await apiClient.patch(`/tasks/${id}/status`, { status });
  return data.data.task;
}

export async function cannotCompleteTask(id, reason) {
  const { data } = await apiClient.patch(`/tasks/${id}/cannot-complete`, { reason });
  return data.data.task;
}

export async function cancelTask(id) {
  const { data } = await apiClient.delete(`/tasks/${id}`);
  return data.data.task;
}

export async function assignSubtask(taskId, subtaskId, assignedToId) {
  const { data } = await apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}/assign`, { assignedToId });
  return data.data.subtask;
}

export async function updateSubtaskStatus(taskId, subtaskId, status) {
  const { data } = await apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}/status`, { status });
  return data.data.subtask;
}

export async function listMessages(taskId) {
  const { data } = await apiClient.get(`/tasks/${taskId}/messages`);
  return data.data.messages;
}

export async function sendMessage(taskId, content) {
  const { data } = await apiClient.post(`/tasks/${taskId}/messages`, { content });
  return data.data.message;
}

export async function getHistory(taskId) {
  const { data } = await apiClient.get(`/tasks/${taskId}/history`);
  return data.data.history;
}

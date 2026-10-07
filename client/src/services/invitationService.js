import apiClient from "./apiClient";

export async function createInvitation(email) {
  const { data } = await apiClient.post("/invitations", { email });
  return data.data.invitation;
}

// Mismo endpoint, comportamiento dual: con familia devuelve las enviadas,
// sin familia devuelve las recibidas (ver backend/docs/decisiones.md #5).
export async function listInvitations() {
  const { data } = await apiClient.get("/invitations");
  return data.data.invitations;
}

export async function acceptInvitation(token) {
  const { data } = await apiClient.post(`/invitations/${token}/accept`);
  return data.data;
}

export async function rejectInvitation(token) {
  const { data } = await apiClient.post(`/invitations/${token}/reject`);
  return data.data.invitation;
}

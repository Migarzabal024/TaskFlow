import apiClient from "./apiClient";

export async function createFamily(name) {
  const { data } = await apiClient.post("/families", { name });
  return data.data.family;
}

// Devuelve null (en vez de rechazar) cuando el usuario todavia no
// pertenece a ninguna familia, para que el llamador no tenga que andar
// distinguiendo "error real" de "todavia no tiene familia" en cada uso.
export async function getMyFamily() {
  try {
    const { data } = await apiClient.get("/families/me");
    return data.data.family;
  } catch (error) {
    if (error.status === 403) return null;
    throw error;
  }
}

export async function getMembers() {
  const { data } = await apiClient.get("/families/members");
  return data.data.members;
}

export async function removeMember(memberId) {
  const { data } = await apiClient.delete(`/families/members/${memberId}`);
  return data.data.member;
}

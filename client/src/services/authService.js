import apiClient from "./apiClient";

export async function register({ name, email, password }) {
  const { data } = await apiClient.post("/auth/register", { name, email, password });
  return data.data;
}

export async function login({ email, password }) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data.data;
}

export async function getMe() {
  const { data } = await apiClient.get("/auth/me");
  return data.data.user;
}

export async function logout() {
  await apiClient.post("/auth/logout");
}

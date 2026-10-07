import axios from "axios";

const TOKEN_KEY = "familytask_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// La API siempre responde errores como {success:false, message} (incluso
// errores de validacion de Zod, ya unificados a un solo string por el
// errorHandler del backend). Normalizamos a un Error simple para la UI.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Ocurrió un error inesperado. Intentá de nuevo.";
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status }));
  }
);

export default apiClient;

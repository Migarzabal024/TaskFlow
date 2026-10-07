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

export const SESSION_EXPIRED_EVENT = "familytask:session-expired";

// La API siempre responde errores como {success:false, message} (incluso
// errores de validacion de Zod, ya unificados a un solo string por el
// errorHandler del backend). Normalizamos a un Error simple para la UI.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sin respuesta del servidor: caida de red u offline (spec seccion 19).
    if (!error.response) {
      return Promise.reject(
        Object.assign(new Error("No se pudo conectar con el servidor. Revisá tu conexión."), {
          status: null,
          network: true,
        })
      );
    }

    // Un 401 en un pedido que SI llevaba token es una sesion vencida/invalida
    // (no un login con credenciales incorrectas, que tambien es 401 pero sin
    // Authorization en el request): forzamos logout global en vez de dejar
    // que cada pantalla lo maneje por separado.
    if (error.response.status === 401 && error.config?.headers?.Authorization) {
      setToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    const message = error.response.data?.message || "Ocurrió un error inesperado. Intentá de nuevo.";
    return Promise.reject(Object.assign(new Error(message), { status: error.response.status }));
  }
);

export default apiClient;

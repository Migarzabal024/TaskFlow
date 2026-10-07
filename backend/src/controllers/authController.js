const authService = require("../services/authService");
const { registerSchema, loginSchema } = require("../validators/authValidators");
const { sendSuccess } = require("../utils/apiResponse");

async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const { user, token } = await authService.register(data);
  return sendSuccess(res, { status: 201, data: { user, token } });
}

async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const { user, token } = await authService.login(data);
  return sendSuccess(res, { data: { user, token } });
}

async function logout(req, res) {
  // Autenticacion stateless via JWT: no hay sesion server-side que invalidar
  // en el MVP. El cliente descarta el token. Endpoint provisto para
  // completar el contrato de la API (spec seccion 8).
  return sendSuccess(res, { data: { message: "Sesion cerrada" } });
}

async function me(req, res) {
  const user = await authService.getMe(req.user.id);
  return sendSuccess(res, { data: { user } });
}

module.exports = { register, login, logout, me };

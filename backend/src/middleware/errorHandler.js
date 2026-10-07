const { ZodError } = require("zod");
const { sendError } = require("../utils/apiResponse");
const { nodeEnv } = require("../config/env");

// Middleware de manejo de errores centralizado (spec seccion 7: respuestas
// de error seguras, nunca filtrar detalles internos). Debe registrarse
// como ultimo middleware en app.js.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(". ");
    return sendError(res, { status: 400, message });
  }

  if (err && err.isOperational) {
    return sendError(res, { status: err.status, message: err.message });
  }

  console.error(err);

  return sendError(res, {
    status: 500,
    message:
      nodeEnv === "development" && err && err.message
        ? err.message
        : "Error interno del servidor",
  });
}

function notFoundHandler(req, res) {
  return sendError(res, { status: 404, message: "Recurso no encontrado" });
}

module.exports = { errorHandler, notFoundHandler };

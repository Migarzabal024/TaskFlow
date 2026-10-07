// Helpers para el formato de respuesta de la API (spec seccion 8).

function sendSuccess(res, { status = 200, data = {} } = {}) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, { status = 400, message = "Error inesperado" } = {}) {
  return res.status(status).json({ success: false, message });
}

module.exports = { sendSuccess, sendError };

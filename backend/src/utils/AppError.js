// Error operacional con status HTTP asociado. Los controladores/servicios
// lanzan esto para errores esperados (validacion, permisos, not found, etc.)
// y el errorHandler centralizado lo traduce a una respuesta segura.
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.isOperational = true;
  }
}

module.exports = AppError;

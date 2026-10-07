// Envuelve controladores async para no repetir try/catch: cualquier error
// (incluido uno lanzado dentro de un service) llega al errorHandler central.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;

// Punto de entrada para Vercel: expone la misma app de Express como una
// función serverless. No hay app.listen() acá (eso es cosa de src/server.js,
// que solo se usa en desarrollo/local); Vercel llama a este módulo
// directamente con (req, res) en cada pedido.
module.exports = require("../src/app");

// En test cargamos .env.test (base de datos y secretos separados de
// desarrollo) en vez de .env; en cualquier otro entorno, el .env de siempre.
require("dotenv").config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development",
  // Origen(es) permitidos para CORS (frontend Vite). Lista separada por
  // comas si hay mas de uno; por defecto el puerto por defecto de Vite.
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
};

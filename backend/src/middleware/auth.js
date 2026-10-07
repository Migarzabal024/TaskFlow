const { verifyToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const { db } = require("../db/client");
const { users } = require("../db/schema");
const { eq } = require("drizzle-orm");

// Middleware de autenticacion centralizado (spec seccion 7). Verifica el
// JWT del header Authorization, confirma que el usuario todavia existe y
// adjunta req.user. Nunca confiar en checks de permisos hechos solo en
// el frontend: este middleware es la autoridad.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError("No autenticado", 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError("Token invalido o expirado", 401);
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, payload.sub));

    if (!user) {
      throw new AppError("No autenticado", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };

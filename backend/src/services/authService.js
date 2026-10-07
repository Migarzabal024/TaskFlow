const bcrypt = require("bcryptjs");
const { eq } = require("drizzle-orm");
const { db } = require("../db/client");
const { users } = require("../db/schema");
const { signToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");

const SALT_ROUNDS = 10;

function toPublicUser(user) {
  // Nunca devolver passwordHash en una respuesta (spec seccion 7).
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

async function register({ name, email, password }) {
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    throw new AppError("Ya existe una cuenta con ese email", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning();

  const token = signToken({ sub: user.id });

  return { user: toPublicUser(user), token };
}

async function login({ email, password }) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new AppError("Credenciales invalidas", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Credenciales invalidas", 401);
  }

  const token = signToken({ sub: user.id });

  return { user: toPublicUser(user), token };
}

async function getMe(userId) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }
  return toPublicUser(user);
}

module.exports = { register, login, getMe };

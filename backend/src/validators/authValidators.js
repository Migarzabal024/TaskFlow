const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

module.exports = { registerSchema, loginSchema };

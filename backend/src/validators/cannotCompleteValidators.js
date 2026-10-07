const { z } = require("zod");

// Razon obligatoria (spec seccion 10): nunca se guarda vacia.
const cannotCompleteSchema = z.object({
  reason: z.string().trim().min(3, "La razon es obligatoria (minimo 3 caracteres)").max(1000),
});

module.exports = { cannotCompleteSchema };

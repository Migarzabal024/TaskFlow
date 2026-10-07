const { z } = require("zod");

// Previene mensajes vacios o solo espacios (spec seccion 11).
const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "El mensaje no puede estar vacio").max(2000),
});

module.exports = { sendMessageSchema };

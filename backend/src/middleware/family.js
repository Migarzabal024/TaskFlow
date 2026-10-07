const { eq } = require("drizzle-orm");
const { db } = require("../db/client");
const { familyMembers } = require("../db/schema");
const AppError = require("../utils/AppError");

// Carga la membresia de familia del usuario autenticado (spec: exactamente
// una familia por usuario en el MVP) y la adjunta a req.familyMembership.
// null si el usuario todavia no pertenece a ninguna familia. Debe ir
// despues de authenticate.
async function loadFamilyMembership(req, res, next) {
  try {
    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, req.user.id));

    req.familyMembership = membership || null;
    next();
  } catch (err) {
    next(err);
  }
}

// Exige que el usuario pertenezca a una familia. Nunca confiar solo en
// checks de permisos del frontend (spec seccion 3).
function requireFamilyMembership(req, res, next) {
  if (!req.familyMembership) {
    return next(new AppError("No pertenecés a ninguna familia", 403));
  }
  next();
}

// Exige rol LEADER dentro de la familia. Debe usarse despues de
// requireFamilyMembership.
function requireLeader(req, res, next) {
  if (!req.familyMembership || req.familyMembership.role !== "LEADER") {
    return next(new AppError("Accion reservada al lider de la familia", 403));
  }
  next();
}

module.exports = { loadFamilyMembership, requireFamilyMembership, requireLeader };

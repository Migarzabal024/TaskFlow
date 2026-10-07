const { eq, and } = require("drizzle-orm");
const { db } = require("../db/client");
const { families, familyMembers, users } = require("../db/schema");
const AppError = require("../utils/AppError");

async function createFamily(userId, name) {
  const [existingMembership] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId));

  if (existingMembership) {
    throw new AppError("Ya pertenecés a una familia", 409);
  }

  const [family] = await db.insert(families).values({ name }).returning();

  await db.insert(familyMembers).values({
    familyId: family.id,
    userId,
    role: "LEADER",
  });

  return family;
}

async function getMyFamily(userId, familyMembership) {
  if (!familyMembership) {
    throw new AppError("No pertenecés a ninguna familia", 404);
  }

  const [family] = await db.select().from(families).where(eq(families.id, familyMembership.familyId));

  if (!family) {
    throw new AppError("Familia no encontrada", 404);
  }

  return { ...family, role: familyMembership.role };
}

async function getMembers(familyId) {
  const rows = await db
    .select({
      id: familyMembers.id,
      role: familyMembers.role,
      joinedAt: familyMembers.joinedAt,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(familyMembers)
    .innerJoin(users, eq(familyMembers.userId, users.id))
    .where(eq(familyMembers.familyId, familyId));

  return rows;
}

async function removeMember(familyId, memberId, actingUserId) {
  const [member] = await db
    .select()
    .from(familyMembers)
    .where(and(eq(familyMembers.id, Number(memberId)), eq(familyMembers.familyId, familyId)));

  if (!member) {
    throw new AppError("Miembro no encontrado", 404);
  }

  if (member.role === "LEADER") {
    throw new AppError("No se puede eliminar al lider de la familia", 400);
  }

  if (member.userId === actingUserId) {
    throw new AppError("No podés eliminarte a vos mismo", 400);
  }

  await db.delete(familyMembers).where(eq(familyMembers.id, member.id));

  return member;
}

module.exports = { createFamily, getMyFamily, getMembers, removeMember };

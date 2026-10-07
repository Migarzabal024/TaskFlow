const { eq, and } = require("drizzle-orm");
const { db } = require("../db/client");
const { invitations, familyMembers, users } = require("../db/schema");
const AppError = require("../utils/AppError");
const { generateToken } = require("../utils/token");

const INVITATION_TTL_DAYS = 7;

async function createInvitation(familyId, invitedById, email) {
  const [invitedUser] = await db.select().from(users).where(eq(users.email, email));

  if (invitedUser) {
    const [existingMembership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, invitedUser.id));

    if (existingMembership) {
      throw new AppError("Ese usuario ya pertenece a una familia", 409);
    }
  }

  const [pending] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.familyId, familyId),
        eq(invitations.email, email),
        eq(invitations.status, "PENDING")
      )
    );

  if (pending && pending.expiresAt > new Date()) {
    throw new AppError("Ya existe una invitacion pendiente para ese email", 409);
  }

  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(invitations)
    .values({
      familyId,
      email,
      token: generateToken(),
      status: "PENDING",
      expiresAt,
      invitedById,
    })
    .returning();

  return invitation;
}

async function listInvitations(user, familyMembership) {
  if (familyMembership) {
    return db.select().from(invitations).where(eq(invitations.familyId, familyMembership.familyId));
  }

  const rows = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.email, user.email), eq(invitations.status, "PENDING")));

  return rows.filter((inv) => inv.expiresAt > new Date());
}

async function findValidInvitationByToken(token, user) {
  const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));

  if (!invitation) {
    throw new AppError("Invitacion no encontrada", 404);
  }

  if (invitation.status !== "PENDING") {
    throw new AppError("Esta invitacion ya fue respondida", 400);
  }

  if (invitation.expiresAt <= new Date()) {
    await db.update(invitations).set({ status: "EXPIRED" }).where(eq(invitations.id, invitation.id));
    throw new AppError("Esta invitacion expiro", 410);
  }

  if (invitation.email !== user.email) {
    throw new AppError("Esta invitacion no corresponde a tu cuenta", 403);
  }

  return invitation;
}

async function acceptInvitation(token, user) {
  const invitation = await findValidInvitationByToken(token, user);

  const [existingMembership] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.userId, user.id));

  if (existingMembership) {
    throw new AppError("Ya pertenecés a una familia", 409);
  }

  await db.transaction(async (tx) => {
    await tx.insert(familyMembers).values({
      familyId: invitation.familyId,
      userId: user.id,
      role: "MEMBER",
    });

    await tx.update(invitations).set({ status: "ACCEPTED" }).where(eq(invitations.id, invitation.id));
  });

  return { familyId: invitation.familyId };
}

async function rejectInvitation(token, user) {
  const invitation = await findValidInvitationByToken(token, user);

  await db.update(invitations).set({ status: "REJECTED" }).where(eq(invitations.id, invitation.id));

  return { ...invitation, status: "REJECTED" };
}

module.exports = { createInvitation, listInvitations, acceptInvitation, rejectInvitation };

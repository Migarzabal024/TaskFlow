const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/db/client");

// Vacia todas las tablas entre tests para que cada test parta de una base
// limpia, sin depender del orden de ejecucion. RESTART IDENTITY para que
// los ids autoincrementales tambien arranquen de 1 en cada test.
async function resetDb() {
  await pool.query(`
    TRUNCATE TABLE
      notifications,
      task_history,
      task_messages,
      tasks,
      invitations,
      family_members,
      families,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function closeDb() {
  await pool.end();
}

let counter = 0;
function uniqueEmail(prefix) {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@familytask.test`;
}

async function registerUser(overrides = {}) {
  const payload = {
    name: overrides.name || "Usuario de prueba",
    email: overrides.email || uniqueEmail("user"),
    password: overrides.password || "Password123!",
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  return { ...res.body.data, email: payload.email, password: payload.password };
}

async function createFamilyWithLeader(familyName = "Familia de prueba") {
  const leader = await registerUser({ name: "Lider" });
  const res = await request(app)
    .post("/api/families")
    .set("Authorization", `Bearer ${leader.token}`)
    .send({ name: familyName });
  return { leader, family: res.body.data.family };
}

// Crea una familia con 1 lider y N miembros ya invitados y aceptados.
async function createFamilyWithMembers(memberCount = 2) {
  const { leader, family } = await createFamilyWithLeader();
  const members = [];
  for (let i = 0; i < memberCount; i += 1) {
    const member = await registerUser({ name: `Miembro ${i + 1}` });
    const invRes = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ email: member.email });
    const token = invRes.body.data.invitation.token;
    await request(app).post(`/api/invitations/${token}/accept`).set("Authorization", `Bearer ${member.token}`);
    members.push(member);
  }
  return { leader, family, members };
}

module.exports = {
  app,
  request,
  resetDb,
  closeDb,
  uniqueEmail,
  registerUser,
  createFamilyWithLeader,
  createFamilyWithMembers,
};

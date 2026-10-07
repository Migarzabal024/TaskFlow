const {
  app,
  request,
  resetDb,
  closeDb,
  registerUser,
  createFamilyWithLeader,
  createFamilyWithMembers,
} = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

describe("Familias y membresía", () => {
  test("un usuario puede crear una familia y queda como LEADER", async () => {
    const user = await registerUser();
    const res = await request(app)
      .post("/api/families")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ name: "Mi familia" });

    expect(res.status).toBe(201);

    const me = await request(app).get("/api/families/me").set("Authorization", `Bearer ${user.token}`);
    expect(me.body.data.family.role).toBe("LEADER");
  });

  test("un usuario no puede crear una segunda familia", async () => {
    const { leader } = await createFamilyWithLeader();
    const res = await request(app)
      .post("/api/families")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ name: "Otra familia" });

    expect(res.status).toBe(409);
  });

  test("sin familia, /api/families/me responde 403 (membresía requerida)", async () => {
    const user = await registerUser();
    const res = await request(app).get("/api/families/me").set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(403);
  });

  test("el líder puede invitar y el invitado puede aceptar, quedando MEMBER", async () => {
    const { leader, family } = await createFamilyWithLeader();
    const invitee = await registerUser();

    const invRes = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ email: invitee.email });
    expect(invRes.status).toBe(201);

    const token = invRes.body.data.invitation.token;
    const acceptRes = await request(app)
      .post(`/api/invitations/${token}/accept`)
      .set("Authorization", `Bearer ${invitee.token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.familyId).toBe(family.id);

    const members = await request(app)
      .get("/api/families/members")
      .set("Authorization", `Bearer ${leader.token}`);
    expect(members.body.data.members).toHaveLength(2);
    const joined = members.body.data.members.find((m) => m.email === invitee.email);
    expect(joined.role).toBe("MEMBER");
  });

  test("el invitado puede rechazar la invitación en vez de aceptarla", async () => {
    const { leader } = await createFamilyWithLeader();
    const invitee = await registerUser();

    const invRes = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${leader.token}`)
      .send({ email: invitee.email });
    const token = invRes.body.data.invitation.token;

    const rejectRes = await request(app)
      .post(`/api/invitations/${token}/reject`)
      .set("Authorization", `Bearer ${invitee.token}`);
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.invitation.status).toBe("REJECTED");

    // Sigue sin pertenecer a ninguna familia.
    const me = await request(app).get("/api/families/me").set("Authorization", `Bearer ${invitee.token}`);
    expect(me.status).toBe(403);
  });

  test("solo el LEADER puede invitar (un MEMBER recibe 403)", async () => {
    const { members } = await createFamilyWithMembers(1);
    const res = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${members[0].token}`)
      .send({ email: "otro@familytask.test" });

    expect(res.status).toBe(403);
  });

  test("no se puede eliminar al LEADER de la familia", async () => {
    const { leader, family } = await createFamilyWithLeader();
    const membership = await request(app)
      .get("/api/families/members")
      .set("Authorization", `Bearer ${leader.token}`);
    const leaderMemberRow = membership.body.data.members.find((m) => m.userId === leader.user.id);

    const res = await request(app)
      .delete(`/api/families/members/${leaderMemberRow.id}`)
      .set("Authorization", `Bearer ${leader.token}`);

    expect(res.status).toBe(400);
    expect(family).toBeTruthy(); // sanity: la familia existe y no se tocó
  });

  test("el LEADER puede eliminar a un MEMBER", async () => {
    const { leader, members } = await createFamilyWithMembers(1);
    const membership = await request(app)
      .get("/api/families/members")
      .set("Authorization", `Bearer ${leader.token}`);
    const memberRow = membership.body.data.members.find((m) => m.userId === members[0].user.id);

    const res = await request(app)
      .delete(`/api/families/members/${memberRow.id}`)
      .set("Authorization", `Bearer ${leader.token}`);

    expect(res.status).toBe(200);
  });
});

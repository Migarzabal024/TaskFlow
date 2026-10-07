const { app, request, resetDb, closeDb, uniqueEmail, registerUser } = require("./helpers");

beforeEach(resetDb);
afterAll(closeDb);

describe("Autenticación", () => {
  test("un usuario puede registrarse y recibe un token", async () => {
    const email = uniqueEmail("nuevo");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Nuevo Usuario", email, password: "Password123!" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(typeof res.body.data.token).toBe("string");
  });

  test("no se puede registrar dos veces el mismo email", async () => {
    const email = uniqueEmail("duplicado");
    await request(app).post("/api/auth/register").send({ name: "Persona A", email, password: "Password123!" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Persona B", email, password: "Password123!" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("un usuario puede loguearse con credenciales correctas", async () => {
    const user = await registerUser({ password: "Password123!" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "Password123!" });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
  });

  test("login con contraseña incorrecta es rechazado", async () => {
    const user = await registerUser({ password: "Password123!" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "OtraContraseña123!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("una ruta protegida rechaza un pedido sin token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("una ruta protegida rechaza un token invalido", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer esto-no-es-un-jwt");
    expect(res.status).toBe(401);
  });

  test("una ruta protegida acepta un token valido y devuelve el usuario", async () => {
    const user = await registerUser();
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.user.id);
  });
});

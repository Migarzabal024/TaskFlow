const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { databaseUrl, nodeEnv } = require("../config/env");
const schema = require("./schema");

// En produccion (p. ej. Render) la base gestionada exige SSL y usa un
// certificado propio; rejectUnauthorized:false evita que el handshake
// falle por eso. En desarrollo/test local no hace falta.
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: nodeEnv === "production" ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool, { schema });

module.exports = { db, pool };

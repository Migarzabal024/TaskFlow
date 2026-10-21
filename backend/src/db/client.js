const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { databaseUrl } = require("../config/env");
const schema = require("./schema");

// Las bases gestionadas remotas (Supabase, Neon, Render, etc.) exigen SSL y
// usan un certificado propio; rejectUnauthorized:false evita que el
// handshake falle por eso. Una base local (desarrollo/test) no lo necesita,
// así que lo activamos en base al host, no a NODE_ENV: así funciona igual
// corriendo local contra una base remota o en el serverless de producción.
const isLocalDb = /localhost|127\.0\.0\.1/.test(databaseUrl || "");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
});

const db = drizzle(pool, { schema });

module.exports = { db, pool };

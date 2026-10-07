const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { databaseUrl } = require("../config/env");
const schema = require("./schema");

const pool = new Pool({ connectionString: databaseUrl });

const db = drizzle(pool, { schema });

module.exports = { db, pool };

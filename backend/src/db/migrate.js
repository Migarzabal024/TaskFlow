const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { db, pool } = require("./client");

async function main() {
  console.log("Corriendo migraciones...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migraciones aplicadas correctamente.");
  await pool.end();
}

main().catch((err) => {
  console.error("Error al migrar:", err);
  process.exit(1);
});

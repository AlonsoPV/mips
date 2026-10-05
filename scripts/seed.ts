import "../server/env";
import { initDb, closeDb } from "../server/db";
import { seedDatabase } from "../server/seed";

const force = process.argv.includes("--force");

await initDb();
const result = await seedDatabase(force);
console.log(result.seeded ? "Seed completado." : "La base ya tenía datos. Usa --force para regenerar.");
await closeDb();
process.exit(0);

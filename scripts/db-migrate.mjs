/**
 * `npm run db:migrate` — the step Vercel runs before `next build` and CI runs
 * before the E2E job (docs/CI_CD.md § Deploys). Additive-only in v1
 * (docs/DATA_MODEL.md § Migrations).
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./db/migrations" });
await pool.end();

console.log("db:migrate — up to date.");

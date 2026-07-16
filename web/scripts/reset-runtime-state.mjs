import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
await client.query("DELETE FROM public.app_runtime_state WHERE id = 'main'");
console.log("Cleared corrupted app_runtime_state — Fly will re-seed on next request.");
await client.end();

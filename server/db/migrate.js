// Brings the connected database up to the schema this version of the code
// expects, automatically, every time the server starts.
//
// Why: every release adds columns/tables (e.g. vendors.is_active,
// event_plans). If the code is upgraded but db/schema.sql was never re-run
// against an existing database, queries that mention the new columns fail
// and the app looks like it "can't fetch data from the database". schema.sql
// is written to be idempotent (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT
// EXISTS; CI applies it twice), so running it on every start is safe, never
// drops or rewrites data, and is a no-op on an up-to-date database.
//
// A Postgres advisory lock stops two server instances starting at the same
// moment from running it concurrently. Set SKIP_AUTO_MIGRATE=1 to disable
// (e.g. if the DB user may not alter tables and you manage the schema
// yourself).

const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");
const LOCK_KEY = 727401; // arbitrary app-wide constant

async function applySchema() {

    if (process.env.SKIP_AUTO_MIGRATE === "1") {
        console.log("Auto-migrate skipped (SKIP_AUTO_MIGRATE=1)");
        return { skipped: true };
    }

    const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
    const client = await pool.connect();

    try {

        await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

        try {
            await client.query(sql);
        } finally {
            await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
        }

        console.log("Database schema is up to date");
        return { ok: true };

    } catch (error) {

        // Don't crash the server: log loudly with the fix, and let it start
        // so a partially-working database still serves what it can.
        console.error(
            "\n!!! DATABASE SCHEMA UPDATE FAILED !!!\n" +
            `    ${error.message}\n` +
            "    Run it manually:  psql -U <user> -d <database> -f server/db/schema.sql\n" +
            "    (the database user needs permission to ALTER/CREATE tables)\n"
        );
        return { ok: false, error };

    } finally {

        client.release();
    }
}

module.exports = { applySchema };

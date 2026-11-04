const { Pool } = require("pg");
require("dotenv").config();

// Prefer DATABASE_URL from .env if present.
// Otherwise falls back to discrete environment variables or local dev defaults.
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        user: process.env.PGUSER || process.env.POSTGRES_USER || "postgres",
        host: process.env.PGHOST || process.env.POSTGRES_HOST || "localhost",
        database: process.env.PGDATABASE || process.env.POSTGRES_DB || "eventora",
        password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "postgres123",
        port: Number(process.env.PGPORT || 5432)
    });

pool.on("error", (err) => {
    console.error("Unexpected error on idle database client:", err);
});

module.exports = pool;

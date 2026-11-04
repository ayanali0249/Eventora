const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

let pool;

if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
    const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
    const user = process.env.PGUSER || process.env.POSTGRES_USER || "postgres";
    const host = process.env.PGHOST || process.env.POSTGRES_HOST || "localhost";
    const database = process.env.PGDATABASE || process.env.POSTGRES_DB || "eventora";
    const port = Number(process.env.PGPORT || 5432);

    if (isProduction && !password) {
        throw new Error(
            "FATAL: Database credentials missing in production environment. " +
            "Please configure DATABASE_URL or POSTGRES_PASSWORD/PGPASSWORD in your environment variables."
        );
    }

    if (!isProduction && !password) {
        console.warn(
            "[DEV NOTICE] No database password provided via DATABASE_URL or PGPASSWORD. " +
            "Using development-only fallback credentials. Do not use in production."
        );
    }

    pool = new Pool({
        user,
        host,
        database,
        password: password || (isProduction ? undefined : "postgres123"),
        port
    });
}

// Log error message only to avoid printing full connection strings or credentials
pool.on("error", (err) => {
    console.error("Unexpected error on idle database client:", err.message);
});

module.exports = pool;

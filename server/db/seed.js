// Development / Testing seed runner with production safety guard
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function seedDatabase() {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
        console.error(
            "\n[SECURITY BLOCKED] Seeding demo data in production is disabled.\n" +
            "Demo accounts contain known passwords ('password123') and must never exist in production.\n" +
            "If you explicitly require demo accounts in a staging environment, set ALLOW_DEMO_SEED=true.\n"
        );
        process.exit(1);
    }

    const seedFile = path.join(__dirname, "seed.sql");
    const sql = fs.readFileSync(seedFile, "utf8");
    const client = await pool.connect();

    try {
        console.log("Applying development seed data...");
        await client.query(sql);
        console.log("Seed data loaded successfully (15 vendors, 4 customers, demo admin).");
    } catch (err) {
        console.error("Seed execution failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };

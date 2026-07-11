const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "eventora",
    password: "postgres123",
    port: 5432
});

module.exports = pool;
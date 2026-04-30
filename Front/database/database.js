const { Pool } = require("pg");

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
});

// Verifica connessione
pool.query("SELECT NOW()", (err, res) => {
	if (err) console.error("Errore Postgres:", err.message);
	else console.log("Database Postgres connesso!");
});

module.exports = pool;

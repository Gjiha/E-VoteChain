const { Pool } = require("pg");

const pool = new Pool({
	user: "postgres",
	host: "localhost",
	database: "evote",
	password: "qwert18",
	port: 5432,
});

// Verifica connessione
pool.query("SELECT NOW()", (err, res) => {
	if (err) console.error("Errore Postgres:", err.message);
	else console.log("Database Postgres connesso!");
});

module.exports = pool;

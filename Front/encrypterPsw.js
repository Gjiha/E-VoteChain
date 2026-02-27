const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
	user: "postgres",
	host: "localhost",
	database: "evote",
	password: "qwert18",
	port: 5432,
});

const saltRounds = 10;

async function migratePasswords() {
	try {
		console.log("Inizio migrazione password...");

		// 1. Recupera tutti gli utenti
		const res = await pool.query("SELECT id_wallet, psw FROM utenti");
		const utenti = res.rows;

		console.log(
			`Trovati ${utenti.length} utenti. Elaborazione in corso...`,
		);

		for (let utente of utenti) {
			const { id_wallet, psw } = utente;

			// Verifica se la password è già un hash bcrypt
			// Gli hash bcrypt iniziano tipicamente con $2b$ o $2a$
			if (psw.startsWith("$2b$") || psw.startsWith("$2a$")) {
				console.log(
					`Skipping utente ${id_wallet}: password già criptata.`,
				);
				continue;
			}

			// 2. Cripta la password
			const hashedPassword = await bcrypt.hash(psw, saltRounds);

			// 3. Aggiorna il record nel database
			await pool.query(
				"UPDATE utenti SET psw = $1 WHERE id_wallet = $2",
				[hashedPassword, id_wallet],
			);

			console.log(`Password aggiornata per utente: ${id_wallet}`);
		}

		console.log("✅ Migrazione completata con successo!");
	} catch (err) {
		console.error("❌ Errore durante la migrazione:", err);
	} finally {
		await pool.end(); // Chiude la connessione al DB
	}
}

migratePasswords();

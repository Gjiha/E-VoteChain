const fetchUserFromDb = async (req, res, next) => {
	try {
		const { id_wallet } = req.body;
		const pool = require("../database/database"); // Assicurati che il pool sia accessibile

		if (!id_wallet) {
			return res.status(400).json({ message: "id_wallet mancante" });
		}

		const query = `SELECT id_wallet, nome, cognome, email, classe, psw FROM utenti WHERE id_wallet = $1`;
		const result = await pool.query(query, [id_wallet]);

		if (result.rows.length === 0) {
			return res.status(404).json({ message: "Utente non trovato" });
		}

		// Attacchiamo l'utente alla richiesta per renderlo disponibile nel prossimo step
		req.dbUser = result.rows[0];
		next();
	} catch (err) {
		console.error("Errore middleware DB:", err);
		res.status(500).json({
			message: "Errore durante il recupero dell'utente",
		});
	}
};

module.exports = fetchUserFromDb;

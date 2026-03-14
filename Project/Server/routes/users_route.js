const express = require("express");
const router = express.Router();

// 1. Importiamo i middleware per la sicurezza
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");

// 2. Importiamo il pool di connessione al DB (assicurati che il percorso sia corretto)
const pool = require("../database/database");

// =========================================================
// ROTTA: Recupera tutti gli utenti da PostgreSQL (SOLO CEO)
// =========================================================
router.get("/all-users", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		// Facciamo una query diretta al database.
		// NOTA BENE: Omettiamo appositamente la colonna "psw" per sicurezza!
		const query = `
            SELECT id_wallet, nome, cognome, email, classe 
            FROM utenti 
            ORDER BY cognome ASC, nome ASC
        `;

		const result = await pool.query(query);

		// result.rows conterrà un array di oggetti con i dati esatti degli utenti
		const usersList = result.rows;

		return res.status(200).json({
			message: "ok",
			data: usersList,
		});
	} catch (err) {
		console.error("Errore recupero utenti dal DB SQL:", err);
		return res
			.status(500)
			.json({
				message:
					"Errore interno server durante la lettura del database",
			});
	}
});

module.exports = router;

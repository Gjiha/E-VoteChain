const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetchUserFromBlockchain = require("../middleware/fetch_block_db.js");
const { quickTokenCheck } = require("../middleware/auth.js");

const JWT_SECRET = process.env.JWT_SECRET;

// =========================================
// ROTTA DI LOGIN
// Ordine di esecuzione: 1. check Token -> 2. check Blockchain -> 3. check Password
// =========================================
router.post(
	"/loginCheck",
	quickTokenCheck,
	fetchUserFromBlockchain,
	async (req, res) => {
		console.log(
			"Richiesta di login manuale ricevuta per identificativo:",
			req.body.id_wallet || req.body.email,
		);

		try {
			// CASO 2: LOGIN NORMALE (Password)
			// Se il codice arriva qui, significa che quickTokenCheck ha chiamato next()
			const { psw } = req.body;
			const utente = req.dbUser; // L'utente trovato dal middleware sulla blockchain

			if (!psw) {
				return res.status(400).json({ message: "Password mancante" });
			}

			// Confronto della password
			const match = await bcrypt.compare(psw, utente.psw);

			if (match) {
				const payload = {
					id_wallet: utente.id_wallet,
					classe: utente.classe,
					email: utente.email,
				};

				const newToken = jwt.sign(payload, JWT_SECRET, {
					expiresIn: process.env.JWT_EXPIRES_IN || "1h",
				});

				// Rimuoviamo la password dall'oggetto utente per sicurezza
				delete utente.psw;

				return res.status(200).json({
					message: "Login effettuato",
					token: newToken,
					data: utente,
				});
			} else {
				return res.status(401).json({ message: "Password errata" });
			}
		} catch (err) {
			console.error("Errore interno:", err);
			return res
				.status(500)
				.json({ message: "Errore server durante il login" });
		}
	},
);

module.exports = router;

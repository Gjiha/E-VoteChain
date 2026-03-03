const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetchUserFromDb = require("../middleware/middleware.js");

// In produzione, sposta questa stringa in un file .env
const JWT_SECRET = "la_tua_chiave_segreta_super_sicura_2026";

router.post("/loginCheck", fetchUserFromDb, async (req, res) => {
	console.log("Richiesta login per wallet:", req.body.id_wallet);

	try {
		const { psw } = req.body;
		const utente = req.dbUser; // Recuperato dal tuo middleware

		if (!psw) {
			return res.status(400).json({ message: "Password mancante" });
		}

		// Verifica password con bcrypt
		const match = await bcrypt.compare(psw, utente.psw);

		if (match) {
			// --- 2. GENERAZIONE DEL TOKEN JWT ---
			// Creiamo il payload con i dati non sensibili
			const payload = {
				id_wallet: utente.id_wallet,
				classe: utente.classe,
				// puoi aggiungere altri campi utili al frontend o ai controlli futuri
			};

			// Firmiamo il token (scade tra 2 ore)
			const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

			// Rimuoviamo la password dall'oggetto utente per sicurezza
			delete utente.psw;

			// --- 3. INVIO RISPOSTA CON TOKEN ---
			res.status(200).json({
				message: "Login effettuato",
				token: token, // <--- Il frontend lo riceverà qui
				data: utente,
			});
		} else {
			res.status(401).json({ message: "Password errata" });
		}
	} catch (err) {
		console.error("Errore interno:", err);
		res.status(500).json({ message: "Errore server durante il login" });
	}
});

module.exports = router;

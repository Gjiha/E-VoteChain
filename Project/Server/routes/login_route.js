const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetchUserFromDb = require("../middleware/fetch_db.js");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/loginCheck", fetchUserFromDb, async (req, res) => {
	console.log("Richiesta ricevuta per wallet:", req.body.id_wallet);

	try {
		// Estraiamo la password dal body
		const { psw } = req.body;
		const utente = req.dbUser;

		// Estraiamo il token dall'header 'Authorization'
		// Il formato standard è "Bearer [token]"
		const authHeader = req.headers["authorization"];
		const tokenFromHeader = authHeader && authHeader.split(" ")[1];

		// =========================================
		// CASO 1: VERIFICA DEL TOKEN (Se presente nell'header)
		// =========================================
		if (tokenFromHeader) {
			try {
				// Verifichiamo il token estratto dall'header
				const decoded = jwt.verify(tokenFromHeader, JWT_SECRET);
				console.log(
					"Token verificato con successo per:",
					decoded.id_wallet,
				);

				return res
					.status(200)
					.json({ message: "Token valido, accesso consentito." });
			} catch (jwtError) {
				// Il token è scaduto o manomesso
				return res
					.status(401)
					.json({ message: "Token scaduto o non valido." });
			}
		}

		// =========================================
		// CASO 2: LOGIN NORMALE (Password)
		// =========================================
		if (!psw) {
			return res
				.status(400)
				.json({ message: "Password mancante o token non fornito" });
		}

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

			// Rimuoviamo la password dall'oggetto utente prima di inviarlo
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
});

module.exports = router;

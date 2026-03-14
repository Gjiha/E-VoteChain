const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetchUserFromDb = require("../middleware/fetch_db.js");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/loginCheck", fetchUserFromDb, async (req, res) => {
	console.log("Richiesta ricevuta per wallet:", req.body.id_wallet);

	try {
		const { psw, token } = req.body;
		const utente = req.dbUser;

		// =========================================
		// CASO 1: VERIFICA DEL TOKEN (Da index.html)
		// =========================================
		if (token) {
			try {
				// jwt.verify "crasha" se il token non è valido.
				jwt.verify(token, JWT_SECRET);
				console.log(jwt.verify(token, JWT_SECRET));

				// Se arriva qui, il token è perfettamente valido!
				// FIX: Aggiunto 'return' per fermare il codice qui.
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
		// CASO 2: LOGIN NORMALE (Da login.html)
		// =========================================
		if (!psw) {
			return res.status(400).json({ message: "Password mancante" });
		}

		const match = await bcrypt.compare(psw, utente.psw);

		if (match) {
			const payload = {
				id_wallet: utente.id_wallet,
				classe: utente.classe,
				email: utente.email,
			};

			const newToken = jwt.sign(payload, JWT_SECRET, {
				expiresIn: process.env.JWT_EXPIRES_IN,
			});

			delete utente.psw;

			// FIX: Aggiunto 'return' anche qui
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

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../database/database.js");
const fetchUserFromDb = require("../middleware/middleware.js");

router.post("/loginCheck", fetchUserFromDb, async (req, res) => {
	console.log("richiesta psw");
	try {
		const { psw } = req.body;
		const utente = req.dbUser;

		if (!psw) {
			return res.status(400).json({
				message: "Password mancante",
			});
		}

		// --- CONFRONTO SICURO CON BCRYPT ---
		// psw = password inviata dall'utente (testo in chiaro)
		// utente.psw = password salvata nel DB (hash criptato)
		const match = await bcrypt.compare(psw, utente.psw);

		// 3. Confronto password (Nota: in produzione dovresti usare bcrypt per confrontare hash!)
		if (match) {
			// Rimuoviamo la password dall'oggetto prima di mandarlo al client
			delete utente.psw;

			res.status(200).json({
				message: "Login effettuato",
				data: utente,
			});
		} else {
			// Password errata
			res.status(401).json({
				message: "Password errata",
			});
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Errore server durante il login",
		});
	}
});

module.exports = router;

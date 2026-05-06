const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetchUserFromBlockchain = require("../middleware/fetch_user_middle.js");
const { quickTokenCheck } = require("../middleware/auth_middle.js");

const Logger = require("../utils/logger_utils.js");
const JWT_SECRET = process.env.JWT_SECRET;

router.post(
	"/loginCheck",
	quickTokenCheck,
	fetchUserFromBlockchain,
	async (req, res) => {
		const identificativo = req.body.id_wallet || req.body.email;
		await Logger.signal(
			req,
			200,
			`Richiesta di login manuale ricevuta per identificativo: ${identificativo}`,
		);

		try {
			const { psw } = req.body;
			const utente = req.dbUser;

			if (!psw) {
				await Logger.alert(
					req,
					400,
					`Login fallito per identificativo: ${identificativo}. Password mancante.`,
				);
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
					expiresIn: process.env.JWT_EXPIRES_IN || "1h",
				});

				delete utente.psw;

				await Logger.signal(
					req,
					200,
					`Login effettuato con successo per wallet: ${utente.id_wallet} (ruolo: ${utente.classe}).`,
				);
				return res.status(200).json({
					message: "Login effettuato",
					token: newToken,
					data: utente,
				});
			} else {
				await Logger.alert(
					req,
					401,
					`Login fallito per identificativo: ${identificativo}. Password errata.`,
				);
				return res.status(401).json({ message: "Password errata" });
			}
		} catch (err) {
			await Logger.alert(
				req,
				500,
				`Errore interno durante il login: ${err.message}`,
			);
			return res
				.status(500)
				.json({ message: "Errore server durante il login" });
		}
	},
);

module.exports = router;

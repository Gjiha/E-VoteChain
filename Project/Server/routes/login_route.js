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
				return res.status(400).json({ message: "Dati errati" });
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

				res.cookie("jwt", newToken, {
					httpOnly: true, // Illegibile da document.cookie (sicurezza contro XSS)
					secure: false, // True solo in HTTPS (produzione)
					sameSite: "lax",
					maxAge: 2 * 60 * 60 * 1000, // Scadenza in millisecondi (es. 1 ora)
				});

				await Logger.signal(
					req,
					200,
					`Login effettuato con successo per wallet: ${utente.id_wallet} (ruolo: ${utente.classe}).`,
				);

				// 2. RIMUIVI IL TOKEN DAL BODY DELLA RISPOSTA
				return res.status(200).json({
					message: "Login effettuato",
					data: utente,
				});
			} else {
				await Logger.alert(
					req,
					401,
					`Login fallito per identificativo: ${identificativo}. Password errata.`,
				);
				return res.status(401).json({ message: "Dati errati" });
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

router.post("/logout", async (req, res) => {
	// Pulisce il cookie contenente il JWT
	res.clearCookie("jwt", {
		httpOnly: true,
		secure: false, // Come impostato nel login
		sameSite: "lax", // Come impostato nel login
	});
	Logger.signal(req, 200, "Logout effettuato volontariamente dall'utente.");

	return res.status(200).json({ message: "Logout completato con successo" });
});

module.exports = router;

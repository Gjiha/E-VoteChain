const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetchUserFromBlockchain = require("../middleware/fetch_user_middle.js");
const { quickTokenCheck } = require("../middleware/auth_middle.js");

const JWT_SECRET = process.env.JWT_SECRET;

// =========================================================
// FUNZIONE HELPER PER LA FORMATTAZIONE DEI LOG
// Formato: [timestamp][ip-sorgente][ip-destinazione][action/route][codice][comment]
// =========================================================
const formatLog = (req, statusCode, comment) => {
	const timestamp = new Date().toISOString();
	const ipSorgente = req.ip || req.socket?.remoteAddress || "Unknown";
	const ipDestinazione = req.socket?.localAddress || "Unknown";
	const actionRoute = `${req.method} ${req.originalUrl || req.url}`;
	return `[${timestamp}][${ipSorgente}][${ipDestinazione}][${actionRoute}][${statusCode}][${comment}]`;
};

// =========================================
// ROTTA DI LOGIN
// Ordine di esecuzione: 1. check Token -> 2. check Blockchain -> 3. check Password
// =========================================
router.post(
	"/loginCheck",
	quickTokenCheck,
	fetchUserFromBlockchain,
	async (req, res) => {
		const identificativo = req.body.id_wallet || req.body.email;
		console.log(
			formatLog(
				req,
				200,
				`Richiesta di login manuale ricevuta per identificativo: ${identificativo}`,
			),
		);

		try {
			const { psw } = req.body;
			const utente = req.dbUser;

			if (!psw) {
				console.log(
					formatLog(
						req,
						400,
						`Login fallito per identificativo: ${identificativo}. Password mancante.`,
					),
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

				console.log(
					formatLog(
						req,
						200,
						`Login effettuato con successo per wallet: ${utente.id_wallet} (ruolo: ${utente.classe}).`,
					),
				);
				return res.status(200).json({
					message: "Login effettuato",
					token: newToken,
					data: utente,
				});
			} else {
				console.log(
					formatLog(
						req,
						401,
						`Login fallito per identificativo: ${identificativo}. Password errata.`,
					),
				);
				return res.status(401).json({ message: "Password errata" });
			}
		} catch (err) {
			console.error(
				formatLog(
					req,
					500,
					`Errore interno durante il login: ${err.message}`,
				),
			);
			return res
				.status(500)
				.json({ message: "Errore server durante il login" });
		}
	},
);

module.exports = router;

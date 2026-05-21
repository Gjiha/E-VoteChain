const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const { verifyToken, isCeoOrAdmin } = require("../middleware/auth_middle.js");
const { addKV, getKeysCopy, getKV } = require("../mapping/mapping.js");

const Logger = require("../utils/logger_utils.js");

router.get("/all-users", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const keysAnswer = await getKeysCopy("User");
		const rawKeys = keysAnswer?.keys || [];

		const validKeys = rawKeys
			.map((k) => (Array.isArray(k) ? k[0] : k))
			.filter((k) => k && k !== "table");

		const usersList = [];

		for (const key of validKeys) {
			try {
				const kvAnswer = await getKV("User", key);
				let userData = kvAnswer?.value || kvAnswer?.answer || kvAnswer;

				if (typeof userData === "string") {
					try {
						userData = JSON.parse(userData);
					} catch (e) {
						await Logger.alert(
							req,
							500,
							`Errore parsing JSON per l'utente [${key}]: ${e.message || e}`,
						);
						continue;
					}
				}

				if (userData && typeof userData === "object") {
					delete userData.psw;
					usersList.push(userData);
				}
			} catch (userErr) {
				await Logger.alert(
					req,
					500,
					`Errore nel recupero dell'utente con ID ${key}: ${userErr.message || userErr}`,
				);
				continue;
			}
		}

		usersList.sort((a, b) => {
			const cognomeA = (a.cognome || "").toLowerCase();
			const cognomeB = (b.cognome || "").toLowerCase();
			if (cognomeA < cognomeB) return -1;
			if (cognomeA > cognomeB) return 1;

			const nomeA = (a.nome || "").toLowerCase();
			const nomeB = (b.nome || "").toLowerCase();
			if (nomeA < nomeB) return -1;
			if (nomeA > nomeB) return 1;

			return 0;
		});

		await Logger.signal(
			req,
			200,
			`Recuperati con successo ${usersList.length} utenti`,
		);

		return res.status(200).json({
			message: "ok",
			data: usersList,
		});
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore recupero utenti dalla Blockchain: ${err.message || err}`,
		);
		return res.status(500).json({
			message:
				"Errore interno server durante la lettura dalla blockchain",
		});
	}
});

router.post("/addUser", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { nome, cognome, email, id_wallet, quota, classe, psw } =
			req.body;

		if (!nome || !cognome || !email || !id_wallet || !psw) {
			await Logger.alert(
				req,
				400,
				"Campi mancanti durante la registrazione utente",
			);
			return res
				.status(400)
				.json({ message: "Tutti i campi sono obbligatori." });
		}

		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(psw, saltRounds);

		const newUserObj = {
			id_wallet: String(id_wallet),
			nome: nome,
			cognome: cognome,
			email: email,
			quota: quota || 1,
			classe: classe || "membro",
			psw: hashedPassword,
		};

		const tableAnswer = await getKV("User", "table");
		let emailTable =
			tableAnswer?.value || tableAnswer?.answer || tableAnswer;

		if (typeof emailTable === "string") {
			try {
				emailTable = JSON.parse(emailTable);
			} catch (e) {
				emailTable = {};
			}
		} else if (!emailTable) {
			emailTable = {};
		}

		if (emailTable[email]) {
			await Logger.alert(
				req,
				400,
				`Tentativo di registrazione fallito: email ${email} già in uso`,
			);
			return res.status(400).json({
				message: "Errore sull'inserimento dei dati.",
			});
		}

		emailTable[email] = String(id_wallet);

		await addKV("User", String(id_wallet), JSON.stringify(newUserObj));
		await addKV("User", "table", JSON.stringify(emailTable));

		await Logger.signal(
			req,
			200,
			`Utente [${id_wallet}] - ${email} aggiunto con successo alla blockchain`,
		);

		return res.status(200).json({
			message: "Utente aggiunto con successo alla blockchain",
		});
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore inserimento nuovo utente: ${err.message || err}`,
		);
		return res.status(500).json({
			message:
				"Errore interno server durante la registrazione sulla blockchain",
		});
	}
});

module.exports = router;

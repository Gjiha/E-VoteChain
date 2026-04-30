const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// 1. Importiamo i middleware per la sicurezza
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");

// 2. Importiamo le funzioni per comunicare con la Blockchain
const { addKV, getKeysCopy, getKV } = require("../mapping/mapping.js");

// =========================================================
// ROTTA: Recupera tutti gli utenti dalla Blockchain (SOLO CEO)
// =========================================================
router.get("/all-users", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		// 1. Recuperiamo tutte le chiavi associate alla classe "User"
		const keysAnswer = await getKeysCopy("User");
		const rawKeys = keysAnswer?.keys || [];

		// 2. Estraiamo le stringhe (ID wallet) ed escludiamo la chiave di servizio "table"
		const validKeys = rawKeys
			.map((k) => (Array.isArray(k) ? k[0] : k))
			.filter((k) => k && k !== "table");

		const usersList = [];

		// 3. Iteriamo su ogni chiave valida per scaricare il singolo utente
		for (const key of validKeys) {
			try {
				const kvAnswer = await getKV("User", key);
				let userData = kvAnswer?.value || kvAnswer?.answer || kvAnswer;

				if (typeof userData === "string") {
					try {
						userData = JSON.parse(userData);
					} catch (e) {
						console.error(
							`Errore parsing JSON per l'utente [${key}]:`,
							e,
						);
						continue; // Salta questo utente in caso di dati corrotti
					}
				}

				if (userData && typeof userData === "object") {
					// SICUREZZA: Omettiamo la password (hash) esattamente come facevamo in SQL!
					delete userData.psw;

					usersList.push(userData);
				}
			} catch (userErr) {
				console.error(
					`Errore nel recupero dell'utente con ID ${key}:`,
					userErr,
				);
				// Continuiamo il ciclo senza bloccare il resto degli utenti
				continue;
			}
		}

		// 4. Ordiniamo la lista per cognome e poi per nome (Replica dell'ORDER BY in SQL)
		usersList.sort((a, b) => {
			const cognomeA = (a.cognome || "").toLowerCase();
			const cognomeB = (b.cognome || "").toLowerCase();
			if (cognomeA < cognomeB) return -1;
			if (cognomeA > cognomeB) return 1;

			// A parità di cognome, ordina per nome
			const nomeA = (a.nome || "").toLowerCase();
			const nomeB = (b.nome || "").toLowerCase();
			if (nomeA < nomeB) return -1;
			if (nomeA > nomeB) return 1;

			return 0;
		});

		// 5. Inviamo la risposta al frontend
		return res.status(200).json({
			message: "ok",
			data: usersList,
		});
	} catch (err) {
		console.error("Errore recupero utenti dalla Blockchain:", err);
		return res.status(500).json({
			message:
				"Errore interno server durante la lettura dalla blockchain",
		});
	}
});

// =========================================================
// ROTTA: Aggiunge un nuovo utente sulla Blockchain (SOLO CEO)
// =========================================================
router.post("/addUser", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { nome, cognome, email, id_wallet, quota, classe, psw } =
			req.body;

		// 1. Controllo validità parametri
		if (!nome || !cognome || !email || !id_wallet || !psw) {
			return res
				.status(400)
				.json({ message: "Tutti i campi sono obbligatori." });
		}

		// 2. Hash della password
		// È fondamentale per far funzionare il login!
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

		// 3. RECUPERO E AGGIORNAMENTO DELLA TABELLA INDICE
		// Dobbiamo aggiornare la mappa Email -> ID per permettere il login tramite email
		const tableAnswer = await getKV("User", "table");
		let emailTable =
			tableAnswer?.value || tableAnswer?.answer || tableAnswer;

		if (typeof emailTable === "string") {
			try {
				emailTable = JSON.parse(emailTable);
			} catch (e) {
				emailTable = {}; // Fallback se la tabella è vuota/corrotta
			}
		} else if (!emailTable) {
			emailTable = {};
		}

		// Controllo se l'email o l'ID esistono già
		if (emailTable[email]) {
			return res
				.status(400)
				.json({
					message: "Un utente con questa email è già registrato.",
				});
		}

		// Aggiungiamo la nuova associazione
		emailTable[email] = String(id_wallet);

		// 4. SALVATAGGIO SULLA BLOCKCHAIN
		// Salviamo l'oggetto utente
		await addKV("User", String(id_wallet), JSON.stringify(newUserObj));

		// Salviamo la tabella aggiornata
		await addKV("User", "table", JSON.stringify(emailTable));

		return res.status(200).json({
			message: "Utente aggiunto con successo alla blockchain",
		});
	} catch (err) {
		console.error("Errore inserimento nuovo utente:", err);
		return res.status(500).json({
			message:
				"Errore interno server durante la registrazione sulla blockchain",
		});
	}
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// 1. Importiamo i middleware per la sicurezza
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");

// 2. Importiamo le funzioni per comunicare con la Blockchain
const { addKV, getKeysCopy, getKV } = require("../mapping/mapping.js");

// =========================================================
// FUNZIONE HELPER PER LA FORMATTAZIONE DEI LOG
// Formato: [timestamp][ip-sorgente][ip-destinazione][action/route][codice][comment]
// =========================================================
const formatLog = (req, statusCode, comment) => {
	const timestamp = new Date().toISOString();
	// Recuperiamo gli IP. Se non sono disponibili, inseriamo "Unknown"
	const ipSorgente = req.ip || req.socket?.remoteAddress || "Unknown";
	const ipDestinazione = req.socket?.localAddress || "Unknown";
	const actionRoute = `${req.method} ${req.originalUrl || req.url}`;

	return `[${timestamp}][${ipSorgente}][${ipDestinazione}][${actionRoute}][${statusCode}][${comment}]`;
};

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
						// LOG AGGIORNATO
						console.error(
							formatLog(
								req,
								500,
								`Errore parsing JSON per l'utente [${key}]: ${e.message || e}`,
							),
						);
						continue; // Salta questo utente in caso di dati corrotti[cite: 5]
					}
				}

				if (userData && typeof userData === "object") {
					// SICUREZZA: Omettiamo la password (hash) esattamente come facevamo in SQL![cite: 5]
					delete userData.psw;

					usersList.push(userData);
				}
			} catch (userErr) {
				// LOG AGGIORNATO
				console.error(
					formatLog(
						req,
						500,
						`Errore nel recupero dell'utente con ID ${key}: ${userErr.message || userErr}`,
					),
				);
				// Continuiamo il ciclo senza bloccare il resto degli utenti[cite: 5]
				continue;
			}
		}

		// 4. Ordiniamo la lista per cognome e poi per nome (Replica dell'ORDER BY in SQL)
		usersList.sort((a, b) => {
			const cognomeA = (a.cognome || "").toLowerCase();
			const cognomeB = (b.cognome || "").toLowerCase();
			if (cognomeA < cognomeB) return -1;
			if (cognomeA > cognomeB) return 1;

			// A parità di cognome, ordina per nome[cite: 5]
			const nomeA = (a.nome || "").toLowerCase();
			const nomeB = (b.nome || "").toLowerCase();
			if (nomeA < nomeB) return -1;
			if (nomeA > nomeB) return 1;

			return 0;
		});

		// LOG AGGIUNTO (SUCCESSO)
		console.log(
			formatLog(
				req,
				200,
				`Recuperati con successo ${usersList.length} utenti`,
			),
		);

		// 5. Inviamo la risposta al frontend
		return res.status(200).json({
			message: "ok",
			data: usersList,
		});
	} catch (err) {
		// LOG AGGIORNATO
		console.error(
			formatLog(
				req,
				500,
				`Errore recupero utenti dalla Blockchain: ${err.message || err}`,
			),
		);
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
			// LOG AGGIUNTO (ERRORE VALIDAZIONE)
			console.log(
				formatLog(
					req,
					400,
					"Campi mancanti durante la registrazione utente",
				),
			);
			return res
				.status(400)
				.json({ message: "Tutti i campi sono obbligatori." });
		}

		// 2. Hash della password
		// È fondamentale per far funzionare il login![cite: 5]
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
		// Dobbiamo aggiornare la mappa Email -> ID per permettere il login tramite email[cite: 5]
		const tableAnswer = await getKV("User", "table");
		let emailTable =
			tableAnswer?.value || tableAnswer?.answer || tableAnswer;

		if (typeof emailTable === "string") {
			try {
				emailTable = JSON.parse(emailTable);
			} catch (e) {
				emailTable = {}; // Fallback se la tabella è vuota/corrotta[cite: 5]
			}
		} else if (!emailTable) {
			emailTable = {};
		}

		// Controllo se l'email o l'ID esistono già
		if (emailTable[email]) {
			// LOG AGGIUNTO (CONFLITTO EMAIL)
			console.log(
				formatLog(
					req,
					400,
					`Tentativo di registrazione fallito: email ${email} già in uso`,
				),
			);
			return res.status(400).json({
				message: "Un utente con questa email è già registrato.",
			});
		}

		// Aggiungiamo la nuova associazione
		emailTable[email] = String(id_wallet);

		// 4. SALVATAGGIO SULLA BLOCKCHAIN
		// Salviamo l'oggetto utente[cite: 5]
		await addKV("User", String(id_wallet), JSON.stringify(newUserObj));

		// Salviamo la tabella aggiornata[cite: 5]
		await addKV("User", "table", JSON.stringify(emailTable));

		// LOG AGGIUNTO (SUCCESSO)
		console.log(
			formatLog(
				req,
				200,
				`Utente [${id_wallet}] - ${email} aggiunto con successo alla blockchain`,
			),
		);

		return res.status(200).json({
			message: "Utente aggiunto con successo alla blockchain",
		});
	} catch (err) {
		// LOG AGGIORNATO
		console.error(
			formatLog(
				req,
				500,
				`Errore inserimento nuovo utente: ${err.message || err}`,
			),
		);
		return res.status(500).json({
			message:
				"Errore interno server durante la registrazione sulla blockchain",
		});
	}
});

module.exports = router;

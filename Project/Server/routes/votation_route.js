const express = require("express");
const crypto = require("crypto");
const pool = require("../database/database");
const router = express.Router();
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");
const { checkIfAlreadyVoted } = require("../middleware/check_vote.js");

// IMPORTIAMO LE FUNZIONI
const { getKV, addKV, getHistoryKV } = require("../mapping/mapping.js");

router.get("/get-votations-status", verifyToken, async (req, res) => {
	try {
		const meetingId = req.query.meetingId;
		if (!meetingId) {
			return res
				.status(400)
				.json({ message: "Parametro meetingId mancante." });
		}

		// 1. Recupero Dati Riunione per controllare le date
		const reunionAnswer = await getKV("Reunion", meetingId);
		let meetingData = reunionAnswer?.value;

		if (typeof meetingData === "string") {
			try {
				meetingData = JSON.parse(meetingData);
			} catch (e) {
				console.error("Errore parsing dati riunione", e);
			}
		}

		// Calcolo stato termine riunione
		const now = new Date();
		let isMeetingEnded = false;
		if (meetingData && meetingData.dataFine) {
			const end = new Date(meetingData.dataFine);
			if (now > end) {
				isMeetingEnded = true;
			}
		}

		// 2. Recupero stato votazioni attuale
		const kvAnswer = await getKV("Votation", [meetingId, "status"]);
		let votationsData = kvAnswer?.value;

		if (typeof votationsData === "string") {
			try {
				votationsData = JSON.parse(votationsData);
			} catch (e) {
				votationsData = {};
			}
		}
		if (!votationsData) votationsData = {};

		// 3. Elaborazione e Chiusura Automatica (se riunione terminata)
		let hasModifications = false;

		if (isMeetingEnded) {
			for (const [voteIndex, status] of Object.entries(votationsData)) {
				// Se è "true" (aperta), eseguiamo la validazione automatica e la chiudiamo
				if (status === true || status === "true") {
					// --- INIZIO LOGICA VALIDATION-VOTE ---
					let historyResult;
					try {
						historyResult = await getHistoryKV("Votation", [
							meetingId,
							String(voteIndex),
						]);
					} catch (err) {
						historyResult = []; // Nessuno storico trovato
					}

					let sommaTotale = 0;
					let countFavorevoli = 0;
					let countContrari = 0;
					let countAstenuti = 0;

					if (
						historyResult &&
						Array.isArray(historyResult) &&
						historyResult.length > 0
					) {
						for (const record of historyResult) {
							if (record.isDelete) continue;

							let dataObj;
							try {
								dataObj = JSON.parse(record.data);
							} catch (e) {
								continue;
							}

							let innerValue = dataObj.value;
							if (typeof innerValue === "string") {
								try {
									innerValue = JSON.parse(innerValue);
								} catch (e) {
									continue;
								}
							}

							if (innerValue && innerValue.value !== undefined) {
								const valoreVoto =
									parseFloat(innerValue.value) || 0;
								sommaTotale += valoreVoto;

								if (valoreVoto > 0) countFavorevoli++;
								else if (valoreVoto < 0) countContrari++;
								else countAstenuti++;
							}
						}
					}

					const dettagliVotiObj = {
						favorevoli: countFavorevoli,
						contrari: countContrari,
						astenuti: countAstenuti,
						totaleVotanti:
							countFavorevoli + countContrari + countAstenuti,
					};

					const payloadRisultato = {
						"esito voto": sommaTotale,
						dettagliVoti: dettagliVotiObj,
					};

					// Sigilliamo il risultato sulla blockchain per la singola votazione
					await addKV(
						"Votation",
						[meetingId, String(voteIndex)],
						JSON.stringify(payloadRisultato),
					);
					// --- FINE LOGICA VALIDATION-VOTE ---

					// Aggiorniamo lo status a "closed"
					votationsData[voteIndex] = "closed";
					hasModifications = true;
				}
			}
		}

		// 4. Salvataggio delle modifiche allo Status in Blockchain
		if (hasModifications) {
			await addKV(
				"Votation",
				[meetingId, "status"],
				JSON.stringify(votationsData),
			);
		}

		// Ritorno il JSON aggiornato al frontend
		return res.status(200).json({ message: "ok", data: votationsData });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: "Errore interno server" });
	}
});

router.post("/aggiorna-status", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { meetingId, votationsStatus } = req.body;
		if (!meetingId || !votationsStatus) {
			return res.status(400).json({ message: "Dati mancanti" });
		}

		// Chiamata diretta a addKV
		const updateJson = await addKV(
			"Votation",
			[meetingId, "status"],
			JSON.stringify(votationsStatus),
		);

		return res
			.status(200)
			.json({ message: "Stato aggiornato", data: updateJson });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: "Errore interno server" });
	}
});

router.post("/add-vote", verifyToken, checkIfAlreadyVoted, async (req, res) => {
	try {
		const { meetingId, voteIndex, voto } = req.body;

		// 1. Estrazione sicura dei dati dal token
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		if (!meetingId || !voteIndex || !voto) {
			return res.status(400).json({
				message: "Dati mancanti (meetingId, voteIndex, voto).",
			});
		}
		if (!userEmail) {
			return res
				.status(400)
				.json({ message: "Email utente mancante nel token." });
		}

		// 2. CONTROLLO PARTECIPAZIONE: Recupero dati riunione
		const reunionAnswer = await getKV("Reunion", meetingId);
		let meetingData = reunionAnswer?.value;

		if (typeof meetingData === "string") {
			try {
				meetingData = JSON.parse(meetingData);
			} catch (e) {
				console.error("Errore parsing dati riunione", e);
			}
		}

		if (!meetingData) {
			return res
				.status(404)
				.json({ message: "Riunione non trovata sulla blockchain." });
		}

		// 3. Verifichiamo se l'utente è autorizzato (CEO o presente in lista partecipanti)
		const partecipanti = meetingData.partecipanti || [];
		if (!isCEO && !partecipanti.includes(userEmail)) {
			return res.status(403).json({
				message:
					"Accesso negato: non sei autorizzato a votare in questa riunione.",
			});
		}

		// 4. Recupero quota dal database (Logica preesistente)
		const query = `SELECT quota FROM utenti WHERE email = $1`;
		const dbResult = await pool.query(query, [userEmail]);

		if (dbResult.rows.length === 0)
			return res
				.status(404)
				.json({ message: "Utente non trovato nel database." });

		const quota = parseFloat(dbResult.rows[0].quota) || 0;

		let valoreAssegnato = 0;
		if (voto === "favorevole") valoreAssegnato = quota;
		else if (voto === "contrario") valoreAssegnato = -quota;
		else if (voto === "astenuto") valoreAssegnato = 0;
		else
			return res
				.status(400)
				.json({ message: "Tipo di voto non valido." });

		const hashedEmail = crypto
			.createHash("sha256")
			.update(userEmail)
			.digest("hex");

		const payloadValue = {
			partecipante: hashedEmail,
			value: valoreAssegnato,
		};

		// 5. Salvataggio del voto in blockchain
		const addJson = await addKV(
			"Votation",
			[meetingId, String(voteIndex)],
			JSON.stringify(payloadValue),
		);

		return res.status(200).json({
			message: "Voto registrato e salvato con successo!",
			data: addJson,
		});
	} catch (err) {
		console.error("Errore nella rotta add-vote:", err);
		return res
			.status(500)
			.json({ message: "Errore interno del server durante il voto." });
	}
});

router.post("/validation-vote", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { meetingId, voteIndex } = req.body;

		if (!meetingId || !voteIndex) {
			return res
				.status(400)
				.json({ message: "Dati mancanti (meetingId o voteIndex)." });
		}

		let historyResult;
		try {
			historyResult = await getHistoryKV("Votation", [
				meetingId,
				String(voteIndex),
			]);
		} catch (err) {
			return res.status(404).json({
				message: "Nessuno storico trovato per questa votazione.",
			});
		}

		if (
			!historyResult ||
			!Array.isArray(historyResult) ||
			historyResult.length === 0
		) {
			return res.status(200).json({
				message: "Nessun voto registrato, niente da validare.",
			});
		}

		let sommaTotale = 0;
		let countFavorevoli = 0;
		let countContrari = 0;
		let countAstenuti = 0;

		for (const record of historyResult) {
			if (record.isDelete) continue;

			let dataObj;
			try {
				dataObj = JSON.parse(record.data);
			} catch (e) {
				continue;
			}

			let innerValue = dataObj.value;
			if (typeof innerValue === "string") {
				try {
					innerValue = JSON.parse(innerValue);
				} catch (e) {
					continue;
				}
			}

			if (innerValue && innerValue.value !== undefined) {
				const valoreVoto = parseFloat(innerValue.value) || 0;
				sommaTotale += valoreVoto;

				if (valoreVoto > 0) countFavorevoli++;
				else if (valoreVoto < 0) countContrari++;
				else countAstenuti++;
			}
		}

		const dettagliVotiObj = {
			favorevoli: countFavorevoli,
			contrari: countContrari,
			astenuti: countAstenuti,
			totaleVotanti: countFavorevoli + countContrari + countAstenuti,
		};

		const payloadRisultato = {
			"esito voto": sommaTotale,
			dettagliVoti: dettagliVotiObj,
		};

		try {
			// Sigilliamo il risultato sulla blockchain
			await addKV(
				"Votation",
				[meetingId, String(voteIndex)],
				JSON.stringify(payloadRisultato),
			);
		} catch (saveError) {
			console.error(
				"Impossibile salvare il risultato finale:",
				saveError,
			);
			return res.status(500).json({
				message: "Errore durante il salvataggio del risultato.",
			});
		}

		return res.status(200).json({
			message:
				"Scrutinio completato e sigillato con successo sulla blockchain.",
		});
	} catch (error) {
		console.error("Errore durante la validazione dei voti:", error);
		return res.status(500).json({
			message: "Errore interno del server durante la validazione.",
		});
	}
});

router.post("/visualize-vote", verifyToken, async (req, res) => {
	try {
		const { meetingId, voteIndex } = req.body;

		// 1. Estraiamo in modo sicuro i dati dell'utente dal token
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		if (!meetingId || !voteIndex) {
			return res
				.status(400)
				.json({ message: "Dati mancanti (meetingId o voteIndex)." });
		}

		// 2. Recuperiamo la Riunione per controllare la lista dei partecipanti
		const reunionAnswer = await getKV("Reunion", meetingId);
		let meetingData = reunionAnswer?.value;

		if (typeof meetingData === "string") {
			try {
				meetingData = JSON.parse(meetingData);
			} catch (e) {
				console.error("Errore parsing dati riunione", e);
			}
		}

		if (!meetingData) {
			return res.status(404).json({ message: "Riunione non trovata." });
		}

		// 3. Verifichiamo se l'utente ha il permesso di vedere i risultati
		// Ha il permesso se è il CEO oppure se la sua email è nell'array partecipanti
		const partecipanti = meetingData.partecipanti || [];
		if (!isCEO && !partecipanti.includes(userEmail)) {
			return res.status(403).json({
				message:
					"Accesso negato: non sei un partecipante di questa riunione.",
			});
		}

		// 4. Recuperiamo solo l'ultimo valore aggiornato per questa votazione
		// Ho rinominato in `voteAnswer` per evitare conflitti con `reunionAnswer`
		const voteAnswer = await getKV("Votation", [
			meetingId,
			String(voteIndex),
		]);
		let dataObj = voteAnswer?.value;

		if (typeof dataObj === "string") {
			try {
				dataObj = JSON.parse(dataObj);
			} catch (e) {}
		}

		// Se l'oggetto non ha "dettagliVoti", significa che la votazione non è stata ancora validata/chiusa
		if (!dataObj || !dataObj.dettagliVoti) {
			return res.status(404).json({
				message: "Risultati non disponibili.",
			});
		}

		const sommaTotale = dataObj["esito voto"] || 0;
		const dettagliVotiObj = dataObj.dettagliVoti;

		let esito = "Pari o Astenuti predominanti";
		let status = "zero";

		if (sommaTotale > 0) {
			esito = "Strettamente Positiva (Votazione Approvata)";
			status = "positiva";
		} else if (sommaTotale < 0) {
			esito = "Strettamente Negativa (Votazione Respinta)";
			status = "negativa";
		}

		// Risposta esatta richiesta per il frontend
		return res.status(200).json({
			message: "Visualizzazione risultati completata con successo",
			somma: sommaTotale,
			esito: esito,
			status: status,
			dettagliVoti: dettagliVotiObj,
		});
	} catch (err) {
		console.error("Errore nel recupero dei risultati:", err);
		return res.status(500).json({
			message:
				"Errore interno del server durante il recupero dei risultati.",
		});
	}
});

module.exports = router;

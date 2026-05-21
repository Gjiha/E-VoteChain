const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth_middle.js");
const { checkIfAlreadyVoted } = require("../middleware/check_vote_middle.js");
const { getKV, addKV, getHistoryKV } = require("../mapping/mapping.js");

const Logger = require("../utils/logger_utils.js");

router.get("/get-votations-status", verifyToken, async (req, res) => {
	try {
		const meetingId = req.query.meetingId;
		if (!meetingId) {
			await Logger.alert(
				req,
				400,
				"get-votations-status fallita: parametro meetingId mancante.",
			);
			return res.status(400).json({ message: "Parametro mancante." });
		}

		const reunionAnswer = await getKV("Reunion", meetingId);
		let meetingData = reunionAnswer?.value;

		if (typeof meetingData === "string") {
			try {
				meetingData = JSON.parse(meetingData);
			} catch (e) {
				await Logger.alert(
					req,
					500,
					`Errore parsing dati riunione per meetingId: ${meetingId}. Dettaglio: ${e.message}`,
				);
			}
		}

		const now = new Date();
		let isMeetingEnded = false;
		if (meetingData && meetingData.dataFine) {
			const end = new Date(meetingData.dataFine);
			if (now > end) {
				isMeetingEnded = true;
			}
		}

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

		let hasModifications = false;

		if (isMeetingEnded) {
			await Logger.signal(
				req,
				200,
				`Riunione ${meetingId} terminata. Avvio chiusura automatica votazioni aperte.`,
			);
			for (const [voteIndex, status] of Object.entries(votationsData)) {
				if (status === true || status === "true") {
					let historyResult;
					try {
						historyResult = await getHistoryKV("Votation", [
							meetingId,
							String(voteIndex),
						]);
					} catch (err) {
						await Logger.signal(
							req,
							200,
							`Nessuno storico trovato per voteIndex: ${voteIndex} su meetingId: ${meetingId}. Chiusura con zero voti.`,
						);
						historyResult = [];
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

					await addKV(
						"Votation",
						[meetingId, String(voteIndex)],
						JSON.stringify(payloadRisultato),
					);

					votationsData[voteIndex] = "closed";
					hasModifications = true;

					await Logger.signal(
						req,
						200,
						`Votazione ${voteIndex} su meetingId: ${meetingId} chiusa automaticamente. Esito: ${sommaTotale}, Favorevoli: ${countFavorevoli}, Contrari: ${countContrari}, Astenuti: ${countAstenuti}.`,
					);
				}
			}
		}

		if (hasModifications) {
			await addKV(
				"Votation",
				[meetingId, "status"],
				JSON.stringify(votationsData),
			);
			await Logger.signal(
				req,
				200,
				`Status votazioni aggiornato sulla blockchain per meetingId: ${meetingId}.`,
			);
		}

		await Logger.signal(
			req,
			200,
			`Stato votazioni restituito con successo per meetingId: ${meetingId}.`,
		);
		return res.status(200).json({ message: "ok", data: votationsData });
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore interno in get-votations-status: ${err.message}`,
		);
		return res.status(500).json({ message: "Errore interno server" });
	}
});

router.post("/aggiorna-status", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { meetingId, votationsStatus } = req.body;
		if (!meetingId || !votationsStatus) {
			await Logger.alert(
				req,
				400,
				"aggiorna-status fallita: meetingId o votationsStatus mancanti.",
			);
			return res.status(400).json({ message: "Dati mancanti" });
		}

		const updateJson = await addKV(
			"Votation",
			[meetingId, "status"],
			JSON.stringify(votationsStatus),
		);

		await Logger.signal(
			req,
			200,
			`Stato votazioni aggiornato con successo per meetingId: ${meetingId}.`,
		);
		return res
			.status(200)
			.json({ message: "Stato aggiornato", data: updateJson });
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore in aggiorna-status: ${err.message}`,
		);
		return res.status(500).json({ message: "Errore interno server" });
	}
});

router.post("/add-vote", verifyToken, checkIfAlreadyVoted, async (req, res) => {
	try {
		const { meetingId, voteIndex, voto } = req.body;
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		if (!meetingId || !voteIndex || !voto) {
			await Logger.alert(
				req,
				400,
				`add-vote fallita: parametri mancanti. meetingId: ${meetingId}, voteIndex: ${voteIndex}, voto: ${voto}.`,
			);
			return res.status(400).json({
				message: "Dati mancanti (meetingId, voteIndex, voto).",
			});
		}
		if (!userEmail) {
			await Logger.alert(
				req,
				400,
				"add-vote fallita: email utente mancante nel token.",
			);
			return res.status(400).json({ message: "Errore token." });
		}

		const reunionAnswer = await getKV("Reunion", meetingId);
		let meetingData = reunionAnswer?.value;

		if (typeof meetingData === "string") {
			try {
				meetingData = JSON.parse(meetingData);
			} catch (e) {
				await Logger.alert(
					req,
					500,
					`Errore parsing dati riunione per meetingId: ${meetingId}. Dettaglio: ${e.message}`,
				);
			}
		}

		if (!meetingData) {
			await Logger.alert(
				req,
				404,
				`add-vote fallita: riunione non trovata sulla blockchain per meetingId: ${meetingId}.`,
			);
			return res
				.status(404)
				.json({ message: "Riunione non trovata sulla blockchain." });
		}

		const partecipanti = meetingData.partecipanti || [];
		if (!isCEO && !partecipanti.includes(userEmail)) {
			await Logger.alert(
				req,
				403,
				`add-vote negata: utente ${userEmail} non autorizzato a votare per meetingId: ${meetingId}.`,
			);
			return res.status(403).json({
				message:
					"Accesso negato: non sei autorizzato a votare in questa riunione.",
			});
		}

		const tableAnswer = await getKV("User", "table");
		let emailTable =
			tableAnswer?.value || tableAnswer?.answer || tableAnswer;
		if (typeof emailTable === "string") {
			try {
				emailTable = JSON.parse(emailTable);
			} catch (e) {
				emailTable = {};
			}
		}

		const userId = emailTable ? emailTable[userEmail] : null;
		if (!userId) {
			await Logger.alert(
				req,
				404,
				`add-vote fallita: utente ${userEmail} non trovato nella tabella blockchain.`,
			);
			return res.status(404).json({
				message: "Utente non trovato nella tabella blockchain.",
			});
		}

		const userAnswer = await getKV("User", String(userId));
		let userData = userAnswer?.value || userAnswer?.answer || userAnswer;
		if (typeof userData === "string") {
			try {
				userData = JSON.parse(userData);
			} catch (e) {}
		}

		if (!userData || userData.quota === undefined) {
			await Logger.alert(
				req,
				404,
				`add-vote fallita: quota non trovata per userId: ${userId}.`,
			);
			return res.status(404).json({
				message: "Quota utente non trovata sulla blockchain.",
			});
		}

		const quota = parseFloat(userData.quota) || 0;

		let valoreAssegnato = 0;
		if (voto === "favorevole") valoreAssegnato = quota;
		else if (voto === "contrario") valoreAssegnato = -quota;
		else if (voto === "astenuto") valoreAssegnato = 0;
		else {
			await Logger.alert(
				req,
				400,
				`add-vote fallita: tipo di voto non valido "${voto}" per utente ${userEmail}.`,
			);
			return res
				.status(400)
				.json({ message: "Tipo di voto non valido." });
		}

		const hashedEmail = crypto
			.createHash("sha256")
			.update(userEmail)
			.digest("hex");

		const payloadValue = {
			partecipante: hashedEmail,
			value: valoreAssegnato,
		};

		const addJson = await addKV(
			"Votation",
			[meetingId, String(voteIndex)],
			JSON.stringify(payloadValue),
		);

		await Logger.signal(
			req,
			200,
			`Voto registrato con successo. Utente (hash): ${hashedEmail}, meetingId: ${meetingId}, voteIndex: ${voteIndex}, tipo: ${voto}, valore: ${valoreAssegnato}.`,
		);
		return res.status(200).json({
			message: "Voto registrato e salvato con successo!",
			data: addJson,
		});
	} catch (err) {
		await Logger.alert(req, 500, `Errore in add-vote: ${err.message}`);
		return res
			.status(500)
			.json({ message: "Errore interno del server durante il voto." });
	}
});

router.post("/validation-vote", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { meetingId, voteIndex } = req.body;

		if (!meetingId || !voteIndex) {
			await Logger.alert(
				req,
				400,
				"validation-vote fallita: meetingId o voteIndex mancanti.",
			);
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
			await Logger.alert(
				req,
				404,
				`validation-vote: nessuno storico trovato per meetingId: ${meetingId}, voteIndex: ${voteIndex}.`,
			);
			return res.status(404).json({
				message: "Nessuno storico trovato per questa votazione.",
			});
		}

		if (
			!historyResult ||
			!Array.isArray(historyResult) ||
			historyResult.length === 0
		) {
			await Logger.signal(
				req,
				200,
				`validation-vote: storico vuoto per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Niente da validare.`,
			);
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
			await addKV(
				"Votation",
				[meetingId, String(voteIndex)],
				JSON.stringify(payloadRisultato),
			);
		} catch (saveError) {
			await Logger.alert(
				req,
				500,
				`Impossibile salvare il risultato finale per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Dettaglio: ${saveError.message}`,
			);
			return res.status(500).json({
				message: "Errore durante il salvataggio del risultato.",
			});
		}

		await Logger.signal(
			req,
			200,
			`Scrutinio completato per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Esito: ${sommaTotale}, Favorevoli: ${countFavorevoli}, Contrari: ${countContrari}, Astenuti: ${countAstenuti}.`,
		);
		return res.status(200).json({
			message:
				"Scrutinio completato e sigillato con successo sulla blockchain.",
		});
	} catch (error) {
		await Logger.alert(
			req,
			500,
			`Errore durante la validazione dei voti: ${error.message}`,
		);
		return res.status(500).json({
			message: "Errore interno del server durante la validazione.",
		});
	}
});

router.post("/visualize-vote", verifyToken, async (req, res) => {
	try {
		const { meetingId, voteIndex } = req.body;
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		if (!meetingId || !voteIndex) {
			await Logger.alert(
				req,
				400,
				"visualize-vote fallita: meetingId o voteIndex mancanti.",
			);
			return res
				.status(400)
				.json({ message: "Dati mancanti (meetingId o voteIndex)." });
		}

		const reunionAnswer = await getKV("Reunion", meetingId);
		let meetingData = reunionAnswer?.value;

		if (typeof meetingData === "string") {
			try {
				meetingData = JSON.parse(meetingData);
			} catch (e) {
				await Logger.alert(
					req,
					500,
					`Errore parsing dati riunione per meetingId: ${meetingId}. Dettaglio: ${e.message}`,
				);
			}
		}

		if (!meetingData) {
			await Logger.alert(
				req,
				404,
				`visualize-vote fallita: riunione non trovata per meetingId: ${meetingId}.`,
			);
			return res.status(404).json({ message: "Riunione non trovata." });
		}

		const partecipanti = meetingData.partecipanti || [];
		if (!isCEO && !partecipanti.includes(userEmail)) {
			await Logger.alert(
				req,
				403,
				`visualize-vote negata: utente ${userEmail} non è partecipante della riunione ${meetingId}.`,
			);
			return res.status(403).json({
				message:
					"Accesso negato: non sei un partecipante di questa riunione.",
			});
		}

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

		if (!dataObj || !dataObj.dettagliVoti) {
			await Logger.alert(
				req,
				404,
				`visualize-vote: risultati non disponibili per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Votazione non ancora chiusa.`,
			);
			return res
				.status(404)
				.json({ message: "Risultati non disponibili." });
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

		await Logger.signal(
			req,
			200,
			`visualize-vote completata per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Status: ${status}, Somma: ${sommaTotale}.`,
		);
		return res.status(200).json({
			message: "Visualizzazione risultati completata con successo",
			somma: sommaTotale,
			esito: esito,
			status: status,
			dettagliVoti: dettagliVotiObj,
		});
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore nel recupero dei risultati: ${err.message}`,
		);
		return res.status(500).json({
			message:
				"Errore interno del server durante il recupero dei risultati.",
		});
	}
});

module.exports = router;

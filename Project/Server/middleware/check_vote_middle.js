const crypto = require("crypto");
const { getHistoryKV } = require("../mapping/mapping.js");
const Logger = require("../utils/logger_utils.js");

const checkIfAlreadyVoted = async (req, res, next) => {
	try {
		const { meetingId, voteIndex } = req.body;
		const userEmail = req.user.email;

		if (!meetingId || !voteIndex) {
			await Logger.alert(
				req,
				400,
				"Dati della votazione mancanti (meetingId o voteIndex).",
			);
			return res.status(400).json({ message: "Dati mancanti." });
		}

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
				`Nessuno storico trovato per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Prima votazione consentita.`,
			);
			return next();
		}

		if (
			!historyResult ||
			!Array.isArray(historyResult) ||
			historyResult.length === 0
		) {
			await Logger.signal(
				req,
				200,
				`Storico vuoto per meetingId: ${meetingId}, voteIndex: ${voteIndex}. Voto consentito.`,
			);
			return next();
		}

		const userHash = crypto
			.createHash("sha256")
			.update(userEmail)
			.digest("hex");

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

			const hashPartecipante = innerValue?.partecipante;

			if (hashPartecipante === userHash) {
				await Logger.alert(
					req,
					403,
					`Voto duplicato rilevato per utente (hash: ${userHash}) su meetingId: ${meetingId}, voteIndex: ${voteIndex}.`,
				);
				return res.status(403).json({
					message: "Voto rifiutato.",
				});
			}
		}

		await Logger.signal(
			req,
			200,
			`Nessun voto precedente rilevato per utente (hash: ${userHash}). Voto consentito.`,
		);
		next();
	} catch (error) {
		await Logger.alert(
			req,
			500,
			`Errore nel middleware checkIfAlreadyVoted: ${error.message}`,
		);
		return res.status(500).json({
			message: "Errore di sistema durante la verifica del voto.",
		});
	}
};

module.exports = {
	checkIfAlreadyVoted,
};

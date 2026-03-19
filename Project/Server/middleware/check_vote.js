const crypto = require("crypto"); // <-- CAMBIATO DA BCRYPT A CRYPTO
const { getHistoryKV } = require("../mapping/mapping");

const checkIfAlreadyVoted = async (req, res, next) => {
	try {
		const { meetingId, voteIndex } = req.body;
		const userEmail = req.user.email;

		if (!meetingId || !voteIndex) {
			return res
				.status(400)
				.json({ message: "Dati della votazione mancanti." });
		}

		let historyResult;
		try {
			historyResult = await getHistoryKV("Votation", [
				meetingId,
				String(voteIndex),
			]);
		} catch (err) {
			console.warn("Nessuno storico trovato (prima votazione).");
			return next();
		}

		if (
			!historyResult ||
			!Array.isArray(historyResult) ||
			historyResult.length === 0
		) {
			return next();
		}

		// Calcoliamo l'hash SHA-256 dell'utente che sta provando a votare in questo momento
		const userHash = crypto
			.createHash("sha256")
			.update(userEmail)
			.digest("hex");

		// Cicliamo lo storico per vedere se questo hash esiste già
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

			// Essendo SHA-256 deterministico, possiamo fare un semplice confronto tra stringhe!
			if (hashPartecipante === userHash) {
				return res.status(403).json({
					message:
						"Voto rifiutato: Hai già espresso la tua preferenza per questa votazione.",
				});
			}
		}

		// Nessuna corrispondenza trovata: l'utente non ha ancora votato
		next();
	} catch (error) {
		console.error("Errore nel middleware checkIfAlreadyVoted:", error);
		return res.status(500).json({
			message: "Errore di sistema durante la verifica del voto.",
		});
	}
};

module.exports = {
	checkIfAlreadyVoted,
};

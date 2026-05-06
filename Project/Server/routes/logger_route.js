const express = require("express");
const router = express.Router();
const { getHistoryKV } = require("../mapping/mapping.js"); // Assicurati che il path sia corretto

// Rotta per recuperare i log, da chiamare dal frontend
router.get("/logs/history", async (req, res) => {
	try {
		let alertsHistory = [];
		let signalsHistory = [];

		// Recuperiamo lo storico delle chiavi Alert e Signal
		try {
			alertsHistory = await getHistoryKV("Logger", "Alert");
		} catch (e) {
			console.error("Nessuno storico Alert trovato o errore:", e.message);
		}

		try {
			signalsHistory = await getHistoryKV("Logger", "Signal");
		} catch (e) {
			console.error(
				"Nessuno storico Signal trovato o errore:",
				e.message,
			);
		}

		const formattedLogs = [];

		// Funzione helper per estrarre la stringa grezza del log
		const processHistory = (historyArray, type) => {
			if (!Array.isArray(historyArray)) return;

			historyArray.forEach((record) => {
				// Ignoriamo i record cancellati
				if (record.isDelete) return;

				try {
					// La blockchain di solito salva il dato dentro record.data o record.value
					let dataObj =
						typeof record.data === "string"
							? JSON.parse(record.data)
							: record.data;
					let rawString =
						typeof dataObj.value === "string"
							? dataObj.value
							: dataObj.value?.value || dataObj;

					if (
						typeof rawString === "string" &&
						rawString.startsWith("[[")
					) {
						formattedLogs.push({ type: type, raw: rawString });
					}
				} catch (err) {
					// Ignora silenziomante i record corrotti per non bloccare il server
				}
			});
		};

		// Elaboriamo entrambi gli array
		processHistory(alertsHistory, "Alert");
		processHistory(signalsHistory, "Signal");

		// Invio al frontend
		return res.status(200).json(formattedLogs);
	} catch (error) {
		console.error("Errore fatale nel recupero log:", error);
		return res.status(500).json({ message: "Errore interno del server" });
	}
});

module.exports = router;

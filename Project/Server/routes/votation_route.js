const express = require("express");
const router = express.Router();
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");

const LOCAL_API_URL = "http://localhost:30000/api/v1";

router.get("/get-votations-status", verifyToken, async (req, res) => {
	try {
		const meetingId = req.query.meetingId;

		if (!meetingId) {
			return res
				.status(400)
				.json({ message: "Parametro meetingId mancante." });
		}

		// Chiamiamo l'API interna getKv.
		// Passando "meetingId,status", il server lo splitta nell'array ["reunion_xxx", "status"]
		const kvResponse = await fetch(
			`${LOCAL_API_URL}/getKv?class=Votation&key=${meetingId},status`,
		);

		if (!kvResponse.ok) {
			throw new Error(
				`Errore API getKv per Votation: ${kvResponse.status}`,
			);
		}

		const kvJson = await kvResponse.json();
		let votationsData = kvJson.data?.value || kvJson.answer?.value;

		// Se il database ci restituisce una stringa (es. "{\"1\":false,\"2\":false}"), la parsiamo
		if (typeof votationsData === "string") {
			try {
				votationsData = JSON.parse(votationsData);
			} catch (e) {
				console.error("Errore di parsing del JSON delle votazioni", e);
				votationsData = {};
			}
		}

		// Se non esiste ancora l'oggetto, restituiamo un oggetto vuoto per sicurezza
		if (!votationsData) {
			votationsData = {};
		}

		return res.status(200).json({
			message: "ok",
			data: votationsData,
		});
	} catch (err) {
		console.error("Errore recupero stato votazioni:", err);
		return res.status(500).json({
			message:
				"Errore interno server durante il recupero delle votazioni",
		});
	}
});

module.exports = router;

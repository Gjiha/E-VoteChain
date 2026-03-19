const express = require("express");
const router = express.Router();
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");

const { getKeysCopy, getKV, addKV } = require("../mapping/mapping.js");

router.get("/meetings", verifyToken, async (req, res) => {
	try {
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		if (!userEmail && !isCEO) {
			return res
				.status(400)
				.json({ message: "Email utente mancante nel token" });
		}

		// 1. Chiamiamo direttamente la funzione getKeysCopy
		const keysAnswer = await getKeysCopy("Reunion");

		const rawKeys = keysAnswer?.keys || [];
		const validKeys = rawKeys
			.map((k) => k[0])
			.filter((k) => k && k.startsWith("reunion_"));

		const userMeetings = [];

		// 2. Chiamiamo direttamente getKV per ogni chiave
		for (const key of validKeys) {
			try {
				const kvAnswer = await getKV("Reunion", key);
				let meetingData = kvAnswer?.value;

				if (typeof meetingData === "string") {
					try {
						meetingData = JSON.parse(meetingData);
					} catch (e) {
						continue;
					}
				}

				if (!meetingData || typeof meetingData !== "object") continue;

				const partecipanti = meetingData.partecipanti || [];

				if (isCEO || partecipanti.includes(userEmail)) {
					meetingData.id = key;
					meetingData.timestamp = parseInt(
						key.replace("reunion_", ""),
						10,
					);
					userMeetings.push(meetingData);
				}
			} catch (e) {
				continue; // Salta se c'è un errore su una singola riunione
			}
		}

		userMeetings.sort((a, b) => b.timestamp - a.timestamp);

		return res.status(200).json({
			message: "ok",
			data: userMeetings,
		});
	} catch (err) {
		console.error("Errore recupero my-meetings:", err);
		return res.status(500).json({ message: "Errore interno server" });
	}
});

// =========================================================
// NUOVA ROTTA: Crea una riunione (SOLO PER CEO/ADMIN)
// =========================================================
router.post("/create-meeting", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { meetingKey, meetingData } = req.body;

		if (!meetingKey || !meetingData) {
			return res
				.status(400)
				.json({ message: "Dati della riunione mancanti." });
		}

		// 1. Salvataggio diretto tramite addKV
		const addJson = await addKV(
			"Reunion",
			meetingKey,
			JSON.stringify(meetingData),
		);

		const numeroVotazioni = parseInt(meetingData.numeroVotazioni, 10) || 0;
		const statiVotazioni = {};
		for (let i = 1; i <= numeroVotazioni; i++) {
			statiVotazioni[i] = false;
		}

		// 2. Salvataggio della classe "Votation" diretto
		const addVotationJson = await addKV(
			"Votation",
			[meetingKey, "status"],
			JSON.stringify(statiVotazioni),
		);

		return res.status(200).json({
			message: "Riunione e votazioni create con successo!",
			data: addJson,
		});
	} catch (err) {
		console.error("Errore creazione riunione:", err);
		return res
			.status(500)
			.json({ message: "Errore interno server durante la creazione" });
	}
});

module.exports = router;

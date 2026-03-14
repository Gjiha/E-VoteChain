const express = require("express");
const router = express.Router();
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");

// Definiamo l'URL base delle tue API locali
// Assicurati che la porta corrisponda a quella su cui gira il tuo server
const LOCAL_API_URL = "http://localhost:30000/api/v1";

router.get("/meetings", verifyToken, async (req, res) => {
	try {
		// 1. Estraiamo i dati dell'utente dal JWT (grazie al middleware)
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();

		const isCEO =
			userRole === "CEO" ||
			userRole.includes("ADMIN") ||
			userRole.includes("AMMINISTRATORE");

		if (!userEmail && !isCEO) {
			return res
				.status(400)
				.json({ message: "Email utente mancante nel token" });
		}

		// 2. CHIAMIAMO LA TUA API /getKeysCopy TRAMITE FETCH LATO SERVER
		const keysResponse = await fetch(
			`${LOCAL_API_URL}/getKeysCopy?class=Reunion`,
		);
		if (!keysResponse.ok) {
			throw new Error(`Errore API getKeysCopy: ${keysResponse.status}`);
		}

		const keysJson = await keysResponse.json();
		// L'API risponde con { message: "ok", data: result }
		const rawKeys = keysJson.data?.keys || [];

		const validKeys = rawKeys
			.map((k) => k[0])
			.filter((k) => k && k.startsWith("reunion_"));

		const userMeetings = [];

		// 3. CHIAMIAMO LA TUA API /getKv PER OGNI CHIAVE
		for (const key of validKeys) {
			const kvResponse = await fetch(
				`${LOCAL_API_URL}/getKv?class=Reunion&key=${key}`,
			);
			if (!kvResponse.ok) continue; // Se fallisce una singola fetch, salta al prossimo

			const kvJson = await kvResponse.json();
			let meetingData = kvJson.data?.value || kvJson.answer?.value;

			if (typeof meetingData === "string") {
				try {
					meetingData = JSON.parse(meetingData);
				} catch (e) {
					continue; // Salta i JSON corrotti
				}
			}

			if (!meetingData || typeof meetingData !== "object") continue;

			// 4. Filtriamo i dati LATO SERVER
			const partecipanti = meetingData.partecipanti || [];

			if (isCEO || partecipanti.includes(userEmail)) {
				// L'utente ha il diritto di vedere questa riunione
				meetingData.id = key;
				meetingData.timestamp = parseInt(
					key.replace("reunion_", ""),
					10,
				);
				userMeetings.push(meetingData);
			}
		}

		// 5. Ordiniamo dalla più recente alla più vecchia
		userMeetings.sort((a, b) => b.timestamp - a.timestamp);

		// 6. Restituiamo il pacchetto già pronto e filtrato al frontend!
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
// 2. APPLICHIAMO ENTRAMBI I MIDDLEWARE NELLA DEFINIZIONE DELLA ROTTA
router.post("/create-meeting", verifyToken, isCeoOrAdmin, async (req, res) => {
	try {
		const { meetingKey, meetingData } = req.body;

		if (!meetingKey || !meetingData) {
			return res
				.status(400)
				.json({ message: "Dati della riunione mancanti." });
		}

		// 3. Il server, dopo aver verificato che l'utente è CEO, fa la chiamata interna ad addKv
		const addRes = await fetch(`${LOCAL_API_URL}/addKv`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				class: "Reunion",
				key: meetingKey,
				value: JSON.stringify(meetingData),
			}),
		});

		if (!addRes.ok) {
			throw new Error(`Errore API addKv: ${addRes.status}`);
		}

		const addJson = await addRes.json();

		return res.status(200).json({
			message: "Riunione creata con successo!",
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

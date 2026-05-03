const express = require("express");
const router = express.Router();
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth_middle.js");
const { getKeysCopy, getKV, addKV } = require("../mapping/mapping.js");

// =========================================================
// FUNZIONE HELPER PER LA FORMATTAZIONE DEI LOG
// Formato: [timestamp][ip-sorgente][ip-destinazione][action/route][codice][comment]
// =========================================================
const formatLog = (req, statusCode, comment) => {
	const timestamp = new Date().toISOString();
	const ipSorgente = req.ip || req.socket?.remoteAddress || "Unknown";
	const ipDestinazione = req.socket?.localAddress || "Unknown";
	const actionRoute = `${req.method} ${req.originalUrl || req.url}`;
	return `[${timestamp}][${ipSorgente}][${ipDestinazione}][${actionRoute}][${statusCode}][${comment}]`;
};

router.get("/meetings", verifyToken, async (req, res) => {
	try {
		const userEmail = req.user.email;
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		if (!userEmail && !isCEO) {
			console.log(
				formatLog(
					req,
					400,
					"Recupero riunioni fallito: email utente mancante nel token.",
				),
			);
			return res
				.status(400)
				.json({ message: "Email utente mancante nel token" });
		}

		const keysAnswer = await getKeysCopy("Reunion");
		const rawKeys = keysAnswer?.keys || [];
		const validKeys = rawKeys
			.map((k) => k[0])
			.filter((k) => k && k.startsWith("reunion_"));

		const userMeetings = [];

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
				console.log(
					formatLog(
						req,
						200,
						`Errore nel recupero della singola riunione con chiave: ${key}. Saltata.`,
					),
				);
				continue;
			}
		}

		userMeetings.sort((a, b) => b.timestamp - a.timestamp);

		console.log(
			formatLog(
				req,
				200,
				`Riunioni recuperate con successo per utente: ${userEmail || "CEO"}. Totale trovate: ${userMeetings.length}.`,
			),
		);
		return res.status(200).json({
			message: "ok",
			data: userMeetings,
		});
	} catch (err) {
		console.error(
			formatLog(req, 500, `Errore recupero riunioni: ${err.message}`),
		);
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
			console.log(
				formatLog(
					req,
					400,
					"Creazione riunione fallita: meetingKey o meetingData mancanti.",
				),
			);
			return res
				.status(400)
				.json({ message: "Dati della riunione mancanti." });
		}

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

		const addVotationJson = await addKV(
			"Votation",
			[meetingKey, "status"],
			JSON.stringify(statiVotazioni),
		);

		console.log(
			formatLog(
				req,
				200,
				`Riunione creata con successo. Chiave: ${meetingKey}, Votazioni previste: ${numeroVotazioni}.`,
			),
		);
		return res.status(200).json({
			message: "Riunione e votazioni create con successo!",
			data: addJson,
		});
	} catch (err) {
		console.error(
			formatLog(req, 500, `Errore creazione riunione: ${err.message}`),
		);
		return res
			.status(500)
			.json({ message: "Errore interno server durante la creazione" });
	}
});

module.exports = router;

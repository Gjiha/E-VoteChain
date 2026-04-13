const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth.js");
const { addKV, getKV } = require("../mapping/mapping.js");

// Configurazione Multer per mantenere il file nella RAM (Buffer) senza scriverlo su disco
const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: { fileSize: 50 * 1024 * 1024 }, // Limite opzionale di 50MB per il file PDF
	fileFilter: (req, file, cb) => {
		// Controlla se il mimetype corrisponde a un PDF
		if (file.mimetype === "application/pdf") {
			cb(null, true); // Accetta il file
		} else {
			// Rifiuta il file generando un errore
			cb(new Error("TIPO_FILE_NON_VALIDO"), false);
		}
	},
});

/**
 * ROTTA POST: /api/v1/uploadVerbale
 * Riceve un file PDF e un meetingId, lo converte in Base64 e lo salva sulla Blockchain.
 */
router.post(
	"/uploadVerbale",
	verifyToken, // Verifica il JWT
	isCeoOrAdmin, // Verifica che l'utente sia CEO
	upload.single("verbale"), // Campo del form: "verbale"
	async (req, res) => {
		try {
			// 1. Recupero parametri dalla richiesta
			const { meetingId } = req.body;

			if (!req.file) {
				return res
					.status(400)
					.json({ message: "File PDF mancante nel caricamento." });
			}
			if (!meetingId) {
				return res
					.status(400)
					.json({ message: "ID riunione (chiave) mancante." });
			}

			// 2. Conversione del buffer binario del file in stringa Base64
			const base64String = req.file.buffer.toString("base64");

			// 3. Salvataggio sulla blockchain utilizzando la classe "Verbale"
			// La chiave è l'id_reunion, il valore è la stringa Base64
			const bcResponse = await addKV("Verbale", meetingId, base64String);

			res.status(200).json({
				message: "Verbale caricato con successo sulla blockchain",
				class: "Verbale",
				key: meetingId,
				result: bcResponse,
			});
		} catch (err) {
			console.error("Errore durante l'upload su blockchain:", err);
			res.status(500).json({
				message: "Errore durante l'elaborazione del file verbale.",
				error: err.message,
			});
		}
	},
);

/**
 * ROTTA GET: /api/v1/getVerbale/:id_reunion
 * Recupera la stringa Base64 dalla blockchain e restituisce il file PDF in chiaro.
 */
router.get("/getVerbale/:id_reunion", verifyToken, async (req, res) => {
	try {
		const { id_reunion } = req.params;

		if (!id_reunion) {
			return res
				.status(400)
				.json({ message: "ID riunione non specificato." });
		}

		// 1. Recupero della risposta dalla blockchain
		const result = await getKV("Verbale", id_reunion);

		if (!result) {
			return res.status(404).json({ message: "Verbale non trovato." });
		}

		// 2. ESTRAZIONE DELLA STRINGA BASE64
		// Se 'result' è un oggetto, cerchiamo la proprietà che contiene i dati (spesso 'value' o 'v')
		// Se è già una stringa, la usiamo direttamente.
		let base64Data =
			typeof result === "string"
				? result
				: result.value || result.v || result;

		// Controllo di sicurezza: se dopo l'estrazione è ancora un oggetto, il Buffer fallirà
		if (typeof base64Data !== "string") {
			console.error(
				"Dati ricevuti non validi (non è una stringa):",
				base64Data,
			);
			return res.status(500).json({
				message:
					"I dati salvati sulla blockchain non sono in un formato stringa valido.",
			});
		}

		// 3. Conversione in Buffer
		const fileBuffer = Buffer.from(base64Data, "base64");

		// 4. Invio del PDF
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`inline; filename=verbale_${id_reunion}.pdf`,
		);
		res.send(fileBuffer);
	} catch (err) {
		console.error("Errore durante il recupero del verbale:", err);
		res.status(500).json({
			message: "Errore tecnico durante il recupero del file.",
			error: err.message,
		});
	}
});
module.exports = router;

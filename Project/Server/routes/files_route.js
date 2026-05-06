const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken, isCeoOrAdmin } = require("../middleware/auth_middle.js");
const { addKV, getKV } = require("../mapping/mapping.js");

const Logger = require("../utils/logger_utils.js");

const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: { fileSize: 50 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype === "application/pdf") {
			cb(null, true);
		} else {
			cb(new Error("TIPO_FILE_NON_VALIDO"), false);
		}
	},
});

router.post(
	"/uploadVerbale",
	verifyToken,
	isCeoOrAdmin,
	upload.single("verbale"),
	async (req, res) => {
		try {
			const { meetingId } = req.body;

			if (!req.file) {
				await Logger.alert(
					req,
					400,
					"Upload verbale fallito: file PDF mancante.",
				);
				return res
					.status(400)
					.json({ message: "File PDF mancante nel caricamento." });
			}
			if (!meetingId) {
				await Logger.alert(
					req,
					400,
					"Upload verbale fallito: meetingId mancante.",
				);
				return res
					.status(400)
					.json({ message: "ID riunione (chiave) mancante." });
			}

			const base64String = req.file.buffer.toString("base64");
			const bcResponse = await addKV("Verbale", meetingId, base64String);

			await Logger.signal(
				req,
				200,
				`Verbale caricato con successo sulla blockchain per meetingId: ${meetingId}. Dimensione file: ${req.file.size} bytes.`,
			);
			res.status(200).json({
				message: "Verbale caricato con successo sulla blockchain",
				class: "Verbale",
				key: meetingId,
				result: bcResponse,
			});
		} catch (err) {
			await Logger.alert(
				req,
				500,
				`Errore durante l'upload del verbale: ${err.message}`,
			);
			res.status(500).json({
				message: "Errore durante l'elaborazione del file verbale.",
				error: err.message,
			});
		}
	},
);

router.get("/getVerbale/:id_reunion", verifyToken, async (req, res) => {
	try {
		const { id_reunion } = req.params;

		if (!id_reunion) {
			await Logger.alert(
				req,
				400,
				"Recupero verbale fallito: id_reunion non specificato.",
			);
			return res
				.status(400)
				.json({ message: "ID riunione non specificato." });
		}

		const result = await getKV("Verbale", id_reunion);

		if (!result) {
			await Logger.alert(
				req,
				404,
				`Verbale non trovato sulla blockchain per id_reunion: ${id_reunion}`,
			);
			return res.status(404).json({ message: "Verbale non trovato." });
		}

		let base64Data =
			typeof result === "string"
				? result
				: result.value || result.v || result;

		if (typeof base64Data !== "string") {
			await Logger.alert(
				req,
				500,
				`Dati verbale non validi (non stringa) per id_reunion: ${id_reunion}. Tipo ricevuto: ${typeof base64Data}`,
			);
			return res.status(500).json({
				message:
					"I dati salvati sulla blockchain non sono in un formato stringa valido.",
			});
		}

		const fileBuffer = Buffer.from(base64Data, "base64");

		await Logger.signal(
			req,
			200,
			`Verbale recuperato e inviato con successo per id_reunion: ${id_reunion}. Dimensione buffer: ${fileBuffer.length} bytes.`,
		);
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`inline; filename=verbale_${id_reunion}.pdf`,
		);
		res.send(fileBuffer);
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore durante il recupero del verbale: ${err.message}`,
		);
		res.status(500).json({
			message: "Errore tecnico durante il recupero del file.",
			error: err.message,
		});
	}
});

module.exports = router;

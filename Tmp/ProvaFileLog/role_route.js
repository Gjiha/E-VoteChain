const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth_middle.js");

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

router.get("/check-role", verifyToken, (req, res) => {
	try {
		if (!req.user || !req.user.classe) {
			console.log(
				formatLog(
					req,
					200,
					"Verifica ruolo: dati utente o classe mancanti nel token. Restituito isCEO: false.",
				),
			);
			return res.status(200).json({ isCEO: false });
		}

		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		console.log(
			formatLog(
				req,
				200,
				`Verifica ruolo completata per wallet: ${req.user.id_wallet}. Ruolo: ${userRole}, isCEO: ${isCEO}.`,
			),
		);
		return res.status(200).json({
			message: "Ruolo verificato con successo",
			isCEO: isCEO,
		});
	} catch (err) {
		console.error(
			formatLog(
				req,
				500,
				`Errore durante la verifica del ruolo: ${err.message}`,
			),
		);
		return res.status(500).json({ message: "Errore interno del server" });
	}
});

module.exports = router;

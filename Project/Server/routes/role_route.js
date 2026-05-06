const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth_middle.js");

const Logger = require("../utils/logger_utils.js");

router.get("/check-role", verifyToken, async (req, res) => {
	try {
		if (!req.user || !req.user.classe) {
			await Logger.signal(
				req,
				200,
				"Verifica ruolo: dati utente o classe mancanti nel token. Restituito isCEO: false.",
			);
			return res.status(200).json({ isCEO: false });
		}

		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		await Logger.signal(
			req,
			200,
			`Verifica ruolo completata per wallet: ${req.user.id_wallet}. Ruolo: ${userRole}, isCEO: ${isCEO}.`,
		);
		return res.status(200).json({
			message: "Ruolo verificato con successo",
			isCEO: isCEO,
		});
	} catch (err) {
		await Logger.alert(
			req,
			500,
			`Errore durante la verifica del ruolo: ${err.message}`,
		);
		return res.status(500).json({ message: "Errore interno del server" });
	}
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.js");

const LOCAL_API_URL = "http://localhost:30000/api/v1";

router.get("/check-role", verifyToken, (req, res) => {
	try {
		// Il middleware verifyToken ha già validato il JWT e salvato i dati in req.user
		if (!req.user || !req.user.classe) {
			return res.status(200).json({ isCEO: false });
		}

		// Eseguiamo il controllo robusto LATO SERVER
		const userRole = String(req.user.classe).toUpperCase().trim();
		const isCEO = userRole === "CEO";

		// Restituiamo un semplice booleano al frontend
		return res.status(200).json({
			message: "Ruolo verificato con successo",
			isCEO: isCEO,
		});
	} catch (err) {
		console.error("Errore durante la verifica del ruolo:", err);
		return res.status(500).json({ message: "Errore interno del server" });
	}
});

module.exports = router;

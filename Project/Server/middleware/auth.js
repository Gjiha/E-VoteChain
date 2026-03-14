const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware 1: Verifica la validità del JWT
 * Da usare su TUTTE le rotte protette
 */
const verifyToken = (req, res, next) => {
	// Cerca il token nell'header Authorization (formato "Bearer <token>")
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return res
			.status(401)
			.json({ message: "Token mancante. Accesso negato." });
	}

	try {
		// Verifica e decodifica il token
		const decoded = jwt.verify(token, JWT_SECRET);

		// Salva i dati dell'utente nella request per usarli nei middleware successivi
		req.user = decoded; // conterra' { id_wallet, classe, iat, exp }

		next();
	} catch (err) {
		return res.status(403).json({ message: "Token non valido o scaduto." });
	}
};

/**
 * Middleware 2: Verifica che l'utente abbia il ruolo di CEO/Admin
 * Da usare SOLO sulle rotte dedicate alla dashboard CEO
 */
const isCeoOrAdmin = (req, res, next) => {
	// Assicuriamoci che verifyToken sia stato eseguito prima
	if (!req.user || !req.user.classe) {
		return res
			.status(403)
			.json({ message: "Dati utente o ruolo mancanti nel token." });
	}

	// Applichiamo la stessa identica logica robusta che avevi nel frontend
	const roleString = String(req.user.classe).toUpperCase().trim();

	const isCEO = roleString === "CEO";

	if (isCEO) {
		// L'utente ha i permessi, procedi alla rotta
		next();
	} else {
		// L'utente è loggato (token valido) ma non è CEO
		return res.status(403).json({
			message:
				"Accesso negato. Privilegi insufficienti per questa operazione.",
		});
	}
};

module.exports = {
	verifyToken,
	isCeoOrAdmin,
};

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const { formatLog } = require("../utils/logger_utils.js");

/**
 * Middleware 1: Verifica la validità del JWT
 * Da usare su TUTTE le rotte protette
 */
const verifyToken = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		console.log(formatLog(req, 401, "Token mancante. Accesso negato."));
		return res
			.status(401)
			.json({ message: "Token mancante. Accesso negato." });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded; // conterra' { id_wallet, classe, iat, exp }
		console.log(
			formatLog(
				req,
				200,
				`Token valido per wallet: ${decoded.id_wallet}`,
			),
		);
		next();
	} catch (err) {
		console.log(
			formatLog(
				req,
				403,
				`Token non valido o scaduto. Dettaglio: ${err.message}`,
			),
		);
		return res.status(403).json({ message: "Token non valido o scaduto." });
	}
};

/**
 * Middleware 2: Verifica che l'utente abbia il ruolo di CEO/Admin
 * Da usare SOLO sulle rotte dedicate alla dashboard CEO
 */
const isCeoOrAdmin = (req, res, next) => {
	if (!req.user || !req.user.classe) {
		console.log(
			formatLog(req, 403, "Dati utente o ruolo mancanti nel token."),
		);
		return res
			.status(403)
			.json({ message: "Dati utente o ruolo mancanti nel token." });
	}

	const roleString = String(req.user.classe).toUpperCase().trim();
	const isCEO = roleString === "CEO";

	if (isCEO) {
		console.log(
			formatLog(
				req,
				200,
				`Accesso CEO consentito per wallet: ${req.user.id_wallet}`,
			),
		);
		next();
	} else {
		console.log(
			formatLog(
				req,
				403,
				`Accesso negato. Ruolo insufficiente: ${roleString} (wallet: ${req.user.id_wallet})`,
			),
		);
		return res.status(403).json({
			message:
				"Accesso negato. Privilegi insufficienti per questa operazione.",
		});
	}
};

// =========================================
// PRE-MIDDLEWARE: Verifica rapida del Token
// =========================================
const quickTokenCheck = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const tokenFromHeader = authHeader && authHeader.split(" ")[1];

	if (tokenFromHeader) {
		try {
			const decoded = jwt.verify(tokenFromHeader, JWT_SECRET);
			console.log(
				formatLog(
					req,
					200,
					`Token verificato con successo (bypass blockchain) per wallet: ${decoded.id_wallet}`,
				),
			);
			return res
				.status(200)
				.json({ message: "Token valido, accesso consentito." });
		} catch (jwtError) {
			console.log(
				formatLog(
					req,
					401,
					`Token scaduto o non valido. Dettaglio: ${jwtError.message}`,
				),
			);
			return res
				.status(401)
				.json({ message: "Token scaduto o non valido." });
		}
	}

	// Nessun token presente: si prosegue con fetchUserFromBlockchain
	console.log(
		formatLog(
			req,
			200,
			"Nessun token fornito. Proseguimento verso autenticazione blockchain.",
		),
	);
	next();
};

module.exports = {
	verifyToken,
	isCeoOrAdmin,
	quickTokenCheck,
};

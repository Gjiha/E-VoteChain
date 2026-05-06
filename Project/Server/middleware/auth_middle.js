const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const Logger = require("../utils/logger_utils.js");

const verifyToken = async (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		await Logger.alert(req, 401, "Token mancante. Accesso negato.");
		return res
			.status(401)
			.json({ message: "Token mancante. Accesso negato." });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		await Logger.alert(
			req,
			403,
			`Token non valido o scaduto. Dettaglio: ${err.message}`,
		);
		return res.status(403).json({ message: "Token non valido o scaduto." });
	}
};

const isCeoOrAdmin = async (req, res, next) => {
	if (!req.user || !req.user.classe) {
		await Logger.alert(req, 403, "Dati utente o ruolo mancanti nel token.");
		return res
			.status(403)
			.json({ message: "Dati utente o ruolo mancanti nel token." });
	}

	const roleString = String(req.user.classe).toUpperCase().trim();
	const isCEO = roleString === "CEO";

	if (isCEO) {
		next();
	} else {
		await Logger.alert(
			req,
			403,
			`Accesso negato. Ruolo insufficiente: ${roleString} (wallet: ${req.user.id_wallet})`,
		);
		return res.status(403).json({
			message:
				"Accesso negato. Privilegi insufficienti per questa operazione.",
		});
	}
};

const quickTokenCheck = async (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const tokenFromHeader = authHeader && authHeader.split(" ")[1];

	if (tokenFromHeader) {
		try {
			const decoded = jwt.verify(tokenFromHeader, JWT_SECRET);
			await Logger.signal(
				req,
				200,
				`Token verificato con successo (bypass blockchain) per wallet: ${decoded.id_wallet}`,
			);
			return res
				.status(200)
				.json({ message: "Token valido, accesso consentito." });
		} catch (jwtError) {
			await Logger.alert(
				req,
				401,
				`Token scaduto o non valido. Dettaglio: ${jwtError.message}`,
			);
			return res
				.status(401)
				.json({ message: "Token scaduto o non valido." });
		}
	}

	await Logger.signal(
		req,
		200,
		"Nessun token fornito. Proseguimento verso autenticazione blockchain.",
	);
	next();
};

module.exports = {
	verifyToken,
	isCeoOrAdmin,
	quickTokenCheck,
};

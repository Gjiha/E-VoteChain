const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const Logger = require("../utils/logger_utils.js");

const verifyToken = async (req, res, next) => {
	const token = req.cookies.jwt;

	if (!token) {
		await Logger.alert(req, 401, "Token mancante. Accesso negato.");
		return res.status(401).json({ message: "Accesso negato." });
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

		res.clearCookie("jwt");
		return res.status(403).json({ message: "Accesso negato." });
	}
};

const isCeo = async (req, res, next) => {
	if (!req.user || !req.user.classe) {
		await Logger.alert(req, 403, "Dati utente o ruolo mancanti nel token.");
		return res.status(403).json({ message: "Accesso negato." });
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
			message: "Accesso negato.",
		});
	}
};

const isAdmin = async (req, res, next) => {
	if (!req.user || !req.user.classe) {
		await Logger.alert(req, 403, "Dati utente o ruolo mancanti nel token.");
		return res.status(403).json({ message: "Accesso negato." });
	}

	const roleString = String(req.user.classe).toUpperCase().trim();
	const isADMIN = roleString === "ADMIN";

	if (isADMIN) {
		next();
	} else {
		await Logger.alert(
			req,
			403,
			`Accesso negato. Ruolo insufficiente: ${roleString} (wallet: ${req.user.id_wallet})`,
		);
		return res.status(403).json({
			message: "Accesso negato.",
		});
	}
};

const quickTokenCheck = async (req, res, next) => {
	const tokenFromCookie = req.cookies.jwt;

	if (tokenFromCookie) {
		try {
			const decoded = jwt.verify(tokenFromCookie, JWT_SECRET);
			await Logger.signal(
				req,
				200,
				`Token verificato con successo (bypass blockchain) per wallet: ${decoded.id_wallet}`,
			);

			// MODIFICA QUI: Ora restituiamo anche i dati estratti dal token
			return res.status(200).json({
				message: "Accesso consentito.",
				data: decoded, // Questo contiene id_wallet, classe ed email
			});
		} catch (jwtError) {
			await Logger.alert(
				req,
				401,
				`Token scaduto o non valido. Dettaglio: ${jwtError.message}`,
			);
			res.clearCookie("jwt");
			return res.status(401).json({ message: "Accesso Negato." });
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
	isCeo,
	isAdmin,
	quickTokenCheck,
};

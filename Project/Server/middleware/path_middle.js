// middleware/page_auth_middle.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const Logger = require("../utils/logger_utils.js"); // 1. Importa il Logger

const protectPages = async (req, res, next) => {
	// 2. Aggiunto 'async'
	const url = req.path.toLowerCase();

	// 1. Elenco delle pagine esclusive per il CEO
	const ceoPages = [
		"/ceo_dashboard.html",
		"/create_meeting.html",
		"/manage_users.html",
		"/add_user.html",
	];

	// 2. Elenco delle pagine accessibili ai Membri Autenticati (e al CEO)
	const memberPages = [
		"/settings.html",
		"/audit_report.html",
		"/member_dashboard.html",
		"/meeting.html",
		"/voting_room.html",
		"/results.html",
	];

	const isCeoPage = ceoPages.some((page) => url.includes(page));
	const isMemberPage = memberPages.some((page) => url.includes(page));

	// Se la richiesta riguarda una pagina protetta
	if (isCeoPage || isMemberPage) {
		const token = req.cookies.jwt;

		// Se il token non esiste, reindirizza immediatamente al login a livello server
		if (!token) {
			return res.redirect("/login.html");
		}

		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			const ruolo = String(decoded.classe || "")
				.toUpperCase()
				.trim();
			const isCEO = ruolo === "CEO";

			// Se un utente standard (Membro) prova a forzare una pagina da CEO
			if (isCeoPage && !isCEO) {
				// 3. Registrazione dell'alert di sicurezza
				await Logger.alert(
					req,
					403,
					`Tentativo di accesso non autorizzato intercettato. L'utente ${decoded.id_wallet || decoded.email} (Ruolo: ${ruolo}) ha provato ad accedere alla rotta CEO: ${url}`,
				);

				return res.redirect("/member_dashboard.html");
			}

			// Se l'autenticazione e i ruoli sono validi, proseguiamo verso il file statico
			req.user = decoded;
			return next();
		} catch (err) {
			// Token scaduto o corrotto: ripuliamo il cookie fallato e forziamo il login
			// Opzionale: puoi aggiungere un Logger.alert anche qui se vuoi tracciare i token corrotti
			res.clearCookie("jwt", {
				httpOnly: true,
				secure: false,
				sameSite: "lax",
			});
			return res.redirect("/login.html");
		}
	}

	// Se la pagina è pubblica (index.html, login.html) o è una rotta API, lascia passare
	next();
};

module.exports = protectPages;

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const Logger = require("../utils/logger_utils.js");

const protectPages = async (req, res, next) => {
	const url = req.path.toLowerCase();

	const ceoPages = [
		"/ceo_dashboard.html",
		"/create_meeting.html",
		"/manage_users.html",
		"/add_user.html",
	];

	const memberPages = [
		"/settings.html",
		"/audit_report.html",
		"/member_dashboard.html",
		"/meeting.html",
		"/voting_room.html",
		"/results.html",
	];

	// --- MODIFICA QUI: Aggiunta lista pagine ADMIN ---
	const adminPages = ["/logvisual.html"];

	const isCeoPage = ceoPages.some((page) => url.includes(page));
	const isMemberPage = memberPages.some((page) => url.includes(page));
	const isAdminPage = adminPages.some((page) => url.includes(page)); // Controllo pagina admin

	// Se la richiesta riguarda una pagina protetta (qualsiasi ruolo)
	if (isCeoPage || isMemberPage || isAdminPage) {
		const token = req.cookies.jwt;

		if (!token) {
			return res.redirect("/login.html");
		}

		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			const ruolo = String(decoded.classe || "")
				.toUpperCase()
				.trim();

			const isCEO = ruolo === "CEO";
			const isAdmin = ruolo === "ADMIN"; // Controllo ruolo admin

			// --- MODIFICA QUI: Controllo accesso esclusivo per ADMIN ---
			if (isAdminPage && !isAdmin) {
				await Logger.alert(
					req,
					403,
					`Tentativo di accesso non autorizzato intercettato. L'utente ${decoded.id_wallet || decoded.email} (Ruolo: ${ruolo}) ha provato ad accedere alla rotta ADMIN: ${url}`,
				);
				// Reindirizziamo chi non è admin a una dashboard di base
				return res.redirect(
					isCEO ? "/ceo_dashboard.html" : "/member_dashboard.html",
				);
			}

			// Controllo accesso esclusivo per CEO
			if (isCeoPage && !isCEO) {
				await Logger.alert(
					req,
					403,
					`Tentativo di accesso non autorizzato intercettato. L'utente ${decoded.id_wallet || decoded.email} (Ruolo: ${ruolo}) ha provato ad accedere alla rotta CEO: ${url}`,
				);

				return res.redirect("/member_dashboard.html");
			}

			// Se passa tutti i controlli, l'utente è autorizzato
			req.user = decoded;
			return next();
		} catch (err) {
			res.clearCookie("jwt", {
				httpOnly: true,
				secure: false,
				sameSite: "lax",
			});
			return res.redirect("/login.html");
		}
	}

	// Se la pagina è pubblica, lascia passare
	next();
};

module.exports = protectPages;

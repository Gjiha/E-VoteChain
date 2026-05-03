const { getKV } = require("../mapping/mapping.js");

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

const fetchUserFromBlockchain = async (req, res, next) => {
	try {
		const { id_wallet, email } = req.body;
		let targetId = id_wallet;

		// LOGICA DI RISOLUZIONE IDENTITÀ
		// 1. Se l'ID manca ma abbiamo l'email, risolviamo l'ID tramite la tabella "User/table"
		if (!targetId && email) {
			const tableResponse = await getKV("User", "table");
			let emailTable = tableResponse?.value;

			if (typeof emailTable === "string") {
				try {
					emailTable = JSON.parse(emailTable);
				} catch (e) {
					console.error(formatLog(req, 500, `Errore parsing tabella utenti blockchain: ${e.message}`));
					emailTable = {};
				}
			}

			targetId = emailTable ? emailTable[email] : null;

			if (!targetId) {
				console.log(formatLog(req, 404, `Email non registrata nella blockchain: ${email}`));
				return res.status(404).json({
					message: `L'email ${email} non è registrata nel sistema blockchain.`,
				});
			}

			console.log(formatLog(req, 200, `Risoluzione identità riuscita: email ${email} → id_wallet ${targetId}`));
		}

		// 2. Controllo validità dell'ID finale
		if (!targetId) {
			console.log(formatLog(req, 400, "Identificativo mancante: né id_wallet né email forniti."));
			return res.status(400).json({
				message:
					"Identificativo mancante: fornire id_wallet oppure email.",
			});
		}

		// 3. RECUPERO DATI UTENTE (Query Diretta)
		const response = await getKV("User", targetId);
		let userData = response?.value;

		if (!userData) {
			console.log(formatLog(req, 404, `Nessun dato utente trovato sulla blockchain per id_wallet: ${targetId}`));
			return res.status(404).json({
				message:
					"Dati utente non trovati sulla blockchain per l'ID risolto.",
			});
		}

		if (typeof userData === "string") {
			try {
				userData = JSON.parse(userData);
			} catch (e) {
				console.error(formatLog(req, 500, `Errore parsing dati utente dalla blockchain per id_wallet: ${targetId}. Dettaglio: ${e.message}`));
				return res.status(500).json({
					message:
						"Errore nell'integrità dei dati salvati sulla blockchain.",
				});
			}
		}

		console.log(formatLog(req, 200, `Dati utente recuperati con successo dalla blockchain per id_wallet: ${targetId}`));
		req.dbUser = userData;
		next();
	} catch (err) {
		console.error(formatLog(req, 500, `Errore middleware Blockchain: ${err.message}`));
		res.status(500).json({
			message: "Errore tecnico durante il recupero dei dati utente.",
		});
	}
};

module.exports = fetchUserFromBlockchain;

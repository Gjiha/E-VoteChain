const { getKV } = require("../mapping/mapping.js");

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
					console.error(
						"Errore parsing tabella utenti blockchain:",
						e,
					);
					emailTable = {};
				}
			}

			// Cerchiamo l'id_wallet corrispondente all'email fornita
			targetId = emailTable ? emailTable[email] : null;

			if (!targetId) {
				return res.status(404).json({
					message: `L'email ${email} non è registrata nel sistema blockchain.`,
				});
			}
		}

		// 2. Controllo validità dell'ID finale
		if (!targetId) {
			return res.status(400).json({
				message:
					"Identificativo mancante: fornire id_wallet oppure email.",
			});
		}

		// 3. RECUPERO DATI UTENTE (Query Diretta)
		const response = await getKV("User", targetId);
		let userData = response?.value;

		if (!userData) {
			return res.status(404).json({
				message:
					"Dati utente non trovati sulla blockchain per l'ID risolto.",
			});
		}

		// Parsing finale del JSON utente
		if (typeof userData === "string") {
			try {
				userData = JSON.parse(userData);
			} catch (e) {
				return res.status(500).json({
					message:
						"Errore nell'integrità dei dati salvati sulla blockchain.",
				});
			}
		}

		// Attacchiamo l'utente alla richiesta per i passaggi successivi (es. login_route.js)
		req.dbUser = userData;
		next();
	} catch (err) {
		console.error("Errore middleware Blockchain:", err);
		res.status(500).json({
			message: "Errore tecnico durante il recupero dei dati utente.",
		});
	}
};

module.exports = fetchUserFromBlockchain;

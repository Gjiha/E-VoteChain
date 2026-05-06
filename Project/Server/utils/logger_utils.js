const { addKV } = require("../mapping/mapping.js");

class Logger {
	/**
	 * Metodo interno per formattare il log e inviarlo alla blockchain
	 */
	static async _sendLog(type, req, statusCode, comment) {
		// Estrazione dati dalla request[cite: 2]
		const timestamp = new Date().toISOString();
		const ipSorgente = req.ip || req.socket?.remoteAddress || "Unknown";
		const ipDestinazione = req.socket?.localAddress || "Unknown";
		const actionRoute = `${req.method} ${req.originalUrl || req.url}`;

		// Formattazione stringa richiesta: [[timestamp][ip-sorgente][ip-destinazione][action/route][codice][comment]]
		const logBody = `[[${timestamp}][${ipSorgente}][${ipDestinazione}][${actionRoute}][${statusCode}][${comment}]]`;

		try {
			// Salvataggio su blockchain (Classe: Logger, Key: Alert/Signal, Value: logBody)
			await addKV("Logger", type, logBody);

			// Manteniamo anche un log in console per il debug del server locale
			if (type === "Alert") {
				console.error(`[BLOCKCHAIN ALERT SALVATO] ${logBody}`);
			} else {
				console.log(`[BLOCKCHAIN SIGNAL SALVATO] ${logBody}`);
			}
		} catch (err) {
			console.error(
				`[LOGGER ERROR] Impossibile salvare log su blockchain:`,
				err,
			);
		}
	}

	/**
	 * Registra un log di ERRORE (Key: Alert)
	 */
	static async alert(req, statusCode, comment) {
		return await this._sendLog("Alert", req, statusCode, comment);
	}

	/**
	 * Registra un log NORMALE (Key: Signal)
	 */
	static async signal(req, statusCode, comment) {
		return await this._sendLog("Signal", req, statusCode, comment);
	}
}

module.exports = Logger;

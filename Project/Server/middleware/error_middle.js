// Server/middleware/error_middleware.js
const Logger = require("../utils/logger_utils.js");

const errorHandler = async (err, req, res, next) => {
	// 1. Intercetta gli errori di parsing JSON (es. body malformato)
	if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
		const errorMessage = `SyntaxError nel JSON: ${err.message}`;

		// Registra l'Alert sulla Blockchain
		await Logger.alert(req, 400, errorMessage);

		return res.status(400).json({
			status: "error",
			message:
				"Payload JSON malformato. Verifica la sintassi della richiesta.",
		});
	}

	// 2. Gestione di tutti gli altri errori generici (500 o imprevisti)
	const statusCode = err.status || 500;

	// Registra l'Alert sulla Blockchain con i dettagli tecnici completi
	await Logger.alert(
		req,
		statusCode,
		`Errore Server: ${err.message || "Errore sconosciuto"}`,
	);

	// Nasconde i dettagli tecnici al client se in produzione
	const clientMessage =
		process.env.NODE_ENV === "production"
			? "Si è verificato un errore interno del server."
			: err.message;

	return res.status(statusCode).json({
		status: "error",
		message: clientMessage,
	});
};

module.exports = errorHandler;

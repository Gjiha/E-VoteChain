const express = require("express");
const router = express.Router();
const mapping = require("../mapping/mapping");

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

router.get("/getKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			console.log(formatLog(req, 400, "getKV fallita: parametri 'class' o 'key' mancanti."));
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getKV(cls, key);

		console.log(formatLog(req, 200, `getKV eseguita con successo. Classe: ${cls}, Chiave: ${key}.`));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante getKV: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.post("/addKv", async (req, res) => {
	try {
		const cls = req.body.class;
		const key = req.body.key;
		const value = req.body.value;

		if (!cls || !key || !value) {
			console.log(formatLog(req, 400, "addKV fallita: parametri 'class', 'key' o 'value' mancanti."));
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.addKV(cls, key, value);

		console.log(formatLog(req, 200, `addKV eseguita con successo. Classe: ${cls}, Chiave: ${key}.`));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante addKV: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/delKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			console.log(formatLog(req, 400, "delKV fallita: parametri 'class' o 'key' mancanti."));
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.delKV(cls, key);

		console.log(formatLog(req, 200, `delKV eseguita con successo. Classe: ${cls}, Chiave: ${key}.`));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante delKV: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/getHistoryKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			console.log(formatLog(req, 400, "getHistoryKV fallita: parametri 'class' o 'key' mancanti."));
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getHistoryKV(cls, key);

		console.log(formatLog(req, 200, `getHistoryKV eseguita con successo. Classe: ${cls}, Chiave: ${key}.`));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante getHistoryKV: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/getClasses", async (req, res) => {
	try {
		const result = await mapping.getClasses();

		console.log(formatLog(req, 200, "getClasses eseguita con successo."));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante getClasses: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/getNumKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			console.log(formatLog(req, 400, "getNumKV fallita: parametri 'class' o 'key' mancanti."));
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getNumKV(cls, key);

		console.log(formatLog(req, 200, `getNumKV eseguita con successo. Classe: ${cls}, Chiave: ${key}.`));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante getNumKV: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/getKeysCopy", async (req, res) => {
	try {
		const cls = req.query.class;

		if (!cls) {
			console.log(formatLog(req, 400, "getKeysCopy fallita: parametro 'class' mancante."));
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getKeysCopy(cls);

		console.log(formatLog(req, 200, `getKeysCopy eseguita con successo. Classe: ${cls}.`));
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		console.error(formatLog(req, 500, `Errore server durante getKeysCopy: ${err.message}`));
		res.status(500).json({
			message: "Errore server",
		});
	}
});

module.exports = router;

const express = require("express");
const router = express.Router();
const mapping = require("./mapping");

router.get("/api/v1/getKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getKV(cls, key);

		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.post("/api/v1/addKv", async (req, res) => {
	try {
		const cls = req.body.class;
		const key = req.body.key;
		const value = req.body.value;

		if (!cls || !key || !value) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.addKV(cls, key, value);
		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/api/v1/delKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.delKV(cls, key);

		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/api/v1/getHistoryKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getHistoryKV(cls, key);

		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/api/v1/getClasses", async (req, res) => {
	try {
		const cls = req.query.class;

		const result = await mapping.getClasses();

		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/api/v1/getNumKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getNumKV(cls, key);

		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

router.get("/api/v1/getKeysCopy", async (req, res) => {
	try {
		const cls = req.query.class;

		if (!cls) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await mapping.getKeysCopy(cls);

		res.status(200).json({
			message: "ok",
			data: result,
		});
	} catch (err) {
		res.status(500).json({
			message: "Errore server",
		});
	}
});

module.exports = router;

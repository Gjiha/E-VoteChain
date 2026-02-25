const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json()); // per leggere json
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "uploads/verbali/");
	},
	filename: function (req, file, cb) {
		const uniqueName = Date.now() + "_" + file.originalname;
		cb(null, uniqueName);
	},
});
const upload = multer({ storage: storage });

app.post("/api/v1/uploadVerbale", upload.single("verbale"), (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: "File mancante" });
		}

		const filePath = `/uploads/verbali/${req.file.filename}`;

		res.status(200).json({
			message: "Upload completato",
			path: filePath,
		});
	} catch (err) {
		res.status(500).json({ message: "Errore upload" });
	}
});

const arcieri = require("./arcieriMerda");

app.get("/api/v1/getKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await arcieri.getKV(cls, key);

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

app.post("/api/v1/addKv", async (req, res) => {
	try {
		const cls = req.body.class;
		const key = req.body.key;
		const value = req.body.value;

		if (!cls || !key || !value) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await arcieri.addKV(cls, key, value);

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

app.get("/api/v1/delKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await arcieri.delKV(cls, key);

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

app.get("/api/v1/getHistoryKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await arcieri.getHistoryKV(cls, key);

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

app.get("/api/v1/getClasses", async (req, res) => {
	try {
		const cls = req.query.class;

		const result = await arcieri.getClasses();

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

app.get("/api/v1/getNumKv", async (req, res) => {
	try {
		const cls = req.query.class;
		const key = req.query.key?.split(",");

		if (!cls || !key) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await arcieri.getNumKV(cls, key);

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

app.get("/api/v1/getKeysCopy", async (req, res) => {
	try {
		const cls = req.query.class;

		if (!cls) {
			return res.status(400).json({
				message: "Parametri mancanti",
			});
		}

		const result = await arcieri.getKeysCopy(cls);

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

const PORT = 30000;
app.listen(PORT, () => {
	console.log(`Porta in ascolto sulla porta ${PORT}`);
});

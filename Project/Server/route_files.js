const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

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

router.post("/api/v1/uploadVerbale", upload.single("verbale"), (req, res) => {
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

module.exports = router;

const express = require("express");
const cors = require("cors");
const path = require("path");

const pool = require("./database");
const mappingRoutes = require("./route_mapping");
const fileRoutes = require("./route_files");

const app = express();

app.use(cors());
app.use(express.json()); // per leggere json
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(mappingRoutes);
app.use(fileRoutes);

const PORT = 30000;
app.listen(PORT, () => {
	console.log(`Porta in ascolto sulla porta ${PORT}`);
});

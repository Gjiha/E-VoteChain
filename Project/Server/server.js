require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const dbRoutes = require("./routes/route_login.js");
const mappingRoutes = require("./routes/route_mapping");
const fileRoutes = require("./routes/route_files.js");
const pool = require("./database/database.js");

const app = express();

app.use(cors());
app.use(express.json()); // per leggere json
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/v1/", mappingRoutes);
app.use("/api/v1/", fileRoutes);
app.use("/api/v1/", dbRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => {
	console.log(`Porta in ascolto sulla porta ${PORT}`);
});

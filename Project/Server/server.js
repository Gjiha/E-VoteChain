require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const dbRoutes = require("./routes/login_route.js");
// const mappingRoutes = require("./routes/mapping_route.js");
const fileRoutes = require("./routes/files_route.js");
const meetingRoutes = require("./routes/meetings_route.js");
const usersRoutes = require("./routes/users_route.js");
const roleRoutes = require("./routes/role_route.js");
const votationRoute = require("./routes/votation_route.js");
const pool = require("./database/database.js");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/v1/", usersRoutes);
app.use("/api/v1/", meetingRoutes);
// app.use("/api/v1/", mappingRoutes);
app.use("/api/v1/", fileRoutes);
app.use("/api/v1/", dbRoutes);
app.use("/api/v1/", roleRoutes);
app.use("/api/v1/", votationRoute);

const PORT = process.env.PORT;
app.listen(PORT, () => {
	console.log(`Porta in ascolto sulla porta ${PORT}`);
});

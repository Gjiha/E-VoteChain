require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const dbRoutes = require("./routes/login_route.js");
const fileRoutes = require("./routes/files_route.js");
const meetingRoutes = require("./routes/meetings_route.js");
const usersRoutes = require("./routes/users_route.js");
const roleRoutes = require("./routes/role_route.js");
const votationRoute = require("./routes/votation_route.js");
const loggerRoute = require("./routes/logger_route.js");

const errorHandler = require("./middleware/error_middle.js");

const protectPages = require("./middleware/path_middle.js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/", usersRoutes);
app.use("/api/v1/", meetingRoutes);
app.use("/api/v1/", fileRoutes);
app.use("/api/v1/", dbRoutes);
app.use("/api/v1/", roleRoutes);
app.use("/api/v1/", votationRoute);
//app.use("/api/v1/", loggerRoute); // Da commentare e scommentare quando si vogliono vedere i log

app.use(errorHandler);
app.use(protectPages);

app.use(express.static(path.join(__dirname, "../Public")));

app.use(
	cors({
		origin: "http://0.0.0.0:30000",
		credentials: true, // FONDAMENTALE per ricevere e inviare i cookie
	}),
);

const PORT = process.env.PORT;
app.listen(PORT, "0.0.0.0", () => {
	console.log(`Porta in ascolto sulla porta ${PORT}`);
});

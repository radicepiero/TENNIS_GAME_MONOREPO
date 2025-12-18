const express = require("express");
const http = require("http");
const path = require("path");
const favicon = require("serve-favicon");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv/config");
const { requireAuth, checkUser } = require("./middleware/authMiddleware");
const authRouter = require("./routes/authRoutes");
const viewsRouter = require("./routes/routesRoutes");

//middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.set("view engine", "ejs");

app.locals.apiUrl = process.env.PUBLIC_API || "/api";

app.use(checkUser);

app.get("/", (req, res) => res.render("home"));

app.use(authRouter);
app.use("/", requireAuth, viewsRouter);
//app.use("/", viewsRouter);

const PORT = process.env.PORT || 3000;
http.createServer(app).listen(PORT, "0.0.0.0", () => {
  console.log(`server in ascolto su porta ${PORT}`);
});

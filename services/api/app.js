const express = require("express");
const http = require("http");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv/config");

//middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : ["http://localhost:3000", "http://localhost"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
const { requireAuth, checkUser } = require("./middleware/authMiddleware");
app.use(checkUser);
const apiRouter = require("./routes/api/apisRoutes");

//app.use("/api", requireAuth, apiRouter);
app.use("/api", apiRouter);

const db = require("./models");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const authenticateWithRetry = async ({ retries, delayMs }) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.sequelize.authenticate();
      console.log("Connessione al database riuscita!");
      return;
    } catch (err) {
      lastError = err;
      console.error(
        `Errore di connessione al database (tentativo ${attempt}/${retries}):`,
        err.message || err
      );
      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }
  console.error("Errore di connessione al database:", lastError);
};

authenticateWithRetry({ retries: 20, delayMs: 3000 }).then(() => {
  //db.sequelize.sync({ alter: true });
});

const PORT = process.env.PORT || 9000;
http.createServer(app).listen(PORT, "0.0.0.0", () => {
  console.log(`server API in ascolto su porta ${PORT}`);
});

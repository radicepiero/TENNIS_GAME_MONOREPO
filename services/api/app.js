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

const db = require("./models");

const { requireAuth, checkUser } = require("./middleware/authMiddleware");
app.use(checkUser);
const apiRouter = require("./routes/api/apisRoutes");

// Public auth endpoint (login) - must stay outside global /api requireAuth
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing email or password" });
    }

    const user = await db.User.scope("withPassword").findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: "incorrect email" });
    }

    const bcrypt = require("bcrypt");
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ success: false, message: "incorrect password" });
    }

    return res.status(200).json({ success: true, uuid: user.uuid });
  } catch (e) {
    console.error("Errore login API:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
});

app.use("/api", requireAuth, apiRouter);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureTournamentExtras = async () => {
  try {
    await db.sequelize.query(
      "ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS admin_notes TEXT;"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna tournaments.admin_notes:", e.message || e);
  }
  try {
    await db.sequelize.query(
      "ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS nickname TEXT;"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna tournaments.nickname:", e.message || e);
  }
  try {
    await db.sequelize.query(
      "ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS admin_links JSONB;"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna tournaments.admin_links:", e.message || e);
  }
  try {
    await db.sequelize.query(
      "ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS \"chiusuraPronostici\" TIMESTAMPTZ;"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna tournaments.chiusuraPronostici:", e.message || e);
  }

  try {
    await db.sequelize.query(
      "UPDATE public.tournaments SET nickname = name WHERE nickname IS NULL OR nickname = '';"
    );
  } catch (e) {
    console.error("Errore backfill tournaments.nickname:", e.message || e);
  }
};

const ensurePredictionExtras = async () => {
  try {
    await db.sequelize.query(
      "ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS avatar_url TEXT;"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna predictions.avatar_url:", e.message || e);
  }
};

const authenticateWithRetry = async ({ retries, delayMs }) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.sequelize.authenticate();
      console.log("Connessione al database riuscita!");

      await ensureTournamentExtras();
      await ensurePredictionExtras();
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

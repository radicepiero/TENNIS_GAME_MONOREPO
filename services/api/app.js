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

const { requireAuthAndUser } = require("./middleware/authMiddleware");
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

app.use("/api", requireAuthAndUser, apiRouter);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//parte per aggiungere colonne al db se non esistono
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
      "ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS surface_jsonb JSONB;"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna tournaments.surface_jsonb:", e.message || e);
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

  try {
    await db.sequelize.query(`
      UPDATE public.tournaments
      SET surface_jsonb = jsonb_build_object(
        'material', 'hard',
        'indoor', false,
        'color', NULL
      )
      WHERE surface_jsonb IS NULL;
    `);
  } catch (e) {
    console.error("Errore backfill tournaments.surface_jsonb:", e.message || e);
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE public.tournaments ALTER COLUMN surface_jsonb SET NOT NULL;"
    );
  } catch (e) {
    console.error("Errore alter tournaments.surface_jsonb SET NOT NULL:", e.message || e);
  }

  // Final step: drop legacy column (enable only after testing)
  if (String(process.env.DROP_LEGACY_TOURNAMENT_SURFACE || "").trim() === "1") {
    try {
      await db.sequelize.query(
        "ALTER TABLE public.tournaments DROP COLUMN IF EXISTS surface;"
      );
    } catch (e) {
      console.error("Errore drop colonna tournaments.surface:", e.message || e);
    }
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

const ensureRoomsExtras = async () => {
  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        short_description TEXT,
        long_description TEXT,
        created_by_user_uuid UUID REFERENCES public.users(uuid),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.error("Errore creazione tabella rooms:", e.message || e);
  }

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.room_members (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
        user_uuid UUID NOT NULL REFERENCES public.users(uuid) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'accepted',
        invited_by_user_uuid UUID REFERENCES public.users(uuid),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(room_id, user_uuid)
      );
    `);
  } catch (e) {
    console.error("Errore creazione tabella room_members:", e.message || e);
  }

  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.room_tournaments (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
        tournament_id INTEGER NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(room_id, tournament_id)
      );
    `);
  } catch (e) {
    console.error("Errore creazione tabella room_tournaments:", e.message || e);
  }

  try {
    await db.sequelize.query(
      "ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES public.rooms(id);"
    );
  } catch (e) {
    console.error("Errore aggiunta colonna predictions.room_id:", e.message || e);
  }

  // Unique constraint per stanza: (user_uuid, tournament_id, room_id)
  try {
    await db.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'predictions'
            AND indexname = 'unique_user_tournament'
        ) THEN
          BEGIN
            EXECUTE 'DROP INDEX public.unique_user_tournament';
          EXCEPTION WHEN others THEN
            -- ignore
          END;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'unique_user_tournament'
            AND conrelid = 'public.predictions'::regclass
        ) THEN
          BEGIN
            EXECUTE 'ALTER TABLE public.predictions DROP CONSTRAINT unique_user_tournament';
          EXCEPTION WHEN others THEN
            -- ignore
          END;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'predictions'
            AND indexname = 'unique_user_tournament_room'
        ) THEN
          EXECUTE 'CREATE UNIQUE INDEX unique_user_tournament_room ON public.predictions (user_uuid, tournament_id, room_id)';
        END IF;
      END $$;
    `);
  } catch (e) {
    console.error("Errore gestione indice unico predictions per stanza:", e.message || e);
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
      await ensureRoomsExtras();
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

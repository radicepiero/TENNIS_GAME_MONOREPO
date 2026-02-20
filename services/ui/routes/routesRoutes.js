const router = require("express").Router();
const { requireAdmin } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const avatarStore = require("../services/avatarStore");

router.get("/prediction", (req, res) => {
  res.render("prediction");
});

router.get("/tornei/friends", (req, res) => {
  res.render("tornei", {
    viewMode: "friends",
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/friend/home", (req, res) => {
  res.render("friend-home", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/friend/player", (req, res) => {
  res.render("friend-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: "",
  });
});

router.get("/friend/player/:id", (req, res) => {
  res.render("friend-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: req.params.id,
  });
});

router.get("/admin/player", requireAdmin, (req, res) => {
  res.render("admin-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: "",
  });
});

router.get("/admin/player/:id", requireAdmin, (req, res) => {
  res.render("admin-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: req.params.id,
  });
});

router.get("/pronostici/colonna", (req, res) => {
  res.render("pronostici-colonna", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tornei/:id/albero-superuser", async (req, res) => {
  res.render("albero-superuser", {
    tournamentId: req.params.id,
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tornei/:id/albero_superuser", async (req, res) => {
  res.render("albero-superuser", {
    tournamentId: req.params.id,
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tornei/:id/edit", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const forwardHeaders = {
      cookie: req.headers.cookie || "",
    };

    const risposta = await fetch(`${process.env.API}/tournaments/${id}`, {
      headers: forwardHeaders,
    });
    if (!risposta.ok) {
      return res.status(404).send("Torneo non trovato.");
    }
    const json = await risposta.json();
    console.log("Risposta JSON:", json);
    // Supponiamo che json.data sia un oggetto torneo (non un array)
    const tournament = json.data;
    const toYmd = (v) => {
      if (!v) return v;
      const s = String(v);
      return s.length >= 10 ? s.slice(0, 10) : s;
    };
    const toDatetimeLocal = (v) => {
      if (!v) return "";
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      // datetime-local expects local time, no timezone suffix
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    tournament.datainizio = toYmd(tournament.datainizio);
    tournament.datafine = toYmd(tournament.datafine);
    tournament.ranking_date = toYmd(tournament.ranking_date);
    tournament.dataopen = toYmd(tournament.dataopen);
    tournament.chiusuraPronostici = toDatetimeLocal(tournament.chiusuraPronostici);

    const safeJson = async (res) => {
      try {
        return await res.json();
      } catch (e) {
        return null;
      }
    };

    const [predRes, tournamentScriptsRes, playersRes] = await Promise.all([
      fetch(`${process.env.API}/predictions/tournaments/${id}`, {
        headers: forwardHeaders,
      }),
      fetch(`${process.env.API}/tournaments/${id}/scripts/`, {
        headers: forwardHeaders,
      }),
      fetch(
        tournament.ranking_date
          ? `${process.env.API}/players/ranking/${encodeURIComponent(tournament.ranking_date)}`
          : `${process.env.API}/players/ranking`,
        {
          headers: forwardHeaders,
        }
      ),
    ]);

    const predictionsJson = predRes.ok ? await safeJson(predRes) : null;
    const tournamentScriptsJson = tournamentScriptsRes.ok
      ? await safeJson(tournamentScriptsRes)
      : null;
    const playersJson = playersRes.ok ? await safeJson(playersRes) : null;

    const getTournamentWithScriptsFromApiResponse = (json) => {
      if (!json) return null;
      if (json.data && Array.isArray(json.data) && json.data[0]) return json.data[0];
      if (json.data && !Array.isArray(json.data) && typeof json.data === "object") return json.data;
      if (Array.isArray(json) && json[0]) return json[0];
      if (typeof json === "object") return json;
      return null;
    };

    const tournamentWithScripts = getTournamentWithScriptsFromApiResponse(tournamentScriptsJson);
    const scripts =
      (tournamentWithScripts && (tournamentWithScripts.Scripts || tournamentWithScripts.scripts)) || [];

    const players = (playersJson && playersJson.data) || [];

    // Compile scripts like creaColonne.js (iterate all scripts and extract functions)
    let pointsWinnerFn = null;
    let pointsSemiFn = null;
    try {
      for (const s of scripts) {
        if (!s || !s.script) continue;
        const compiled = new Function(
          `${s.script}; return { w: (typeof punteggioWinner === 'function') ? punteggioWinner : null, sf: (typeof punteggioSemifinalist === 'function') ? punteggioSemifinalist : null };`
        )();
        if (!pointsWinnerFn && compiled && typeof compiled.w === "function") pointsWinnerFn = compiled.w;
        if (!pointsSemiFn && compiled && typeof compiled.sf === "function") pointsSemiFn = compiled.sf;
        if (pointsWinnerFn && pointsSemiFn) break;
      }
    } catch (e) {
      console.error("Errore compile scripts punteggio:", e);
    }
    if (!pointsWinnerFn) pointsWinnerFn = () => 0;
    if (!pointsSemiFn) pointsSemiFn = () => 0;

    const parseRankingNumber = (rawRanking) => {
      let ranking = Number(rawRanking);
      if (!Number.isFinite(ranking)) {
        const m = String(rawRanking).match(/\d+/);
        ranking = m ? Number(m[0]) : NaN;
      }
      return Number.isFinite(ranking) ? ranking : null;
    };

    const normalizeYmd = (v) => {
      if (!v) return null;
      const s = String(v);
      return s.length >= 10 ? s.slice(0, 10) : s;
    };

    const hasRankingForDate = (player, rankingDate) => {
      const targetDate = normalizeYmd(rankingDate);
      if (!targetDate) return false;
      if (!player || !player.Rankings || !player.Rankings.length) return false;
      // If API doesn't provide ranking.date, we cannot check: assume endpoint already filtered by rankingDate.
      const anyHasDate = Boolean(player.Rankings.find((r) => r && r.date));
      if (!anyHasDate) return true;
      return Boolean(player.Rankings.find((r) => normalizeYmd(r && r.date) === targetDate));
    };

    const getPlayerRanking = (player, rankingDate = null) => {
      if (!player) return null;
      const targetDate = normalizeYmd(rankingDate);

      if (player.Rankings && player.Rankings.length) {
        let chosen = null;
        if (targetDate) {
          const anyHasDate = Boolean(player.Rankings.find((r) => r && r.date));
          chosen = anyHasDate
            ? player.Rankings.find((r) => normalizeYmd(r && r.date) === targetDate) || null
            : player.Rankings[0];
        }
        if (!chosen) chosen = player.Rankings[0];
        if (chosen && typeof chosen.ranking !== "undefined") {
          return parseRankingNumber(chosen.ranking);
        }
      }

      if (typeof player.ranking !== "undefined") return parseRankingNumber(player.ranking);
      return null;
    };

    players.forEach((player) => {
      player.puntiSemifinalist = 0;
      player.puntiWinner = 0;

      const tournamentRankingDate = tournament && tournament.ranking_date ? normalizeYmd(tournament.ranking_date) : null;
      const hasTournamentRanking = tournamentRankingDate ? hasRankingForDate(player, tournamentRankingDate) : false;
      const ranking = tournamentRankingDate && hasTournamentRanking
        ? getPlayerRanking(player, tournamentRankingDate)
        : null;

      player._rankingIssue = !tournamentRankingDate || !hasTournamentRanking || ranking === null;
      player._rankingValue = ranking;
      if (player._rankingIssue) return;

      const semiVal = pointsSemiFn(ranking);
      player.puntiSemifinalist = Number.isFinite(Number(semiVal)) ? Number(semiVal) : 0;

      const winVal = pointsWinnerFn(ranking);
      player.puntiWinner = Number.isFinite(Number(winVal)) ? Number(winVal) : 0;
    });

    const playerById = new Map(players.map((p) => [String(p.id), p]));
    const predictions = (predictionsJson && predictionsJson.data) || [];

    const playersWithPoints = (players || [])
      .map((p) => {
        const ranking = p && p._rankingIssue ? "N/D" : (p && p._rankingValue !== null ? p._rankingValue : null);
        return {
          id: p && p.id,
          name: p && p.name,
          country: p && p.country,
          ranking,
          puntiSemifinalist: Number(p && p.puntiSemifinalist) || 0,
          puntiWinner: Number(p && p.puntiWinner) || 0,
        };
      })
      .sort((a, b) => {
        const ra = parseRankingNumber(a.ranking);
        const rb = parseRankingNumber(b.ranking);
        if (ra === null && rb === null) return 0;
        if (ra === null) return 1;
        if (rb === null) return -1;
        return ra - rb;
      });

    const predictionsTable = predictions
      .map((p) => {
        const rows = (p && p.rows) || [];
        const winnerRow = rows.find((r) => r && r.prediction === "winner");
        const semiRows = rows.filter((r) => r && r.prediction === "semifinalist");

        const winnerPlayer = winnerRow
          ? playerById.get(String(winnerRow.player_id)) || null
          : null;
        const semifinalistPlayers = semiRows
          .map((r) => playerById.get(String(r.player_id)) || null)
          .filter(Boolean)
          .slice(0, 3);

        const totalPoints = rows.reduce((acc, r) => {
          if (!r) return acc;
          const pl = playerById.get(String(r.player_id));
          if (!pl) return acc;
          if (r.prediction === "winner") return acc + (Number(pl.puntiWinner) || 0);
          if (r.prediction === "semifinalist")
            return acc + (Number(pl.puntiSemifinalist) || 0);
          return acc;
        }, 0);

        return {
          created_at: p.created_at || null,
          user_email: p.user_email || "",
          totalPoints,
          winner: winnerPlayer
            ? {
                name: winnerPlayer.name,
                puntiWinner: winnerPlayer.puntiWinner,
              }
            : null,
          semifinalists: semifinalistPlayers.map((sp) => ({
            name: sp.name,
            puntiSemifinalist: sp.puntiSemifinalist,
          })),
        };
      })
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      });

    res.render("edit-tournament", {
      tournament,
      predictionsTable,
      playersWithPoints,
      apiUrl: req.app.locals.apiUrl || "/api",
    });
  } catch (err) {
    console.error("Errore nel recupero torneo:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

router.get("/tornei/:id/pronostico", (req, res) => {
  //res.render("pronostico", { tournamentId: req.params.id });
  res.render("pronostico", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/stanze", (req, res) => {
  res.render("stanze", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tornei/:id/sviluppo", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const apiUrl = req.app.locals.apiUrl || "/api";
    const apiBase = process.env.API || apiUrl;

    const headers = {};
    if (req.headers && req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    const response = await fetch(`${apiBase}/tournaments/${tournamentId}`, {
      method: "GET",
      headers,
    });

    let tournamentName = "";
    if (response.ok) {
      const json = await response.json();
      if (json && json.data && json.data[0] && json.data[0].name) {
        tournamentName = json.data[0].name;
      } else if (json && json.data && !Array.isArray(json.data) && json.data.name) {
        tournamentName = json.data.name;
      } else if (json && json.name) {
        tournamentName = json.name;
      }
    }

    res.render("sviluppoTorneo", {
      tournamentId,
      tournamentName,
      apiUrl,
    });
  } catch (e) {
    res.render("sviluppoTorneo", {
      tournamentId: req.params.id,
      tournamentName: "",
      apiUrl: req.app.locals.apiUrl || "/api",
    });
  }
});

router.get("/tornei/:id/genera-albero", async (req, res) => {
  console.log("/tornei/:id/genera-albero");
  res.render("generaAlbero.ejs", {
    tournamentId: req.params.id,
  });
});

router.get("/tornei/:id/albero-pronostico", async (req, res) => {
  const tournamentId = req.params.id;
  const apiUrl = req.app.locals.apiUrl || "/api";
  res.render("albero-pronostico", {
    tournamentId,
    apiUrl,
  });
});

router.get("/tornei/:id/schedule", async (req, res) => {
  console.log("/tornei/:id/schedule");
  res.render("schedule.ejs", {
    tournamentId: req.params.id,
  });
});

router.get("/profilo", (req, res) => {
  res.render("profilo", {
    apiUrl: req.app.locals.apiUrl || "/api",
    user: res.locals.user,
  });
});

const PROFILE_UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "profile");
const ensureProfileUploadDir = () => {
  try {
    fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("[profilo/upload-image] mkdir failed:", e);
  }
};

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensureProfileUploadDir();
      cb(null, PROFILE_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".png";
      const ts = Date.now();
      const rnd = Math.random().toString(16).slice(2);
      cb(null, `profile-${ts}-${rnd}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ].includes(String(file.mimetype || "").toLowerCase());
    cb(ok ? null : new Error("Tipo file non supportato"), ok);
  },
});

router.post("/profilo/upload-image", (req, res) => {
  profileUpload.single("image")(req, res, (err) => {
    console.log("[profilo/upload-image] cwd:", process.cwd());
    console.log("[profilo/upload-image] __dirname:", __dirname);
    console.log("[profilo/upload-image] PROFILE_UPLOAD_DIR:", PROFILE_UPLOAD_DIR);
    if (err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File troppo grande (max 2MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload fallito" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nessun file" });
    }
    console.log("[profilo/upload-image] saved file:", {
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination,
    });

    const publicPath = `/uploads/profile/${encodeURIComponent(req.file.filename)}`;

    try {
      const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
      const oldUrl = uuid ? String(avatarStore.getProfileAvatar(uuid) || "") : "";
      const newFilename = String(req.file.filename || "");
      if (oldUrl.startsWith("/uploads/profile/") && newFilename) {
        const oldFilename = path.basename(decodeURIComponent(oldUrl.replace("/uploads/profile/", "")));
        if (oldFilename && oldFilename !== newFilename) {
          const oldPath = path.join(PROFILE_UPLOAD_DIR, oldFilename);
          fs.unlinkSync(oldPath);
          console.log("[profilo/upload-image] deleted previous profile image:", oldPath);
        }
      }
      if (uuid) {
        avatarStore.setProfileAvatar(uuid, publicPath);
      }
    } catch (e) {
      console.warn("[profilo/upload-image] could not delete/store previous profile image:", e && e.message ? e.message : e);
    }

    return res.status(200).json({ image_url: publicPath });
  });
});

router.post("/pronostico/delete-avatar", (req, res) => {
  try {
    const avatarUrl = req.body && req.body.avatar_url ? String(req.body.avatar_url) : "";
    if (!avatarUrl || !avatarUrl.startsWith("/uploads/predictions/")) {
      return res.status(200).json({ success: true });
    }

    const filename = path.basename(
      decodeURIComponent(avatarUrl.replace("/uploads/predictions/", ""))
    );
    if (!filename) {
      return res.status(200).json({ success: true });
    }

    const filePath = path.join(PREDICTION_AVATAR_UPLOAD_DIR, filename);
    fs.unlinkSync(filePath);
    console.log("[pronostico/delete-avatar] deleted prediction avatar:", filePath);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.warn(
      "[pronostico/delete-avatar] could not delete prediction avatar:",
      e && e.message ? e.message : e
    );
    return res.status(200).json({ success: true });
  }
});

router.post("/pronostico/delete-avatars", (req, res) => {
  try {
    const avatarUrls = (req.body && req.body.avatar_urls) || [];
    const list = Array.isArray(avatarUrls) ? avatarUrls : [];
    for (const u of list) {
      try {
        const avatarUrl = u ? String(u) : "";
        if (!avatarUrl || !avatarUrl.startsWith("/uploads/predictions/")) continue;
        const filename = path.basename(
          decodeURIComponent(avatarUrl.replace("/uploads/predictions/", ""))
        );
        if (!filename) continue;
        const filePath = path.join(PREDICTION_AVATAR_UPLOAD_DIR, filename);
        fs.unlinkSync(filePath);
        console.log("[pronostico/delete-avatars] deleted prediction avatar:", filePath);
      } catch (e) {}
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: true });
  }
});

router.get("/ui/avatar/profile", (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const image_url = uuid ? avatarStore.getProfileAvatar(uuid) : "";
    return res.status(200).json({ image_url: image_url || "" });
  } catch (e) {
    return res.status(200).json({ image_url: "" });
  }
});

router.put("/ui/avatar/profile", (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const { image_url } = req.body || {};
    const saved = uuid ? avatarStore.setProfileAvatar(uuid, image_url) : "";
    return res.status(200).json({ image_url: saved || "" });
  } catch (e) {
    return res.status(400).json({ error: "Errore nel salvataggio avatar" });
  }
});

router.get("/ui/avatar/prediction/:tournamentId", (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const tournamentId = req.params.tournamentId;
    const image_url = uuid ? avatarStore.getPredictionAvatar(uuid, tournamentId) : "";
    return res.status(200).json({ image_url: image_url || "" });
  } catch (e) {
    return res.status(200).json({ image_url: "" });
  }
});

router.put("/ui/avatar/prediction/:tournamentId", (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const tournamentId = req.params.tournamentId;
    const { image_url } = req.body || {};
    const saved = uuid ? avatarStore.setPredictionAvatar(uuid, tournamentId, image_url) : "";
    return res.status(200).json({ image_url: saved || "" });
  } catch (e) {
    return res.status(400).json({ error: "Errore nel salvataggio avatar" });
  }
});

const PREDICTION_AVATAR_UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "predictions");
const ensurePredictionAvatarUploadDir = () => {
  try {
    fs.mkdirSync(PREDICTION_AVATAR_UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("[pronostico/upload-avatar] mkdir failed:", e);
  }
};

const predictionAvatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensurePredictionAvatarUploadDir();
      cb(null, PREDICTION_AVATAR_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".png";
      const ts = Date.now();
      const rnd = Math.random().toString(16).slice(2);
      cb(null, `prediction-avatar-${ts}-${rnd}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ].includes(String(file.mimetype || "").toLowerCase());
    cb(ok ? null : new Error("Tipo file non supportato"), ok);
  },
});

router.post("/pronostico/upload-avatar", (req, res) => {
  predictionAvatarUpload.single("image")(req, res, (err) => {
    if (err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File troppo grande (max 2MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload fallito" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nessun file" });
    }
    const publicPath = `/uploads/predictions/${encodeURIComponent(req.file.filename)}`;

    try {
      const oldUrl = req.query && req.query.old_avatar_url ? String(req.query.old_avatar_url) : "";
      const newFilename = String(req.file.filename || "");
      if (oldUrl.startsWith("/uploads/predictions/") && newFilename) {
        const oldFilename = path.basename(
          decodeURIComponent(oldUrl.replace("/uploads/predictions/", ""))
        );
        if (oldFilename && oldFilename !== newFilename) {
          const oldPath = path.join(PREDICTION_AVATAR_UPLOAD_DIR, oldFilename);
          fs.unlinkSync(oldPath);
          console.log("[pronostico/upload-avatar] deleted previous prediction avatar:", oldPath);
        }
      }
    } catch (e) {
      console.warn(
        "[pronostico/upload-avatar] could not delete previous prediction avatar:",
        e && e.message ? e.message : e
      );
    }

    return res.status(200).json({ image_url: publicPath });
  });
});

router.get("/admin/tornei", requireAdmin, (req, res) => {
  res.render("admin-tornei");
});

router.get("/admin/utenti", requireAdmin, (req, res) => {
  res.render("admin-utenti", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tennisti", (req, res) => {
  res.render("tennisti");
});

router.get("/tennisti/classifica", (req, res) => {
  res.render("classifica");
});

router.get("/classifica-annuale/:year?", (req, res) => {
  const apiUrl = req.app.locals.apiUrl || "/api";
  const yNow = new Date().getFullYear();
  const yearRaw = req.params.year;
  const year = yearRaw ? Number(yearRaw) : yNow;
  res.render("classifica-annuale", { apiUrl, year: Number.isFinite(year) ? year : yNow });
});

router.get("/tennisti/:id/edit", async (req, res) => {
  const { id } = req.params;
  try {
    const risposta = await fetch(`${process.env.API}/players/${id}`);
    if (!risposta.ok) {
      return res.status(404).send("giocatore non trovato.");
    }
    const json = await risposta.json();
    console.log("Risposta JSON:", json.data[0].Rankings);
    const player = json.data[0];
    res.render("edit-player", { player, apiUrl: req.app.locals.apiUrl || "/api" });
  } catch (err) {
    console.error("Errore nel recupero del giocatore:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

module.exports = router;
// The routes are the same,  but the controller is different.
// The controller for tournaments is tournamentsController.js,  while the controller for tornei is torneiController.js.
// The controller for tornei is in the controllers folder,  and it has the following code:

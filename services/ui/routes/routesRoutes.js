const router = require("express").Router();
const { requireAdmin } = require("../middleware/authMiddleware");

router.get("/prediction", (req, res) => {
  res.render("prediction");
});

router.get("/tornei", (req, res) => {
  res.render("tornei", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
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
    tournament.datainizio = toYmd(tournament.datainizio);
    tournament.datafine = toYmd(tournament.datafine);
    tournament.ranking_date = toYmd(tournament.ranking_date);
    tournament.dataopen = toYmd(tournament.dataopen);

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

    const tournamentWithScripts =
      (tournamentScriptsJson && tournamentScriptsJson.data && tournamentScriptsJson.data[0]) ||
      null;
    const scripts = (tournamentWithScripts && tournamentWithScripts.Scripts) || [];

    const players = (playersJson && playersJson.data) || [];

    try {
      const sWinner = scripts.find((s) => s && s.name === "punteggioWinner");
      const sSemi = scripts.find((s) => s && s.name === "punteggioSemifinalist");
      if (sWinner && sWinner.script) {
        eval(sWinner.script);
      }
      if (sSemi && sSemi.script) {
        eval(sSemi.script);
      }
    } catch (e) {
      console.error("Errore esecuzione scripts punteggio:", e);
    }

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

    const getRankingForDate = (player, rankingDate) => {
      const targetDate = normalizeYmd(rankingDate);
      if (!targetDate) return { ranking: null, rankingIssue: true };
      if (!player || !player.Rankings || !player.Rankings.length)
        return { ranking: null, rankingIssue: true };

      const anyHasDate = Boolean(player.Rankings.find((r) => r && r.date));
      const chosen = anyHasDate
        ? player.Rankings.find((r) => normalizeYmd(r && r.date) === targetDate) || null
        : player.Rankings[0];
      if (!chosen) return { ranking: null, rankingIssue: true };

      const ranking = parseRankingNumber(chosen.ranking);
      // If dates are present and none matched, flag the issue; otherwise rely on parse.
      const dateMismatch = anyHasDate && !player.Rankings.find((r) => normalizeYmd(r && r.date) === targetDate);
      return { ranking, rankingIssue: dateMismatch || ranking === null };
    };

    players.forEach((player) => {
      player.puntiSemifinalist = 0;
      player.puntiWinner = 0;

      const { ranking, rankingIssue } = getRankingForDate(player, tournament.ranking_date);
      player._rankingIssue = rankingIssue;
      player._rankingValue = ranking;
      if (rankingIssue) return;

      if (typeof punteggioSemifinalist === "function") {
        const v = punteggioSemifinalist(ranking);
        player.puntiSemifinalist = Number.isFinite(Number(v)) ? Number(v) : 0;
      }
      if (typeof punteggioWinner === "function") {
        const v = punteggioWinner(ranking);
        player.puntiWinner = Number.isFinite(Number(v)) ? Number(v) : 0;
      }
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

    res.render("edit-tournament", { tournament, predictionsTable, playersWithPoints });
  } catch (err) {
    console.error("Errore nel recupero torneo:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

router.get("/tornei/:id/pronostico", (req, res) => {
  //res.render("pronostico", { tournamentId: req.params.id });
  res.render("pronostico");
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
  res.render("profilo");
});

router.get("/admin/tornei", requireAdmin, (req, res) => {
  res.render("admin-tornei");
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
    res.render("edit-player", { player });
  } catch (err) {
    console.error("Errore nel recupero del giocatore:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

module.exports = router;
// The routes are the same,  but the controller is different.
// The controller for tournaments is tournamentsController.js,  while the controller for tornei is torneiController.js.
// The controller for tornei is in the controllers folder,  and it has the following code:

const { apiFetch, safeJson } = require("../../services/apiClient");
const { toYmd, toDatetimeLocal, normalizeYmd } = require("../../utils/dateFormat");

const getTournamentWithScriptsFromApiResponse = (json) => {
  if (!json) return null;
  if (json.data && Array.isArray(json.data) && json.data[0]) return json.data[0];
  if (json.data && !Array.isArray(json.data) && typeof json.data === "object") return json.data;
  if (Array.isArray(json) && json[0]) return json[0];
  if (typeof json === "object") return json;
  return null;
};

const parseRankingNumber = (rawRanking) => {
  let ranking = Number(rawRanking);
  if (!Number.isFinite(ranking)) {
    const m = String(rawRanking).match(/\d+/);
    ranking = m ? Number(m[0]) : NaN;
  }
  return Number.isFinite(ranking) ? ranking : null;
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

const getEditTournament = async (req, res) => {
  const { id } = req.params;
  try {
    const risposta = await apiFetch(req, `/tournaments/${id}`, {});
    if (!risposta.ok) {
      return res.status(404).send("Torneo non trovato.");
    }
    const json = await risposta.json();
    console.log("Risposta JSON:", json);
    // Supponiamo che json.data sia un oggetto torneo (non un array)
    const tournament = json.data;

    tournament.datainizio = toYmd(tournament.datainizio);
    tournament.datafine = toYmd(tournament.datafine);
    tournament.ranking_date = toYmd(tournament.ranking_date);
    tournament.dataopen = toYmd(tournament.dataopen);
    tournament.chiusuraPronostici = toDatetimeLocal(tournament.chiusuraPronostici);

    const [predRes, tournamentScriptsRes, playersRes] = await Promise.all([
      apiFetch(req, `/predictions/tournaments/${id}`, {}),
      apiFetch(req, `/tournaments/${id}/scripts/`, {}),
      apiFetch(
        req,
        tournament.ranking_date
          ? `/players/ranking/${encodeURIComponent(tournament.ranking_date)}`
          : `/players/ranking`,
        {}
      ),
    ]);

    const predictionsJson = predRes.ok ? await safeJson(predRes) : null;
    const tournamentScriptsJson = tournamentScriptsRes.ok ? await safeJson(tournamentScriptsRes) : null;
    const playersJson = playersRes.ok ? await safeJson(playersRes) : null;

    const tournamentWithScripts = getTournamentWithScriptsFromApiResponse(tournamentScriptsJson);
    const scripts = (tournamentWithScripts && (tournamentWithScripts.Scripts || tournamentWithScripts.scripts)) || [];

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

        const winnerPlayer = winnerRow ? playerById.get(String(winnerRow.player_id)) || null : null;
        const semifinalistPlayers = semiRows
          .map((r) => playerById.get(String(r.player_id)) || null)
          .filter(Boolean)
          .slice(0, 3);

        const totalPoints = rows.reduce((acc, r) => {
          if (!r) return acc;
          const pl = playerById.get(String(r.player_id));
          if (!pl) return acc;
          if (r.prediction === "winner") return acc + (Number(pl.puntiWinner) || 0);
          if (r.prediction === "semifinalist") return acc + (Number(pl.puntiSemifinalist) || 0);
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
};

const getSviluppoTorneo = async (req, res) => {
  const tournamentId = req.params.id;
  const apiUrl = req.app.locals.apiUrl || "/api";
  try {
    const response = await apiFetch(req, `/tournaments/${tournamentId}`, {
      method: "GET",
    });

    let tournamentName = "";
    if (response.ok) {
      const json = await response.json();
      const t =
        json && json.data && Array.isArray(json.data)
          ? json.data[0]
          : json && json.data
            ? json.data
            : json;
      const nick = t && t.nickname ? String(t.nickname).trim() : "";
      const name = t && t.name ? String(t.name).trim() : "";
      tournamentName = nick || name;
    }

    return res.render("sviluppoTorneo", {
      tournamentId,
      tournamentName,
      apiUrl,
    });
  } catch (e) {
    return res.render("sviluppoTorneo", {
      tournamentId,
      tournamentName: "",
      apiUrl,
    });
  }
};

module.exports = {
  getEditTournament,
  getSviluppoTorneo,
};

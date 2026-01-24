import { normalizeYmd } from "./utils.js";

const apiUrl = document.documentElement.dataset.apiUrl || "/api";

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url} ${text}`);
  }
  return await res.json();
}

function parseRankingNumber(rawRanking) {
  let ranking = Number(rawRanking);
  if (!Number.isFinite(ranking)) {
    const m = String(rawRanking).match(/\d+/);
    ranking = m ? Number(m[0]) : NaN;
  }
  return Number.isFinite(ranking) ? ranking : null;
}

function getPlayerRanking(player, rankingDate = null) {
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
}

function hasRankingForDate(player, rankingDate) {
  const targetDate = normalizeYmd(rankingDate);
  if (!targetDate) return false;
  if (!player || !player.Rankings || !player.Rankings.length) return false;
  const anyHasDate = Boolean(player.Rankings.find((r) => r && r.date));
  if (!anyHasDate) return true;
  return Boolean(player.Rankings.find((r) => normalizeYmd(r && r.date) === targetDate));
}

function computeMatchWinnerId(match) {
  if (!match) return null;
  if (match.p1Wins) return match.player1Id;
  if (match.p2Wins) return match.player2Id;
  return null;
}

function computeChampionId(matches) {
  const finalMatch = (matches || []).find((m) => m && Number(m.round) === 1);
  if (!finalMatch) return null;
  return computeMatchWinnerId(finalMatch);
}

function didPlayRound(playerId, round, matches) {
  return Boolean(
    (matches || []).find(
      (x) =>
        Number(x.round) === Number(round) &&
        (Number(x.player1Id) === Number(playerId) || Number(x.player2Id) === Number(playerId))
    )
  );
}

function computePlayerStatusForRound(playerId, round, matches) {
  const m = (matches || []).find(
    (x) =>
      Number(x.round) === Number(round) &&
      (Number(x.player1Id) === Number(playerId) || Number(x.player2Id) === Number(playerId))
  );

  if (!m) return "uscito";

  const winnerId = computeMatchWinnerId(m);
  if (!winnerId) return "inGara";

  return Number(winnerId) === Number(playerId) ? "ok" : "esce";
}

function computeDisplayStatusForPick({ pickType, playerId, selectedRound, matches }) {
  if (!selectedRound) return "inGara";

  const baseStatus = computePlayerStatusForRound(playerId, selectedRound, matches);

  if (pickType === "semifinalist" && Number(selectedRound) === 1) {
    const reachedSemifinal = didPlayRound(playerId, 2, matches);
    const inFinal = didPlayRound(playerId, 1, matches);
    if (reachedSemifinal && !inFinal) {
      return "uscito";
    }
  }

  return baseStatus;
}

function pointsCountForStatus(status) {
  return status === "ok" || status === "inGara" ? 1 : 0;
}

function pointsCountForPick({ pickType, status, selectedRound, reachedSemifinal }) {
  if (pickType === "semifinalist" && selectedRound && Number(selectedRound) <= 2) {
    return reachedSemifinal ? 1 : 0;
  }
  return pointsCountForStatus(status);
}

function sanitizeUrl(v) {
  if (v === null || typeof v === "undefined") return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
  return s;
}

function getPlayerImageSrc(player) {
  const candidate = sanitizeUrl(player && (player.image_src || player.img));
  return candidate;
}

function aggiornaStileGiocatore(playerElement, risultatoTurno) {
  if (!playerElement) return;
  playerElement.classList.remove("hidden", "out", "transparent", "highlight");

  switch (risultatoTurno) {
    case "uscito":
      playerElement.classList.add("out");
      break;
    case "inGara":
      playerElement.classList.add("transparent");
      break;
    case "semif":
      playerElement.classList.add("transparent");
      break;
    case "esce":
      playerElement.classList.add("highlight");
      break;
    case "winn":
      playerElement.classList.add("highlight");
      break;
    case "finalist":
    case "ok":
    default:
      break;
  }
}

function createCell({ player, status, isWinner = false, extraClasses = [] }) {
  const cell = document.createElement("div");
  cell.className = isWinner ? "winner" : "cell";
  (extraClasses || []).forEach((c) => {
    if (c) cell.classList.add(c);
  });
  aggiornaStileGiocatore(cell, status);
  cell.innerHTML = `
    <div class="title">punti: ${typeof player._points === "number" ? player._points : 0}</div>
    <div class="player">
      <img src="${getPlayerImageSrc(player)}" alt="${player.name}" />
      ${player.name}
    </div>
    <div class="title">classifica: ${player && player._rankingIssue ? "N/D" : (player && typeof player._ranking === "number" ? player._ranking : "")}</div>
  `;
  return cell;
}

function isTournamentCompleted(tournament) {
  return String(tournament && tournament.status ? tournament.status : "")
    .toLowerCase()
    .trim() === "completed";
}

function computeRankingPointsForCompletedTournament({ winner, semifinalists, matches, pointsWinnerFn, pointsSemiFn }) {
  const championId = computeChampionId(matches);
  let total = 0;

  const addWinner = (p) => {
    if (!p || p._rankingIssue || typeof p._ranking !== "number") {
      return { points: 0, earned: false };
    }
    const reachedSemifinal = didPlayRound(p.id, 2, matches);
    const isChampion = championId !== null && Number(championId) === Number(p.id);
    if (isChampion) {
      const pts = Number(pointsWinnerFn(p._ranking)) || 0;
      total += pts;
      return { points: pts, earned: pts > 0 };
    }
    if (reachedSemifinal && championId !== null) {
      const pts = Number(pointsSemiFn(p._ranking)) || 0;
      total += pts;
      return { points: pts, earned: pts > 0 };
    }
    return { points: 0, earned: false };
  };

  const addSemi = (p) => {
    if (!p || p._rankingIssue || typeof p._ranking !== "number") {
      return { points: 0, earned: false };
    }
    const reachedSemifinal = didPlayRound(p.id, 2, matches);
    if (!reachedSemifinal) return { points: 0, earned: false };
    const pts = Number(pointsSemiFn(p._ranking)) || 0;
    total += pts;
    return { points: pts, earned: pts > 0 };
  };

  const winnerRes = addWinner(winner);
  const semiRes = (semifinalists || []).map((p) => addSemi(p));

  return {
    total,
    perPlayer: {
      winner: winnerRes,
      semifinalists: semiRes,
    },
  };
}

function faseToRound(faseMenu) {
  const fase = Number(faseMenu);
  if (fase === 0) return null;
  return 7 - fase;
}

async function fetchTournamentBasic(tournamentId) {
  const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}`, { method: "GET" });
  if (json && json.data && Array.isArray(json.data) && json.data[0]) return json.data[0];
  if (json && json.data && !Array.isArray(json.data) && typeof json.data === "object") return json.data;
  return json;
}

async function fetchTournamentScripts(tournamentId) {
  const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}/scripts/`, { method: "GET" });
  if (json && json.data && Array.isArray(json.data) && json.data[0]) return json.data[0];
  if (json && json.data && !Array.isArray(json.data) && typeof json.data === "object") return json.data;
  return json;
}

async function fetchPlayersByRankingDate(rankingDate) {
  const normalizedDate = normalizeYmd(rankingDate);
  const url = normalizedDate
    ? `${apiUrl}/players/ranking/${encodeURIComponent(normalizedDate)}`
    : `${apiUrl}/players/ranking`;
  const json = await fetchJson(url, { method: "GET" });
  return (json && json.data) || [];
}

async function fetchSuperuserTreeByTournament(tournamentId) {
  return await fetchJson(`${apiUrl}/trees/superuser/${tournamentId}`, { method: "GET" });
}

async function fetchMatchesByTreeId(treeId) {
  const json = await fetchJson(`${apiUrl}/matches/tree/${treeId}`, { method: "GET" });
  return Array.isArray(json) ? json : [];
}

function buildPointFunctions(tournamentScripts) {
  let pointsWinnerFn = () => 0;
  let pointsSemiFn = () => 0;
  try {
    const scripts = (tournamentScripts && tournamentScripts.Scripts) || [];
    const winnerScript = scripts.find((s) => s && s.name === "punteggioWinner");
    const semiScript = scripts.find((s) => s && s.name === "punteggioSemifinalist");

    if (winnerScript && winnerScript.script) {
      const fn = new Function(`${winnerScript.script}; return (typeof punteggioWinner === 'function') ? punteggioWinner : null;`)();
      if (typeof fn === "function") pointsWinnerFn = fn;
    }

    if (semiScript && semiScript.script) {
      const fn = new Function(`${semiScript.script}; return (typeof punteggioSemifinalist === 'function') ? punteggioSemifinalist : null;`)();
      if (typeof fn === "function") pointsSemiFn = fn;
    }
  } catch (e) {
    console.error("Errore compile scripts punteggio:", e);
  }
  return { pointsWinnerFn, pointsSemiFn };
}

async function renderColumnsForPhase(faseMenu) {
  const columnContainer = document.getElementById("columns");
  const titleEl = document.getElementById("titolo");
  if (!columnContainer) return;

  const fase = Number(faseMenu);
  const round = faseToRound(fase);
  titleEl.textContent = fase === 0 ? "PRONOSTICI" : `FASE ${fase}`;

  columnContainer.innerHTML = "";

  const json = await fetchJson(`${apiUrl}/predictions/user`, { method: "GET" });
  const predictions = (json && json.data) || [];

  const uniqueTournamentIds = Array.from(new Set(predictions.map((p) => String(p.tournament_id)).filter(Boolean)));

  // limita per performance: ultimi 10 per default
  const tournamentsMeta = await Promise.all(
    uniqueTournamentIds.map(async (tid) => {
      try {
        const t = await fetchTournamentBasic(tid);
        return { tid, t };
      } catch (e) {
        return { tid, t: null };
      }
    })
  );

  const visibleTournamentIds = tournamentsMeta
    .filter(({ t }) => t && String(t.status).toLowerCase() !== "excluded")
    .sort((a, b) => {
      const aTime = new Date(a.t && (a.t.datafine || a.t.datainizio || a.t.dataopen) || 0).getTime();
      const bTime = new Date(b.t && (b.t.datafine || b.t.datainizio || b.t.dataopen) || 0).getTime();
      return bTime - aTime;
    })
    .map(({ tid }) => tid)
    .slice(0, 10);

  for (const tid of visibleTournamentIds) {
    const tournament = tournamentsMeta.find((x) => x.tid === tid)?.t;
    const prediction = predictions.find((p) => String(p.tournament_id) === String(tid));
    if (!tournament || !prediction) continue;

    const completed = isTournamentCompleted(tournament);

    const tournamentScripts = await fetchTournamentScripts(tid).catch(() => null);
    const tournamentRankingDate = tournament && tournament.ranking_date ? normalizeYmd(tournament.ranking_date) : null;
    const players = await fetchPlayersByRankingDate(tournamentRankingDate).catch(() => []);

    let matches = [];
    if (round !== null || completed) {
      try {
        const tree = await fetchSuperuserTreeByTournament(tid);
        const treeId = tree && (tree.id || tree.uuid);
        if (treeId) matches = await fetchMatchesByTreeId(treeId);
      } catch (e) {
        matches = [];
      }
    }

    const { pointsWinnerFn, pointsSemiFn } = buildPointFunctions(tournamentScripts);

    const column = document.createElement("div");
    column.className = "column";

    const headerCell = document.createElement("div");
    headerCell.className = "header-cell";
    headerCell.innerHTML = `${tournament.name || tid}<div class="title">${String(tournament.status || "")}</div>`;
    column.appendChild(headerCell);

    const punteggioCell = document.createElement("div");
    punteggioCell.className = "punteggio";
    headerCell.appendChild(punteggioCell);

    const content = document.createElement("div");
    content.className = "content";

    const _winner = prediction.rows.find((row) => row.prediction === "winner")?.player_id;
    const _semifinalists = prediction.rows.filter((row) => row.prediction === "semifinalist").map((row) => row.player_id);

    const winner = players.find((p) => p.id === _winner);
    const semi1 = players.find((p) => p.id === _semifinalists[0]);
    const semi2 = players.find((p) => p.id === _semifinalists[1]);
    const semi3 = players.find((p) => p.id === _semifinalists[2]);

    const attachPoints = (p, isW) => {
      if (!p) return;
      const hasTournamentRanking = tournamentRankingDate ? hasRankingForDate(p, tournamentRankingDate) : false;
      const r = tournamentRankingDate && hasTournamentRanking ? getPlayerRanking(p, tournamentRankingDate) : null;
      p._ranking = r;
      p._rankingIssue = !tournamentRankingDate || !hasTournamentRanking || r === null;
      if (p._rankingIssue) {
        p._points = 0;
        return;
      }
      const base = isW ? pointsWinnerFn(r) : pointsSemiFn(r);
      p._points = Number(base) || 0;
    };

    attachPoints(winner, true);
    attachPoints(semi1, false);
    attachPoints(semi2, false);
    attachPoints(semi3, false);

    let totalPoints = 0;

    if (winner && winner.name) {
      const championId = round === null ? null : computeChampionId(matches);
      const status = round === null ? "inGara" : computeDisplayStatusForPick({ pickType: "winner", playerId: winner.id, selectedRound: round, matches });
      const reachedSemifinal = didPlayRound(winner.id, 2, matches);
      const shouldCountAsSemifinalist =
        round !== null &&
        Number(round) <= 2 &&
        reachedSemifinal &&
        championId !== null &&
        Number(championId) !== Number(winner.id);

      const effectivePickType = shouldCountAsSemifinalist ? "semifinalist" : "winner";
      if (shouldCountAsSemifinalist && !winner._rankingIssue && typeof winner._ranking === "number") {
        const base = pointsSemiFn(winner._ranking);
        winner._points = Number(base) || 0;
      }

      totalPoints +=
        pointsCountForPick({
          pickType: effectivePickType,
          status,
          selectedRound: round,
          reachedSemifinal,
        }) * (winner._points || 0);

      content.appendChild(createCell({ player: winner, status, isWinner: true }));
    }

    const addSemi = (p) => {
      if (!p || !p.name) return;
      const status = round === null ? "inGara" : computeDisplayStatusForPick({ pickType: "semifinalist", playerId: p.id, selectedRound: round, matches });
      const reachedSemifinal = didPlayRound(p.id, 2, matches);
      totalPoints +=
        pointsCountForPick({
          pickType: "semifinalist",
          status,
          selectedRound: round,
          reachedSemifinal,
        }) * (p._points || 0);
      content.appendChild(createCell({ player: p, status }));
    };

    addSemi(semi1);
    addSemi(semi2);
    addSemi(semi3);

    let rankingPoints = null;
    let perPlayerRanking = null;
    if (completed) {
      const rankingRes = computeRankingPointsForCompletedTournament({
        winner,
        semifinalists: [semi1, semi2, semi3].filter(Boolean),
        matches,
        pointsWinnerFn,
        pointsSemiFn,
      });
      rankingPoints = rankingRes.total;
      perPlayerRanking = rankingRes.perPlayer;
    }

    // highlight picks that brought points vs eliminated (only for completed tournaments)
    if (completed && perPlayerRanking) {
      const pickEls = content.querySelectorAll(".cell, .winner");
      const picks = [winner, semi1, semi2, semi3];
      picks.forEach((p, idx) => {
        if (!p) return;
        const el = pickEls[idx];
        if (!el) return;
        const isWinnerPick = idx === 0;
        const pointsInfo = isWinnerPick
          ? perPlayerRanking.winner
          : perPlayerRanking.semifinalists[idx - 1] || { points: 0, earned: false };
        if (pointsInfo && pointsInfo.earned) {
          el.classList.add("earned-points");
        } else {
          el.classList.add("eliminated-pick");
        }
      });
    }

    punteggioCell.innerHTML = `
      <div class="score-line">Pronostico: ${totalPoints}</div>
      ${completed ? `<div class="score-line score-line--ranking">Classifica: ${rankingPoints || 0}</div>` : ""}
    `;
    column.appendChild(content);
    columnContainer.appendChild(column);
  }
}

(async function init() {
  try {
    await renderColumnsForPhase(0);
  } catch (e) {
    const el = document.getElementById("columns");
    if (el) {
      el.innerHTML = `<div style="padding:12px;border:1px solid #f99;background:#fff0f0;color:#900;max-width:720px;margin:12px auto;">${e.message}</div>`;
    }
  }
})();

const punteggi = [];

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url} ${text}`);
  }
  return await res.json();
}

async function fetchTournamentBasic(tournamentId, apiUrl) {
  // NB: tournaments API may return either { success, data: [...] } or a direct object depending on endpoint.
  const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}`, {
    method: "GET",
  });
  if (json && json.data && Array.isArray(json.data) && json.data[0]) return json.data[0];
  if (json && json.data && !Array.isArray(json.data) && typeof json.data === "object") return json.data;
  return json;
}

async function fetchTournamentScripts(tournamentId, apiUrl) {
  const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}/scripts`, {
    method: "GET",
  });
  if (json && json.data && Array.isArray(json.data) && json.data[0]) return json.data[0];
  if (json && json.data && !Array.isArray(json.data) && typeof json.data === "object") return json.data;
  return json;
}

async function fetchTournamentPredictions(tournamentId, apiUrl) {
  const json = await fetchJson(`${apiUrl}/predictions/tournaments/${tournamentId}`, {
    method: "GET",
  });
  return (json && json.data) || [];
}

async function fetchPlayersByRankingDate(rankingDate, apiUrl) {
  const normalizeRankingDate = (v) => {
    if (!v) return null;
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const normalizedDate = normalizeRankingDate(rankingDate);
  const url = normalizedDate
    ? `${apiUrl}/players/ranking/${encodeURIComponent(normalizedDate)}`
    : `${apiUrl}/players/ranking`;

  const json = await fetchJson(url, { method: "GET" });
  return (json && json.data) || [];
}

async function fetchSuperuserTreeByTournament(tournamentId, apiUrl) {
  // Returns a single Tree object
  return await fetchJson(`${apiUrl}/trees/superuser/${tournamentId}`, {
    method: "GET",
  });
}

async function fetchMatchesByTreeId(treeId, apiUrl) {
  const json = await fetchJson(`${apiUrl}/matches/tree/${treeId}`, {
    method: "GET",
  });
  return Array.isArray(json) ? json : [];
}

function computeMatchWinnerId(match) {
  if (!match) return null;
  if (match.p1Wins) return match.player1Id;
  if (match.p2Wins) return match.player2Id;
  return null;
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

function parseRankingNumber(rawRanking) {
  let ranking = Number(rawRanking);
  if (!Number.isFinite(ranking)) {
    const m = String(rawRanking).match(/\d+/);
    ranking = m ? Number(m[0]) : NaN;
  }
  return Number.isFinite(ranking) ? ranking : null;
}

function normalizeYmd(v) {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function hasRankingForDate(player, rankingDate) {
  const targetDate = normalizeYmd(rankingDate);
  if (!targetDate) return false;
  if (!player || !player.Rankings || !player.Rankings.length) return false;
  // If API doesn't provide ranking.date, we cannot check: assume endpoint already filtered by rankingDate.
  const anyHasDate = Boolean(player.Rankings.find((r) => r && r.date));
  if (!anyHasDate) return true;
  return Boolean(player.Rankings.find((r) => normalizeYmd(r && r.date) === targetDate));
}

function getPlayerRanking(player, rankingDate = null) {
  if (!player) return null;
  const targetDate = normalizeYmd(rankingDate);

  if (player.Rankings && player.Rankings.length) {
    let chosen = null;
    if (targetDate) {
      // If Rankings don't include date info, fallback to first element (API likely filtered already).
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

function pointsCountForStatus(status) {
  // for selected phase: player still alive or not yet played counts as points,
  // loser/out counts as 0.
  return status === "ok" || status === "inGara" ? 1 : 0;
}

function pointsCountForPick({ pickType, playerId, status, selectedRound, matches, reachedSemifinal }) {
  // Special rule requested:
  // - In Semifinali (round=2) and Finale (round=1) views, semifinalist picks keep their points once
  //   the player has reached the semifinals (appears in round=2), even if they lose later.
  if (pickType === "semifinalist" && selectedRound && Number(selectedRound) <= 2) {
    return reachedSemifinal ? 1 : 0;
  }
  return pointsCountForStatus(status);
}

function computeDisplayStatusForPick({ pickType, playerId, selectedRound, matches }) {
  if (!selectedRound) return "inGara";

  const baseStatus = computePlayerStatusForRound(playerId, selectedRound, matches);

  // In Finale view (round=1), a semifinalist who reached semis but is not in the final should
  // remain visible (red) instead of being hidden.
  if (pickType === "semifinalist" && Number(selectedRound) === 1) {
    const reachedSemifinal = didPlayRound(playerId, 2, matches);
    const inFinal = didPlayRound(playerId, 1, matches);
    if (reachedSemifinal && !inFinal) {
      return "esce";
    }
  }

  return baseStatus;
}

function computePlayerStatusForRound(playerId, round, matches) {
  // round: 1 (finale) ... 6 (32-esimi)
  const m = (matches || []).find(
    (x) => Number(x.round) === Number(round) && (Number(x.player1Id) === Number(playerId) || Number(x.player2Id) === Number(playerId))
  );

  if (!m) return "uscito";

  const winnerId = computeMatchWinnerId(m);
  if (!winnerId) return "inGara";

  return Number(winnerId) === Number(playerId) ? "ok" : "esce";
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
// Assumendo che tu abbia una funzione per aggiungere i giocatori alla DOM
function aggiornaStileGiocatore(playerElement, risultatoTurno) {
  if (!playerElement) return;

  // Rimuovi tutte le classi specifiche
  playerElement.classList.remove("hidden", "out", "transparent", "highlight");

  // Applica lo stile in base al risultatoTurno
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
    case "esce": //il caso esce non si verifica in semifinale
      playerElement.classList.add("highlight");
      break;
    case "winn":
      playerElement.classList.add("highlight");
      break;
    case "finalist":
    case "ok":
    default:
      // Nessuna modifica
      break;
  }
}
//FUNZIONE CHE CREA UNA CELLA PER CIASCUN GIOCATORE DEL PRONOSTICO
function createCell({ title, player, status, isWinner = false }) {
  const cell = document.createElement("div");
  cell.className = isWinner ? "winner" : "cell";

  aggiornaStileGiocatore(cell, status);
  cell.innerHTML = `
  <div class="title">${""}</div>
  <div class="title">punti: ${typeof player._points === "number" ? player._points : 0}</div>
  <div class="player">
    <img src="${getPlayerImageSrc(player)}" alt="${player.name}" />
    ${player.name}
  </div>
  <div class="title">classifica: ${player && player._rankingIssue ? "N/D" : (player && typeof player._ranking === "number" ? player._ranking : "")}</div>
`;

  return cell;
}

export async function creaColonne(tournamentID, faseMenu, apiUrl, loggedUserUuid) {
  const tournamentId = tournamentID;
  const columnContainer = document.getElementById("columns");

  // reset
  columnContainer.innerHTML = "";

  const fase = Number(faseMenu);
  const isPronosticiOnly = fase === 0;
  // mapping requested: menu 1..6 where 1=finale and 6=32-esimi
  const round = isPronosticiOnly ? null : 7 - fase;

  let tournament;
  let tournamentScripts;
  let players = [];
  let predictions = [];
  let matches = [];

  try {
    tournament = await fetchTournamentBasic(tournamentId, apiUrl);
  } catch (e) {
    console.error("Errore fetch tournament:", e);
    tournament = null;
  }

  try {
    tournamentScripts = await fetchTournamentScripts(tournamentId, apiUrl);
  } catch (e) {
    console.error("Errore fetch tournament scripts:", e);
    tournamentScripts = null;
  }

  const tournamentRankingDate = tournament && tournament.ranking_date ? normalizeYmd(tournament.ranking_date) : null;
  try {
    players = await fetchPlayersByRankingDate(tournamentRankingDate, apiUrl);
  } catch (e) {
    console.error("Errore fetch players:", e);
    players = [];
  }

  try {
    predictions = await fetchTournamentPredictions(tournamentId, apiUrl);
  } catch (e) {
    console.error("Errore fetch predictions:", e);
    predictions = [];
  }

  if (!isPronosticiOnly) {
    try {
      const tree = await fetchSuperuserTreeByTournament(tournamentId, apiUrl);
      const treeId = tree && (tree.id || tree.uuid);
      if (treeId) {
        matches = await fetchMatchesByTreeId(treeId, apiUrl);
      }
    } catch (e) {
      console.error("Errore fetch tree/matches:", e);
      matches = [];
    }
  }

  // scoring functions from tournament scripts
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

  predictions.forEach((prediction) => {
    //creazione header con dati dello scommettitore
    punteggi[prediction.user_uuid] = 0;

    const column = document.createElement("div");
    column.className = "column";

    const headerCell = document.createElement("div");
    headerCell.className = "header-cell";
    const userImg = prediction.img || prediction.user_image_url;
    const userName = prediction.user_soprannome || prediction.user_email;
    headerCell.innerHTML = `
    <img src="${userImg}" alt="Immagine ${userName}" />
    ${userName}
    `;
    column.appendChild(headerCell);
    const punteggioCell = document.createElement("div");
    punteggioCell.className = "punteggio";
    headerCell.appendChild(punteggioCell);
    //creazione della pila dei tennisti
    const content = document.createElement("div");
    content.className = "content";

    const _winner = prediction.rows.find(
      (row) => row.prediction === "winner"
    )?.player_id;
    const _semifinalists = prediction.rows
      .filter((row) => row.prediction === "semifinalist")
      .map((row) => row.player_id);
    const winner = players.find((p) => p.id === _winner);
    const semi1 = players.find((p) => p.id === _semifinalists[0]);
    const semi2 = players.find((p) => p.id === _semifinalists[1]);
    const semi3 = players.find((p) => p.id === _semifinalists[2]);

    // enrich players with points for display
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
    //vincitore
    if (winner && winner.name) {
      const status = isPronosticiOnly
        ? "inGara"
        : computeDisplayStatusForPick({ pickType: "winner", playerId: winner.id, selectedRound: round, matches });
      punteggi[prediction.user_uuid] +=
        pointsCountForPick({
          pickType: "winner",
          playerId: winner.id,
          status,
          selectedRound: round,
          matches,
          reachedSemifinal: didPlayRound(winner.id, 2, matches),
        }) * (winner._points || 0);
      content.appendChild(
        createCell({
          title: "VINCITORE",
          player: winner,
          status,
          isWinner: true,
        })
      );
    }
    //semifinalista
    if (semi1 && semi1.name) {
      const status = isPronosticiOnly
        ? "inGara"
        : computeDisplayStatusForPick({ pickType: "semifinalist", playerId: semi1.id, selectedRound: round, matches });
      const reachedSemifinal = didPlayRound(semi1.id, 2, matches);
      punteggi[prediction.user_uuid] +=
        pointsCountForPick({
          pickType: "semifinalist",
          playerId: semi1.id,
          status,
          selectedRound: round,
          matches,
          reachedSemifinal,
        }) * (semi1._points || 0);
      content.appendChild(
        createCell({
          title: "SEMIFINALISTA",
          player: semi1,
          status,
        })
      );
    }
    //semifinalista
    if (semi2 && semi2.name) {
      const status = isPronosticiOnly
        ? "inGara"
        : computeDisplayStatusForPick({ pickType: "semifinalist", playerId: semi2.id, selectedRound: round, matches });
      const reachedSemifinal = didPlayRound(semi2.id, 2, matches);
      punteggi[prediction.user_uuid] +=
        pointsCountForPick({
          pickType: "semifinalist",
          playerId: semi2.id,
          status,
          selectedRound: round,
          matches,
          reachedSemifinal,
        }) * (semi2._points || 0);
      content.appendChild(
        createCell({
          title: "SEMIFINALISTA",
          player: semi2,
          status,
        })
      );
    }
    //semifinalista
    if (semi3 && semi3.name) {
      const status = isPronosticiOnly
        ? "inGara"
        : computeDisplayStatusForPick({ pickType: "semifinalist", playerId: semi3.id, selectedRound: round, matches });
      const reachedSemifinal = didPlayRound(semi3.id, 2, matches);
      punteggi[prediction.user_uuid] +=
        pointsCountForPick({
          pickType: "semifinalist",
          playerId: semi3.id,
          status,
          selectedRound: round,
          matches,
          reachedSemifinal,
        }) * (semi3._points || 0);
      content.appendChild(
        createCell({
          title: "SEMIFINALISTA",
          player: semi3,
          status,
        })
      );
    }

    punteggioCell.innerHTML = `${punteggi[prediction.user_uuid]}`;
    column.appendChild(content);
    columnContainer.appendChild(column);
  });
}

import { normalizeYmd } from "/js/utils.js";
import { tournamentApi } from "/js/api/tournamentApi.js";
import { playerApi } from "/js/api/playerApi.js";
import { predictionApi } from "/js/api/predictionApi.js";
import { treeApi } from "/js/api/treeApi.js";
import RankingContext from "/js/domain/RankingContext.js";

const punteggi = [];

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

  // In Finale view (round=1), a predicted winner who reached semis but is not in the final
  // should remain visible (red) instead of being hidden.
  if (pickType === "winner" && Number(selectedRound) === 1) {
    const reachedSemifinal = didPlayRound(playerId, 2, matches);
    const inFinal = didPlayRound(playerId, 1, matches);
    if (reachedSemifinal && !inFinal) {
      return "esce";
    }
  }

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
function createCell({ title, player, status, isWinner = false, roomId } = {}) {
  const cell = document.createElement("div");
  cell.className = isWinner ? "winner" : "cell";

  aggiornaStileGiocatore(cell, status);

  const playerId = player && player.id !== undefined && player.id !== null ? String(player.id) : "";
  const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
  const friendHref = playerId ? `/friend/player/${encodeURIComponent(playerId)}${qs}` : "";
  const imgSrc = (player && (player.image_src || player.img)) || "";
  const imgHtml = `<img src="${imgSrc}" alt="${player.name}" />`;
  const nameHtml = `${player && player.name ? String(player.name) : ""}`;
  const playerInnerHtml = friendHref
    ? `<a href="${friendHref}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color: inherit; display: inline-flex; align-items: center; gap: 8px;">${imgHtml}<span>${nameHtml}</span></a>`
    : `${imgHtml}${nameHtml}`;

  cell.innerHTML = `
  <div class="title">${""}</div>
  <div class="title">punti: ${typeof player._points === "number" ? player._points : 0}</div>
  <div class="player">
    ${playerInnerHtml}
  </div>
  <div class="title">classifica: ${player && player._rankingIssue ? "N/D" : (player && typeof player._ranking === "number" ? player._ranking : "")}</div>
`;

  return cell;
}

export async function creaColonne(tournamentID, faseMenu, apiUrl, loggedUserUuid, roomId) {
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
    tournament = await tournamentApi.getTournamentBasic(tournamentId, apiUrl);
  } catch (e) {
    console.error("Errore fetch tournament:", e);
    tournament = null;
  }

  try {
    tournamentScripts = await tournamentApi.getTournamentScripts(tournamentId, apiUrl);
  } catch (e) {
    console.error("Errore fetch tournament scripts:", e);
    tournamentScripts = null;
  }

  const tournamentRankingDate = tournament && tournament.ranking_date ? normalizeYmd(tournament.ranking_date) : null;
  const rankingCtx = new RankingContext(tournamentRankingDate);
  try {
    players = await playerApi.getPlayersByRankingDate(tournamentRankingDate, apiUrl);
  } catch (e) {
    console.error("Errore fetch players:", e);
    players = [];
  }

  try {
    predictions = await predictionApi.getTournamentPredictions(tournamentId, apiUrl, { roomId });
  } catch (e) {
    console.error("Errore fetch predictions:", e);
    predictions = [];
  }

  if (!isPronosticiOnly) {
    try {
      const tree = await treeApi.getSuperuserTreeByTournament(tournamentId, apiUrl);
      const treeId = tree && (tree.id || tree.uuid);
      if (treeId) {
        matches = await treeApi.getMatchesByTreeId(treeId, apiUrl);
      }
    } catch (e) {
      console.error("Errore fetch tree/matches:", e);
      matches = [];
    }
  }

  // scoring functions from tournament scripts
  let pointsWinnerFn = null;
  let pointsSemiFn = null;
  try {
    const scripts = (tournamentScripts && tournamentScripts.Scripts) || [];
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

  predictions.forEach((prediction) => {
    //creazione header con dati dello scommettitore
    punteggi[prediction.user_uuid] = 0;

    const column = document.createElement("div");
    column.className = "column";

    const headerCell = document.createElement("div");
    headerCell.className = "header-cell";
    const userImg = prediction.avatar_url || prediction.img || prediction.user_image_url;
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
      const hasTournamentRanking = rankingCtx.hasRankingForPlayer(p);
      const r = hasTournamentRanking ? rankingCtx.getPlayerRanking(p) : null;
      p._ranking = r;
      p._rankingIssue = !rankingCtx.hasDate() || !hasTournamentRanking || r === null;
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
      const championId = isPronosticiOnly ? null : computeChampionId(matches);
      const status = isPronosticiOnly
        ? "inGara"
        : computeDisplayStatusForPick({ pickType: "winner", playerId: winner.id, selectedRound: round, matches });

      const reachedSemifinal = didPlayRound(winner.id, 2, matches);
      const inFinal = didPlayRound(winner.id, 1, matches);
      const finalDecided = championId !== null;
      const winnerLostFinal = finalDecided && Number(championId) !== Number(winner.id);

      const shouldCountAsSemifinalist =
        !isPronosticiOnly &&
        round !== null &&
        Number(round) <= 2 &&
        reachedSemifinal &&
        (!inFinal || winnerLostFinal);

      const effectivePickType = shouldCountAsSemifinalist ? "semifinalist" : "winner";
      if (shouldCountAsSemifinalist && !winner._rankingIssue && typeof winner._ranking === "number") {
        const base = pointsSemiFn(winner._ranking);
        winner._points = Number(base) || 0;
      }

      punteggi[prediction.user_uuid] +=
        pointsCountForPick({
          pickType: effectivePickType,
          playerId: winner.id,
          status,
          selectedRound: round,
          matches,
          reachedSemifinal,
        }) * (winner._points || 0);
      content.appendChild(
        createCell({
          title: "VINCITORE",
          player: winner,
          status,
          isWinner: true,
          roomId,
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
          roomId,
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
          roomId,
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
          roomId,
        })
      );
    }

    punteggioCell.innerHTML = `${punteggi[prediction.user_uuid]}`;
    column.appendChild(content);
    columnContainer.appendChild(column);
  });
}

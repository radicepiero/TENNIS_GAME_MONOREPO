import Player from "/js/domain/Player.js";
import { tournamentApi } from "/js/api/tournamentApi.js";
import { predictionApi } from "/js/api/predictionApi.js";
import { fetchJson } from "/js/utils.js";
import { setupPredictionAvatar } from "/js/ui/components/predictionAvatar.js";
import { buildSelectablePlayerCard } from "/js/ui/components/playerCard.js";
import { roomApi } from "/js/api/roomApi.js";
import {
  getEffectiveRoomId,
  setSelectedRoomId,
} from "/js/ui/utils/roomSelection.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  const raw = el ? el.textContent || "{}" : "{}";
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Funzione per ottenere i giocatori
  //---------------------------------------------------------------

  function getTournamentIdFromPath() {
    const path = String(window.location.pathname || "");
    const m = path.match(/(\d+)(?!.*\d)/);
    return m ? m[1] : "";
  }

  const { apiUrl = "" } = readBootstrap();

  let currentRoomId = getEffectiveRoomId();
  const roomCopySelect = document.getElementById("room-copy-select");
  const roomCopyButton = document.getElementById("room-copy-button");
  const roomCopyStatus = document.getElementById("room-copy-status");

  const isPredictionReady = () => {
    return (
      Array.isArray(semifinalists) &&
      semifinalists.length === 4 &&
      !(semifinalists || []).every((p) => p && p.prediction !== "winner")
    );
  };

  const updateActionsVisibility = () => {
    const ready = isPredictionReady();

    if (!isLockedTournament && submitButton) {
      submitButton.className = ready ? "visible" : "hidden";
    }

    const showCopy = !isLockedTournament && predictionEsiste && ready;
    if (roomCopyButton) roomCopyButton.style.display = showCopy ? "" : "none";
    if (roomCopySelect) roomCopySelect.style.display = showCopy ? "" : "none";
    if (roomCopyStatus) roomCopyStatus.style.display = showCopy ? "" : "none";
  };

  const setCopyStatus = (text) => {
    if (!roomCopyStatus) return;
    roomCopyStatus.textContent = text || "";
  };

  const parseHttpStatusFromError = (err) => {
    const msg = err && err.message ? String(err.message) : "";
    const m = msg.match(/HTTP\s+(\d{3})\b/);
    return m ? Number(m[1]) : null;
  };

  try {
    const rooms = await roomApi.getMyRooms(apiUrl);
    if (!currentRoomId && rooms && rooms.length) {
      const arena = (rooms || []).find((r) => r && String(r.name || "").toLowerCase() === "arena");
      if (arena && arena.id) currentRoomId = String(arena.id);
      else if (rooms[0] && rooms[0].id) currentRoomId = String(rooms[0].id);
    }
    if (currentRoomId) {
      setSelectedRoomId(String(currentRoomId));
    }

    if (roomCopySelect) {
      roomCopySelect.innerHTML = "";
      const currentIdStr = currentRoomId ? String(currentRoomId) : "";
      const others = (rooms || []).filter((r) => String(r.id) !== currentIdStr);
      others.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = String(r.id);
        opt.textContent = r && r.name ? String(r.name) : String(r.id);
        roomCopySelect.appendChild(opt);
      });
    }

    if (roomCopyButton) {
      roomCopyButton.addEventListener("click", async () => {
        const toRoomId = roomCopySelect && roomCopySelect.value ? String(roomCopySelect.value) : "";
        if (!toRoomId) {
          setCopyStatus("Seleziona una stanza di destinazione");
          return;
        }

        if (String(toRoomId) === String(currentRoomId || "")) {
          setCopyStatus("La stanza di destinazione è già quella corrente");
          return;
        }

        setCopyStatus("Copia in corso...");
        try {
          await predictionApi.copyPredictionToRoom(
            {
              tournamentId,
              fromRoomId: currentRoomId || null,
              toRoomId,
              overwrite: false,
            },
            apiUrl
          );

          setSelectedRoomId(String(toRoomId));
          const url = new URL(window.location.href);
          url.searchParams.set("room_id", String(toRoomId));
          window.location.href = url.toString();
        } catch (e) {
          const status = parseHttpStatusFromError(e);
          if (status === 409) {
            const ok = window.confirm(
              "Esiste già un pronostico nella stanza di destinazione. Vuoi sovrascriverlo?"
            );
            if (!ok) {
              setCopyStatus("Copia annullata");
              return;
            }

            try {
              await predictionApi.copyPredictionToRoom(
                {
                  tournamentId,
                  fromRoomId: currentRoomId || null,
                  toRoomId,
                  overwrite: true,
                },
                apiUrl
              );

              setSelectedRoomId(String(toRoomId));
              const url = new URL(window.location.href);
              url.searchParams.set("room_id", String(toRoomId));
              window.location.href = url.toString();
              return;
            } catch (e2) {
              console.error(e2);
              setCopyStatus("Errore durante la sovrascrittura");
              return;
            }
          }

          console.error(e);
          setCopyStatus("Errore durante la copia");
        }
      });
    }
  } catch (e) {
    // Non bloccare la pagina se rooms API non è disponibile
  }

  document.addEventListener("predictionAvatarUploaded", () => {
    try {
      updateActionsVisibility();
    } catch (e) {}
  });

  // Funzione per aggiornare i semifinalisti
  async function updateSemifinalists(prediction = false) {
    /*prediction
    [ {…}, {…}, {…}, {…} ]
    { player_id: 2, prediction: "semifinalist" }
    */
    /*semifinalists
    Array(4) [ {…}, {…}, {…}, {…} ]
    Object { id: 1, name: "Jannik Sinner", country: "ITA", … }​
      country: "ITA"
      created_at: "2025-02-27T18:55:14.697Z"
      id: 1
      image_alt: "Jannik Sinner"
      image_src: "https://www.atptour.com/-/media/alias/player-headshot/s0ag"
      name: "Jannik Sinner"
      prediction: "semifinalist"
      profile_url: "https://www.atptour.comhttps://www.atptour.com/en/players/jannik-sinner/s0ag/overview"
      // */
    const convertPredictionToSemifinalist = async (predictionRow) => {
      const player = await players.find(
        (player) => player.id === predictionRow.player_id
      );
      if (!player) {
        console.error("Player not found for id:", predictionRow.player_id);
        return null;
      }
      player.prediction = predictionRow.prediction;
      return player;
    };

    semifinalistsList.innerHTML = "";

    if (prediction) {
      for (const el of prediction) {
        const sem = await convertPredictionToSemifinalist(el); // Ascolta la promessa
        semifinalists.push(sem);
      }
    }

    const refreshPredictionUi = () => {
      const totalEl = document.getElementById("total-points");
      if (totalEl) {
        const total = (semifinalists || []).reduce((acc, p) => {
          if (!p) return acc;
          if (p.prediction === "winner") return acc + (Number(p.puntiWinner) || 0);
          return acc + (Number(p.puntiSemifinalist) || 0);
        }, 0);
        totalEl.textContent = String(total);
      }

      const winnerTitle = document.getElementById("winner-title");
      const canPickWinner = (semifinalists || []).length === 4;
      if (winnerTitle) winnerTitle.style.display = canPickWinner ? "block" : "none";

      updateActionsVisibility();
    };

    semifinalists.forEach((player) => {
      //inizializzo tutti a "semifinalist"
      if (!prediction) {
        player.prediction = "semifinalist";
      }
      //definisco le azioni che devono essere fatte quando si seleziona la checkbox
      //togliere il giocatore da semifinalist,  richaimare updateSemifinalists,
      //cercare il giocatore fra i player e mettere checkbox.checkeda false
      function checkBoxChange(event, player) {
        if (event.target.checked) {
        } else {
          //event.target.checked = false;
          semifinalists = semifinalists.filter((p) => p.name !== player.name);
        }
        const el = document
          .getElementById("players-list")
          .querySelector(`input[type="checkbox"][value='${player.name}']`);
        el.checked = false;
        updateSemifinalists();
      }

      const playerElement = buildSelectablePlayerCard(player, { onCheckboxChange: checkBoxChange });
      const checkbox = playerElement.querySelector("input[type='checkbox']");
      checkbox.checked = true;
      //console.log("semifinalist", playerCard.getElement());
      //aggiungo il radio button per indicare il finalista
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.id = `rd-${player.id}`;
      radio.name = "winner";
      radio.value = player.name;
      const label = document.createElement("label");
      label.htmlFor = radio.id;
      label.innerHTML = "Vincitore";
      const d = document.createElement("div");
      player.prediction === "winner"
        ? (radio.checked = true)
        : (radio.checked = false);
      d.append(radio, label);
      radio.onchange = function radioOnchange(event) {
        //metto tutti a "semifinalist" ma il target a "winner"
        //winnerName.innerText = "this.player.name";
        if (event.target.checked) {
          semifinalists.forEach((p) => (p.prediction = "semifinalist"));
          player.prediction = "winner";
          //aggiorno lo stile aggiornando le classi
          document
            .querySelectorAll(".winner")
            .forEach((el) => el.classList.remove("winner"));
          const winnerEl = semifinalistsList.querySelector(
            `.player[data-playerid="${String(player.id)}"]`
          );
          if (winnerEl) winnerEl.classList.add("winner");
          refreshPredictionUi();
        }
      };
      const sem = playerElement;
      player.prediction === "winner"
        ? sem.classList.add("winner")
        : sem.classList.add("semifinalist");
      sem.insertBefore(d, sem.firstChild);
      semifinalistsList.appendChild(sem);
      //predictionEsiste? deleteButton.
    });

    refreshPredictionUi();
  }
  //-----------fine updateSemifinalsits
  //---------------------------------------------------------------
  let semifinalists = [];
  let predictionEsiste = false;
  let isLockedTournament = false;
  const playersList = document.getElementById("players-list");
  const semifinalistsList = document.getElementById("semifinalists-list");
  //  const winnerName = document.getElementById("winner-name");
  const submitButton = document.getElementById("submit-button");
  const deleteButton = document.getElementById("delete-button");
  const hiddenUrl = document.getElementById("prediction_avatar_url");
  // Caricamento giocatori e creazione elementi
  const tournamentId = getTournamentIdFromPath();
  const tournament = await tournamentApi.getTournamentScripts(tournamentId, apiUrl);

  isLockedTournament = ["completed", "in-progress", "excluded"].includes(String(tournament && tournament.status));

  const titolo = document.getElementById("torneo");
  if (titolo) titolo.innerHTML = tournament && tournament.name ? tournament.name : "";

  const lockEl = document.getElementById("tournament-lock-message");
  if (lockEl) {
    const st = tournament && tournament.status ? String(tournament.status).toLowerCase() : "";
    let msg = "";
    if (st === "in-progress") {
      msg = "Pronostico non modificabile: il torneo è in corso.";
    } else if (st === "completed") {
      msg = "Pronostico non modificabile: il torneo è completato.";
    } else if (st === "excluded") {
      msg = "Pronostico non modificabile: il torneo è escluso.";
    }
    if (msg) {
      lockEl.textContent = msg;
      lockEl.style.display = "block";
    } else {
      lockEl.style.display = "none";
    }
  }

  const players = await Player.fetchByTournament(tournament, apiUrl);
  //console.log("players", players);
  const predictionObj = await predictionApi
    .getUserPredictionByTournament(tournamentId, apiUrl, { roomId: currentRoomId })
    .catch(() => null);
  const prediction = (predictionObj && predictionObj.rows) || [];
  predictionEsiste = Array.isArray(prediction) && prediction.length > 0;

  try {
    const hiddenUrl = document.getElementById("prediction_avatar_url");
    const existingAvatarUrl = predictionObj && predictionObj.avatar_url ? String(predictionObj.avatar_url) : "";
    if (hiddenUrl && existingAvatarUrl) hiddenUrl.value = existingAvatarUrl;
  } catch (e) {}

  await setupPredictionAvatar();

  if (predictionEsiste) {
    await updateSemifinalists(prediction);
    if (deleteButton) deleteButton.className = "visible";
    if (submitButton) submitButton.textContent = "Salva Pronostico";
  } else {
    if (deleteButton) deleteButton.className = "hidden";
  }

  if (isLockedTournament) {
    if (submitButton) submitButton.className = "hidden";
    if (deleteButton) deleteButton.className = "hidden";
  }

  updateActionsVisibility();
  //console.log("prediction", prediction);

  players.forEach((player) => {
    // Funzione per gestire la selezione del giocatore
    function checkBoxChange(event, player) {
      if (isLockedTournament) {
        event.target.checked = false;
        return;
      }
      if (event.target.checked) {
        if (semifinalists.length < 4) {
          player.prediction = "semifinalist";
          semifinalists.push(player);
        } else {
          event.target.checked = false;
          alert("Puoi selezionare massimo 4 semifinalisti!");
        }
      } else {
        semifinalists = semifinalists.filter((p) => p.name !== player.name);
      }
      updateSemifinalists();
    }

    let giocatoreInPrediction = semifinalists.some(
      (el) => el.name === player.name
    );

    const playerElement = buildSelectablePlayerCard(player, { onCheckboxChange: checkBoxChange });
    // Aggiorna lo stato della checkbox
    const checkbox = playerElement.querySelector("input[type='checkbox']");
    if (checkbox) {
      checkbox.checked = giocatoreInPrediction;
    }

    playersList.appendChild(playerElement);
  });

  // Gestione invio pronostico
  submitButton.addEventListener("click", async () => {
    if (isLockedTournament) {
      alert("Pronostici bloccati per questo torneo");
      return;
    }
    const pronostico = {
      tournament_id: tournamentId,
      avatar_url: hiddenUrl && hiddenUrl.value ? hiddenUrl.value : undefined,
      rows: semifinalists.map((player) => ({
        player_id: player.id,
        prediction: player.prediction,
      })),
    };

    if (
      pronostico.rows.length !== 4 ||
      pronostico.rows.every((p) => p.prediction !== "winner")
    ) {
      alert("Devi selezionare 4 semifinalisti e un vincitore!");
      return;
    }

    try {
      await predictionApi.createPrediction(pronostico, apiUrl, { roomId: currentRoomId });
      alert("Pronostico inviato con successo!");
      location.reload();
    } catch (error) {
      console.error("Errore nell'invio dei dati:", error);
    }
  });

  deleteButton.addEventListener("click", async () => {
    if (isLockedTournament) {
      alert("Pronostici bloccati per questo torneo");
      return;
    }

    try {
      const avatarToDelete = hiddenUrl && hiddenUrl.value ? String(hiddenUrl.value) : "";
      if (avatarToDelete && avatarToDelete.startsWith("/uploads/predictions/")) {
        await fetchJson("/pronostico/delete-avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: avatarToDelete }),
        }).catch(() => null);
      }
    } catch (e) {}

    const pronostico = {
      tournament_id: tournamentId,
      rows: semifinalists.map((player) => ({
        player_id: player.id,
        prediction: player.prediction,
      })),
    };

    if (
      pronostico.rows.length !== 4 ||
      pronostico.rows.every((p) => p.prediction !== "winner")
    ) {
      alert("Devi selezionare 4 semifinalisti e un vincitore!");
      return;
    }

    try {
      await predictionApi.deletePrediction(pronostico, apiUrl, { roomId: currentRoomId });
      location.reload();
      alert("Pronostico eliminato!");
    } catch (error) {
      console.error("Errore nell'invio dei dati per la cancellazione:", error);
    }
  });
});

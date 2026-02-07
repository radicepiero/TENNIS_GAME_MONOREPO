import { tournamentApi } from "/js/api/tournamentApi.js";
import { $ } from "/js/utils.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  const raw = el ? el.textContent || "{}" : "{}";
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function loadTournaments({ apiUrl }) {
  try {
    const tournaments = await tournamentApi.listTournaments(apiUrl);
    const tournamentGrid = $("tournament-grid");
    if (!tournamentGrid) return;

    (tournaments || []).forEach((tournament) => {
      const tournamentContainer = document.createElement("div");
      tournamentContainer.className = "tournament-container";

      const button = document.createElement("a");
      button.href = tournament.href;
      button.className = `tournament-button ${tournament.status}`;
      button.style.backgroundImage = `url('${tournament.image}')`;
      button.textContent = tournament.name;
      tournamentContainer.appendChild(button);

      if (tournament.status === "open") {
        const pronosticoButton = document.createElement("button");
        pronosticoButton.className = "pronostico-button";
        pronosticoButton.textContent = "Pronostico";
        pronosticoButton.addEventListener("click", () => {
          window.location.href = `/tornei/${tournament.id}/pronostico`;
        });
        tournamentContainer.appendChild(pronosticoButton);
      }

      if (tournament.status === "open") {
        const alberoButton = document.createElement("button");
        alberoButton.className = "pronostico-button";
        alberoButton.textContent = "Crea l'albero del torneo";
        alberoButton.addEventListener("click", () => {
          window.location.href = `/tornei/${tournament.id}/genera-albero`;
        });
        tournamentContainer.appendChild(alberoButton);
      }

      const editButton = document.createElement("button");
      editButton.className = "pronostico-button";
      editButton.textContent = "Modifica";
      editButton.addEventListener("click", () => {
        window.location.href = `/tornei/${tournament.id}/edit`;
      });
      tournamentContainer.appendChild(editButton);

      tournamentGrid.appendChild(tournamentContainer);
    });
  } catch (error) {
    console.error("Si è verificato un errore:", error);
  }
}

async function init() {
  const { apiUrl = "" } = readBootstrap();
  await loadTournaments({ apiUrl });
}

init();

async function loadTournaments({ apiUrl }) {
  try {
    const url = `${apiUrl}/tournaments`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Errore nel caricamento dei dati dei tornei");
    }

    const tournaments = await response.json();
    const tournamentGrid = document.getElementById("tournament-grid");
    if (!tournamentGrid) return;

    tournaments.forEach((tournament) => {
      const tournamentContainer = document.createElement("div");
      tournamentContainer.className = "tournament-container";

      const button = document.createElement("a");
      button.href = tournament.href;
      button.className = `tournament-button ${tournament.status}`;
      button.style.backgroundImage = `url('${tournament.image}')`;
      button.textContent = tournament.name;
      tournamentContainer.appendChild(button);

      if (tournament.status === "upcoming") {
        const pronosticoButton = document.createElement("button");
        pronosticoButton.className = "pronostico-button";
        pronosticoButton.textContent = "Pronostico";
        pronosticoButton.addEventListener("click", () => {
          window.location.href = `/tornei/${tournament.id}/pronostico`;
        });
        tournamentContainer.appendChild(pronosticoButton);
      }

      if (tournament.status === "upcoming") {
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

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const apiUrl = root.dataset.apiUrl;
  if (!apiUrl) {
    console.error("apiUrl non definito");
    return;
  }
  loadTournaments({ apiUrl });
});

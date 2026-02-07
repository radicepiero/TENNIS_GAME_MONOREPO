import { playerApi } from "/js/api/playerApi.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch (e) {
    return {};
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function createRankingList(data) {
  const list = Array.isArray(data) ? data : [];
  const sortedData = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  const container = document.getElementById("rankingsContainer");
  if (!container) return;
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "Storico Ranking";
  container.appendChild(title);

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const dateHeader = document.createElement("th");
  dateHeader.textContent = "Data";

  const rankHeader = document.createElement("th");
  rankHeader.textContent = "Posizione";

  headerRow.appendChild(dateHeader);
  headerRow.appendChild(rankHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  sortedData.forEach((item) => {
    const row = document.createElement("tr");
    const d = item && item.date ? String(item.date).slice(0, 10) : "";
    const m = d ? d.split("-") : [];
    const formattedDate = m.length === 3 ? `${m[2]}-${m[1]}-${String(m[0]).slice(-2)}` : d;

    const dateCell = document.createElement("td");
    dateCell.textContent = formattedDate;

    const rankCell = document.createElement("td");
    rankCell.textContent = item && typeof item.ranking !== "undefined" ? String(item.ranking) : "";

    row.appendChild(dateCell);
    row.appendChild(rankCell);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function displaySearchResults(players) {
  const searchResults = document.getElementById("searchResults");
  if (!searchResults) return;

  const list = Array.isArray(players) ? players : [];

  if (list.length === 0) {
    searchResults.innerHTML = '<div style="padding: 10px;">Nessun giocatore trovato</div>';
    searchResults.style.display = "block";
    return;
  }

  searchResults.innerHTML = "";
  list.forEach((player) => {
    const div = document.createElement("div");
    div.style.padding = "10px";
    div.style.borderBottom = "1px solid #eee";
    div.style.cursor = "pointer";

    const name = player && player.name ? String(player.name) : "";
    const country = player && player.country ? String(player.country) : "";
    div.innerHTML = `<strong>${name}</strong>${country ? ` (${country})` : ""}`;

    div.addEventListener("click", () => {
      const id = player && typeof player.id !== "undefined" ? String(player.id) : "";
      if (!id) return;
      window.location.href = `/tennisti/${encodeURIComponent(id)}/edit`;
    });

    div.addEventListener("mouseover", () => {
      div.style.backgroundColor = "#f0f0f0";
    });

    div.addEventListener("mouseout", () => {
      div.style.backgroundColor = "white";
    });

    searchResults.appendChild(div);
  });

  searchResults.style.display = "block";
}

document.addEventListener("DOMContentLoaded", async () => {
  const { apiUrl, player } = readBootstrap();

  if (player && Array.isArray(player.Rankings)) {
    createRankingList(player.Rankings);
  }

  const form = document.getElementById("form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(form));
      const id = data && data.id !== undefined ? String(data.id) : "";
      if (!id) return;

      try {
        await playerApi.updatePlayer(id, data, apiUrl);
        alert("Giocatore aggiornato con successo!");
      } catch (error) {
        alert("Errore durante l'invio della richiesta.");
        console.error(error);
      }
    });
  }

  const searchInput = document.getElementById("playerSearch");
  const searchResults = document.getElementById("searchResults");

  const doSearch = async (q) => {
    const query = String(q || "").trim();

    if (!searchResults) return;
    if (query.length < 2) {
      searchResults.style.display = "none";
      return;
    }

    try {
      const players = await playerApi.searchPlayers(query, apiUrl);
      displaySearchResults(players);
    } catch (error) {
      console.error("Errore nella ricerca:", error);
    }
  };

  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => doSearch(e && e.target ? e.target.value : ""), 300));
  }

  document.addEventListener("click", (e) => {
    if (!searchResults || !searchInput) return;
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.style.display = "none";
    }
  });
});

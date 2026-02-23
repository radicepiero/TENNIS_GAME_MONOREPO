import { Ranking } from "/js/domain/Ranking.js";
import Player from "/js/domain/Player.js";
import { formatDmyShort } from "/js/utils.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch (e) {
    return {};
  }
}

function formatDate(dateInput) {
  if (!dateInput) return null;
  try {
    const date = new Date(dateInput);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
  } catch (e) {
    return null;
  }
}

function togglePlayerImages(playerId, show) {
  document.querySelectorAll(`.player-avatar[data-player-id="${playerId}"]`).forEach((img) => {
    img.style.display = show ? "inline-block" : "none";
    const nameSpan = img.nextElementSibling;
    if (nameSpan && nameSpan.classList.contains("player-name")) {
      nameSpan.style.display = show ? "none" : "inline";
    }
  });
}

function generateRankingTable(data) {
  if (!Array.isArray(data)) {
    console.error("Invalid data format. Expected an array.");
    return;
  }

  const allDates = data.map((item) => item.date && formatDate(item.date)).filter(Boolean);
  const uniqueDates = new Set(allDates);
  const dates = Array.from(uniqueDates).sort((a, b) => new Date(b) - new Date(a));

  if (dates.length === 0) {
    console.error("No valid dates found in the data.");
    return;
  }

  const rankingMap = new Map();
  const playerInfoMap = new Map();

  data.forEach((item) => {
    if (!item.date || !item.ranking || !item.Player) return;

    const dateStr = formatDate(item.date);
    if (!dateStr) return;

    if (!rankingMap.has(dateStr)) {
      rankingMap.set(dateStr, new Map());
    }

    if (!playerInfoMap.has(item.Player.id)) {
      playerInfoMap.set(item.Player.id, {
        name: item.player_name,
        image_alt: item.Player.image_alt,
        image_src: item.Player.image_src,
      });
    }

    rankingMap.get(dateStr).set(item.ranking, {
      player_id: item.Player.id,
      ranking: item.ranking,
    });
  });

  const datesHeader = document.getElementById("datesHeader");
  while (datesHeader && datesHeader.children.length > 2) {
    datesHeader.removeChild(datesHeader.lastChild);
  }

  const headerFragment = document.createDocumentFragment();
  dates.forEach((date, idx) => {
    const th = document.createElement("th");
    th.className = "date-header";
    th.textContent = formatDmyShort(date);
    th.style.zIndex = String(dates.length - idx + 2);
    headerFragment.appendChild(th);
  });
  if (datesHeader) datesHeader.appendChild(headerFragment);

  const tbody = document.getElementById("rankingBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (let rank = 1; rank <= 100; rank++) {
    const row = document.createElement("tr");

    const playerCol = document.createElement("td");
    playerCol.className = "player-col";

    const firstDate = dates[0];
    const firstDateData = rankingMap.get(firstDate)?.get(rank);
    let playerData = null;

    if (firstDateData) {
      playerData = playerInfoMap.get(firstDateData.player_id);
    }

    if (playerData) {
      playerCol.innerHTML = `
          <label class="player-toggle">
            <input type="checkbox" class="player-toggle-checkbox"
                   data-player-id="${firstDateData.player_id}">
            <span class="player-name">${playerData.name}</span>
            <img src="${playerData.image_src}"
                 alt="${playerData.image_alt}"
                 class="player-avatar"
                 style="display: none">
          </label>
        `;
    } else {
      playerCol.textContent = `Rank ${rank}`;
    }
    row.appendChild(playerCol);

    const rankCell = document.createElement("td");
    rankCell.textContent = String(rank);
    rankCell.className = "rank-col";
    row.appendChild(rankCell);

    dates.forEach((date) => {
      const cell = document.createElement("td");
      const dateData = rankingMap.get(date)?.get(rank);

      if (dateData) {
        const pd = playerInfoMap.get(dateData.player_id);
        if (pd) {
          cell.innerHTML = `
              <img src="${pd.image_src}"
                   alt="${pd.image_alt}"
                   class="player-avatar"
                   data-player-id="${dateData.player_id}"
                   style="display: none">
              <span class="player-name">${pd.name}</span>
            `;
        } else {
          cell.textContent = "-";
        }
      } else {
        cell.textContent = "-";
      }
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  }

  document.querySelectorAll(".player-toggle-checkbox").forEach((checkbox) => {
    checkbox.checked = false;

    const playerId = checkbox.dataset.playerId;
    const prefs = JSON.parse(localStorage.getItem("playerImagePrefs")) || {};
    delete prefs[playerId];
    localStorage.setItem("playerImagePrefs", JSON.stringify(prefs));

    checkbox.addEventListener("change", (e) => {
      const pid = e.target.dataset.playerId;
      const isVisible = e.target.checked;

      togglePlayerImages(pid, isVisible);

      const nextPrefs = JSON.parse(localStorage.getItem("playerImagePrefs")) || {};
      if (isVisible) {
        nextPrefs[pid] = true;
      } else {
        delete nextPrefs[pid];
      }
      localStorage.setItem("playerImagePrefs", JSON.stringify(nextPrefs));
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const { apiUrl } = readBootstrap();

  try {
    void Player;

    const rankingData = await Ranking.query({
      API: apiUrl,
      ranking_min: 1,
      ranking_max: 100,
      includePlayer: true,
    });

    generateRankingTable(rankingData);

    document.querySelectorAll(".player-name").forEach((nameSpan) => {
      nameSpan.style.display = "inline";
    });
  } catch (error) {
    console.error("Error loading rankings:", error);
    const tbody = document.getElementById("rankingBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="100%">Errore nel caricamento dei dati</td></tr>
      `;
    }
  }
});

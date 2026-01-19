import { APP_ICONS } from "./icons.js";
import { buildTournamentCard } from "./tournamentCard.js";

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

    const viewMode = document.documentElement.dataset.viewMode || "";
    const isFriendsView = viewMode === "friends";

    const tournamentYear = (t) => {
      const df = t && t.datafine ? new Date(t.datafine) : null;
      if (!df || Number.isNaN(df.getTime())) return null;
      return df.getUTCFullYear();
    };

    const getTournamentStatus = (t) => (t && t.status ? String(t.status).toLowerCase() : "");

    const setupFriendsFiltersUi = ({ tournaments }) => {
      const titleEl = document.getElementById("friends-title");
      const modalEl = document.getElementById("friends-filter-modal");
      const closeBtn = document.getElementById("friends-filter-close");
      const applyBtn = document.getElementById("friends-filter-apply");
      const yearSelect = document.getElementById("friendsYearSelect");
      const statusBox = document.getElementById("friendsStatusBox");

      if (!titleEl || !modalEl || !yearSelect || !statusBox || !applyBtn || !closeBtn) {
        return null;
      }

      const years = Array.from(
        new Set((tournaments || []).map((t) => tournamentYear(t)).filter((y) => Number.isFinite(y)))
      ).sort((a, b) => b - a);

      const currentYear = new Date().getFullYear();
      const defaultYear = years.includes(currentYear) ? currentYear : years[0] || currentYear;

      const allStatuses = ["excluded", "upcoming", "open", "in-progress", "completed"];

      let selectedYear = defaultYear;
      let selectedStatuses = new Set(allStatuses.filter((s) => s !== "excluded"));

      const setTitle = () => {
        titleEl.innerHTML = `Tornei ATP ${selectedYear} ${APP_ICONS.EDIT}`;
      };

      const openModal = () => {
        modalEl.classList.add("is-open");
        modalEl.setAttribute("aria-hidden", "false");
      };

      const closeModal = () => {
        modalEl.classList.remove("is-open");
        modalEl.setAttribute("aria-hidden", "true");
      };

      const fillYears = () => {
        yearSelect.innerHTML = "";
        years.forEach((y) => {
          const opt = document.createElement("option");
          opt.value = String(y);
          opt.textContent = String(y);
          yearSelect.appendChild(opt);
        });
        yearSelect.value = String(selectedYear);
      };

      const fillStatuses = () => {
        statusBox.innerHTML = "";
        allStatuses.forEach((st) => {
          const id = `friends-status-${st}`;
          const wrap = document.createElement("label");
          wrap.className = "friends-filter-status__item";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.id = id;
          cb.value = st;
          cb.checked = selectedStatuses.has(st);

          const text = document.createElement("span");
          text.textContent = st;

          wrap.appendChild(cb);
          wrap.appendChild(text);
          statusBox.appendChild(wrap);
        });
      };

      fillYears();
      fillStatuses();
      setTitle();

      titleEl.classList.add("friends-title--clickable");
      titleEl.addEventListener("click", openModal);

      closeBtn.innerHTML = APP_ICONS.CLOSE;
      closeBtn.addEventListener("click", closeModal);

      modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) closeModal();
      });

      applyBtn.addEventListener("click", () => {
        const y = Number(yearSelect.value);
        if (Number.isFinite(y)) selectedYear = y;

        const nextStatuses = new Set();
        statusBox.querySelectorAll("input[type=checkbox]").forEach((cb) => {
          if (cb.checked) nextStatuses.add(cb.value);
        });
        // Non permettere selezione vuota: se vuota, ripristina tutto
        selectedStatuses = nextStatuses.size > 0 ? nextStatuses : new Set(allStatuses);

        setTitle();
        closeModal();

        if (typeof filters.onChange === "function") {
          filters.onChange({ selectedYear, selectedStatuses: new Set(selectedStatuses) });
        }
      });

      const filters = {
        get selectedYear() {
          return selectedYear;
        },
        get selectedStatuses() {
          return new Set(selectedStatuses);
        },
        onChange: null,
      };

      return filters;
    };

    const renderFriends = () => {
      const filters = setupFriendsFiltersUi({ tournaments });
      if (!filters) return;

      const paint = () => {
        tournamentGrid.innerHTML = "";

        (tournaments || [])
          .filter((t) => tournamentYear(t) === filters.selectedYear)
          .filter((t) => filters.selectedStatuses.has(getTournamentStatus(t)))
          .sort((a, b) => {
            const aTime = new Date(a && (a.dataopen || a.datainizio || a.datafine) || 0).getTime();
            const bTime = new Date(b && (b.dataopen || b.datainizio || b.datafine) || 0).getTime();
            return aTime - bTime;
          })
          .forEach((tournament) => {
            tournamentGrid.appendChild(buildTournamentCard(tournament, { apiUrl }));
          });
      };

      filters.onChange = () => paint();
      paint();
    };

    if (!isFriendsView) return;
    try {
      if (window.sessionStorage) {
        const keys = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && String(k).startsWith("skipAutoClone:")) keys.push(k);
        }
        keys.forEach((k) => window.sessionStorage.removeItem(k));
      }
    } catch (e) {}
    renderFriends();
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

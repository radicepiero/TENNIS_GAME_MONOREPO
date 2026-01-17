import { APP_ICONS } from "./icons.js";

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

    const normalizeYmd = (v) => {
      if (!v) return "";
      const s = String(v);
      return s.length >= 10 ? s.slice(0, 10) : s;
    };

    const formatDmyShort = (v) => {
      const ymd = normalizeYmd(v);
      if (!ymd || ymd.length < 10) return ymd;
      const [yyyy, mm, dd] = ymd.split("-");
      if (!yyyy || !mm || !dd) return ymd;
      return `${dd}-${mm}-${String(yyyy).slice(-2)}`;
    };

    let supportsFlagEmojiCache = null;
    const supportsFlagEmoji = () => {
      if (supportsFlagEmojiCache !== null) return supportsFlagEmojiCache;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (!ctx) return (supportsFlagEmojiCache = false);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "28px sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText("🇮🇹", 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let nonZero = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) {
            nonZero++;
            if (nonZero > 10) break;
          }
        }
        supportsFlagEmojiCache = nonZero > 10;
        return supportsFlagEmojiCache;
      } catch (e) {
        supportsFlagEmojiCache = false;
        return false;
      }
    };

    const countryToFlag = (countryRaw) => {
      const c = String(countryRaw || "").trim().toLowerCase();
      const map = {
        italia: "IT",
        australia: "AU",
        spagna: "ES",
        francia: "FR",
        germania: "DE",
        olanda: "NL",
        monaco: "MC",
        qatar: "QA",
        "stati uniti": "US",
        argentina: "AR",
        brasile: "BR",
        canada: "CA",
        cina: "CN",
        giappone: "JP",
        regno: "GB",
        "regno unito": "GB",
        svezia: "SE",
        svizzera: "CH",
        emirati: "AE",
        "emirati arabi": "AE",
        "emirati arabi uniti": "AE",
      };
      const direct = c.length === 2 ? c.toUpperCase() : "";
      const code = direct || map[c] || "";
      if (!code || code.length !== 2) return "";
      if (!supportsFlagEmoji()) return code;
      const A = 0x1f1e6;
      const pts = code
        .toUpperCase()
        .split("")
        .map((ch) => A + ch.charCodeAt(0) - 65);
      return String.fromCodePoint(...pts);
    };

    const tournamentYear = (t) => {
      const df = t && t.datafine ? new Date(t.datafine) : null;
      if (!df || Number.isNaN(df.getTime())) return null;
      return df.getUTCFullYear();
    };

    const formatPrizeMoney = (t) => {
      const value = Number(t && t.prizemoney);
      if (!Number.isFinite(value)) return "";
      const currency = (t && t.currency) || "";
      try {
        return `${currency} ${new Intl.NumberFormat("it-IT").format(value)}`;
      } catch (e) {
        return `${currency} ${value}`;
      }
    };

    const createIconButton = ({ icon, title, href, className = "", disabled = false }) => {
      const a = document.createElement("a");
      a.href = href;
      a.className = `icon-btn ${className} ${disabled ? "icon-btn--disabled" : ""}`.trim();
      a.title = title;
      a.setAttribute("aria-label", title);
      a.textContent = icon;
      if (disabled) {
        a.setAttribute("aria-disabled", "true");
        a.tabIndex = -1;
        a.addEventListener("click", (e) => e.preventDefault());
      }
      return a;
    };

    const statusShadowClass = (status) => {
      const st = status ? String(status).toLowerCase() : "";
      if (st === "upcoming") return "tournament-card--shadow-upcoming";
      if (st === "open") return "tournament-card--shadow-open";
      if (st === "in-progress") return "tournament-card--shadow-in-progress";
      return ""; // completed: no shadow
    };

    const surfaceBackgroundClass = (surfaceRaw) => {
      const s = String(surfaceRaw || "").toLowerCase();
      if (s.includes("grass")) return "tournament-card--surface-grass";
      if (s.includes("clay")) return "tournament-card--surface-clay";
      if (s.includes("hard")) return "tournament-card--surface-hard";
      if (s.includes("carpet")) return "tournament-card--surface-carpet";
      return "tournament-card--surface-other";
    };

    const getTournamentStatus = (t) => (t && t.status ? String(t.status).toLowerCase() : "");

    const statusLabel = (statusRaw) => {
      const st = String(statusRaw || "").toLowerCase();
      if (st === "excluded") return "torneo escluso dal gioco";
      if (st === "open") return "Fai il tuo pronostico";
      if (st === "in-progress") return "Segui i risultati dei pronostici";
      if (st === "completed") return "Verifica il punteggio";
      return st;
    };

    const statusHref = (t) => {
      const st = getTournamentStatus(t);
      if (st === "open") return `/tornei/${t.id}/pronostico`;
      if (st === "in-progress" || st === "completed") return `/tornei/${t.id}/sviluppo`;
      return "";
    };

    const superuserTreeExistsCache = new Map();
    const checkSuperuserTreeExists = async (tournamentId) => {
      const key = String(tournamentId);
      if (superuserTreeExistsCache.has(key)) {
        const v = superuserTreeExistsCache.get(key);
        return typeof v === "boolean" ? v : await v;
      }
      const p = (async () => {
        try {
          const res = await fetch(
            `${apiUrl}/trees/superuser/${encodeURIComponent(tournamentId)}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );
          if (!res.ok) return false;
          const json = await res.json().catch(() => null);
          return Boolean(json && (json.id || json.uuid));
        } catch (e) {
          return false;
        }
      })();
      superuserTreeExistsCache.set(key, p);
      const ok = await p;
      superuserTreeExistsCache.set(key, ok);
      return ok;
    };

    const isActionAllowed = {
      pronostico: (t) => {
        const st = getTournamentStatus(t);
        return st !== "excluded";
      },
      compilaAlbero: (t) => getTournamentStatus(t) === "open",
      sviluppo: (t) => {
        const st = getTournamentStatus(t);
        return st === "completed" || st === "in-progress";
      },
      superuserTree: (t) => getTournamentStatus(t) !== "excluded",
      atp: (t) => Boolean(t && t.href),
    };

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

      tournamentGrid.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-country-toggle]") : null;
        if (!btn) return;
        const wrap = btn.closest("[data-country-wrap]");
        if (!wrap) return;
        const name = wrap.querySelector("[data-country-name]");
        if (!name) return;
        name.classList.toggle("is-hidden");
      });

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
            const tournamentContainer = document.createElement("div");
            tournamentContainer.className = [
              "tournament-card",
              statusShadowClass(tournament.status),
              surfaceBackgroundClass(tournament.surface),
            ]
              .filter(Boolean)
              .join(" ");

            const header = document.createElement("div");
            header.className = "tournament-card__header";
            header.style.backgroundImage = tournament.image ? `url('${tournament.image}')` : "none";

            const category = document.createElement("div");
            category.className = "tournament-card__category";
            category.textContent = `${tournament.category || ""}`;

            const title = document.createElement("div");
            title.className = "tournament-card__title";
            const nickname = String(tournament.nickname || "").trim();
            title.textContent = nickname;

            const meta = document.createElement("div");
            meta.className = "tournament-card__meta";
            const statusText = statusLabel(tournament.status);
            const href = statusHref(tournament);
            const statusEl = href
              ? `<a class="tournament-status-link" href="${href}">${statusText}</a>`
              : `<button type="button" class="tournament-status-link tournament-status-link--disabled" aria-disabled="true">${statusText}</button>`;

            const city = tournament.location || "";
            const country = tournament.country || "";
            const flag = countryToFlag(country);
            const where = city || country
              ? `<span class="tournament-where" data-country-wrap><span class="tournament-city">${city}</span><button type="button" class="tournament-flag" data-country-toggle aria-label="Nazione">${flag}</button><span class="tournament-country is-hidden" data-country-name>${country}</span></span>`
              : "";

            const openRow = tournament.dataopen
              ? `<div>open: ${formatDmyShort(tournament.dataopen)}</div>`
              : "";

            const st = getTournamentStatus(tournament);
            const maybeEasyWin = st === "open"
              ? `<a class="tournament-status-link tournament-easywin-btn is-hidden" data-easywin-btn data-tournament-id="${tournament.id}" href="/tornei/${tournament.id}/albero-pronostico">usa il tabellone per vincere facile</a>`
              : "";

            const superLabel = st === "open" ? "tabellone" : "guarda i risultati";
            const superBtn = `<a class="tournament-status-link tournament-superuser-tree-btn is-hidden" data-superuser-tree-btn data-tournament-id="${tournament.id}" href="/tornei/${tournament.id}/albero-superuser">${superLabel}</a>`;
            meta.innerHTML = `
              <div>${statusEl}</div>
              ${maybeEasyWin}
              ${superBtn}
              <div>dal ${formatDmyShort(tournament.datainizio)} al ${formatDmyShort(tournament.datafine)}</div>
              ${openRow}
              <div>${where}</div>
            `;

            header.appendChild(category);
            header.appendChild(title);
            header.appendChild(meta);
            tournamentContainer.appendChild(header);

            // superuser tree dependent actions
            {
              const easywinBtn = meta.querySelector("[data-easywin-btn]");
              const superTreeBtn = meta.querySelector("[data-superuser-tree-btn]");
              const applyExists = (exists) => {
                if (!exists) return;
                if (superTreeBtn) superTreeBtn.classList.remove("is-hidden");
                if (st === "open") {
                  if (easywinBtn) easywinBtn.classList.remove("is-hidden");
                }
              };

              checkSuperuserTreeExists(tournament.id).then((exists) => applyExists(exists));
            }
            tournamentGrid.appendChild(tournamentContainer);
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

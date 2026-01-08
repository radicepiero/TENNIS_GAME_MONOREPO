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

    const surfaceClass = (surfaceRaw) => {
      const s = String(surfaceRaw || "").toLowerCase();
      if (s.includes("grass")) return "surface--grass";
      if (s.includes("clay")) return "surface--clay";
      if (s.includes("hard")) return "surface--hard";
      if (s.includes("carpet")) return "surface--carpet";
      return "surface--other";
    };

    const statusBadge = (status) => {
      const st = status ? String(status).toLowerCase() : "";
      return `<span class="badge badge--${st}">${st}</span>`;
    };

    const isCompletedOrInProgress = (t) => {
      const st = t && t.status ? String(t.status).toLowerCase() : "";
      return st === "completed" || st === "in-progress";
    };

    const createIconButton = ({ icon, title, href, className = "" }) => {
      const a = document.createElement("a");
      a.href = href;
      a.className = `icon-btn ${className}`.trim();
      a.title = title;
      a.setAttribute("aria-label", title);
      a.textContent = icon;
      return a;
    };

    const renderFriends = () => {
      const yearSelect = document.getElementById("yearSelect");
      const years = Array.from(
        new Set((tournaments || []).map((t) => tournamentYear(t)).filter((y) => Number.isFinite(y)))
      ).sort((a, b) => b - a);

      const currentYear = new Date().getFullYear();
      const defaultYear = years.includes(currentYear) ? currentYear : years[0] || currentYear;
      let selectedYear = defaultYear;

      if (yearSelect) {
        yearSelect.innerHTML = "";
        years.forEach((y) => {
          const opt = document.createElement("option");
          opt.value = String(y);
          opt.textContent = String(y);
          yearSelect.appendChild(opt);
        });
        yearSelect.value = String(defaultYear);
        yearSelect.addEventListener("change", () => {
          const y = Number(yearSelect.value);
          if (Number.isFinite(y)) {
            selectedYear = y;
            paint();
          }
        });
      }

      const paint = () => {
        tournamentGrid.innerHTML = "";

        (tournaments || [])
          .filter((t) => String(t && t.status).toLowerCase() !== "excluded")
          .filter((t) => tournamentYear(t) === selectedYear)
          .sort((a, b) => {
            const aTime = new Date(a && (a.dataopen || a.datainizio || a.datafine) || 0).getTime();
            const bTime = new Date(b && (b.dataopen || b.datainizio || b.datafine) || 0).getTime();
            return aTime - bTime;
          })
          .forEach((tournament) => {
            const tournamentContainer = document.createElement("div");
            tournamentContainer.className = "tournament-card";

            const header = document.createElement("div");
            header.className = "tournament-card__header";
            header.style.backgroundImage = tournament.image ? `url('${tournament.image}')` : "none";

            const title = document.createElement("div");
            title.className = "tournament-card__title";
            title.innerHTML = `${tournament.name || ""} ${statusBadge(tournament.status)}`;

            const meta = document.createElement("div");
            meta.className = "tournament-card__meta";
            meta.innerHTML = `
              <div>inizio: ${normalizeYmd(tournament.datainizio)} | fine: ${normalizeYmd(tournament.datafine)}</div>
              <div>open: ${normalizeYmd(tournament.dataopen)}</div>
            `;

            const tags = document.createElement("div");
            tags.className = "tournament-card__tags";
            tags.innerHTML = `
              <span class="surface-badge ${surfaceClass(tournament.surface)}">${tournament.surface || ""}</span>
              <span class="money-badge">${formatPrizeMoney(tournament) || ""}</span>
            `;

            header.appendChild(title);
            header.appendChild(meta);
            header.appendChild(tags);
            tournamentContainer.appendChild(header);

            const actions = document.createElement("div");
            actions.className = "tournament-card__actions";

            // link ATP (da tenere)
            actions.appendChild(
              createIconButton({
                icon: "🔗",
                title: "ATP",
                href: tournament.href,
                className: "icon-btn--link",
              })
            );

            // pronostico (vedi/modifica)
            actions.appendChild(
              createIconButton({
                icon: "✏️",
                title: "Pronostico",
                href: `/tornei/${tournament.id}/pronostico`,
                className: "icon-btn--primary",
              })
            );

            // compila albero friend (solo open)
            if (String(tournament.status).toLowerCase() === "open") {
              actions.appendChild(
                createIconButton({
                  icon: "🌳",
                  title: "Compila albero",
                  href: `/tornei/${tournament.id}/albero-pronostico`,
                  className: "icon-btn--primary",
                })
              );
            }

            // sviluppo (solo in-progress o completed)
            if (isCompletedOrInProgress(tournament)) {
              actions.appendChild(
                createIconButton({
                  icon: "🏆",
                  title: "Sviluppo",
                  href: `/tornei/${tournament.id}/sviluppo`,
                })
              );
            }

            // albero superuser read-only
            actions.appendChild(
              createIconButton({
                icon: "👁️",
                title: "Albero superuser",
                href: `/tornei/${tournament.id}/albero-superuser`,
              })
            );

            tournamentContainer.appendChild(actions);
            tournamentGrid.appendChild(tournamentContainer);
          });
      };

      paint();
    };

    const renderDefault = () => {
      tournaments.forEach((tournament) => {
        const tournamentContainer = document.createElement("div");
        tournamentContainer.className = "tournament-container";

        const button = document.createElement("a");
        button.href = tournament.href;
        button.className = `tournament-button ${tournament.status}`;
        button.style.backgroundImage = `url('${tournament.image}')`;
        button.textContent = tournament.name;
        tournamentContainer.appendChild(button);

        const canShowPronostico = tournament.status === "open";
        if (canShowPronostico) {
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

        tournamentGrid.appendChild(tournamentContainer);
      });
    };

    if (isFriendsView) {
      renderFriends();
    } else {
      renderDefault();
    }
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

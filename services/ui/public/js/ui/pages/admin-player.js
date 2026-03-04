import { APP_ICONS, countryToFlagIconUrl } from "/js/icons.js";
import { playerApi } from "/js/api/playerApi.js";
import { $ } from "/js/utils.js";

const apiUrl = document.documentElement.dataset.apiUrl || "/api";
const playerId = document.documentElement.dataset.playerId || "";

/**
 * Mini helper DOM per creare nodi in modo compatto.
 * Nota: rimane locale a questo modulo perché è legato al markup specifico della pagina.
 */
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "className") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    if (typeof c === "string") n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  }
  return n;
}

/**
 * Render della card stile "pronostico" per mostrare rapidamente il giocatore selezionato.
 */
function renderPronosticoStyleCard(player) {
  const wrap = $("player-card-wrap");
  if (!wrap) return;

  wrap.innerHTML = "";

  const div = el("div", { className: "player", id: `player-${player.name || player.id || ""}` });

  const img = el("img", {
    src: player.image_src || APP_ICONS.DEFAULT_PLAYER,
    alt: player.image_alt || player.name || "player",
  });

  const punteggio = el("div", { text: "" });
  const label = el("label", { text: player.name || "" });

  const c = player && player.country ? String(player.country) : "";
  const flagUrl = c ? countryToFlagIconUrl(c, { format: "svg" }) : "";
  const country = el("div", {});
  if (flagUrl) {
    country.appendChild(
      el("img", {
        src: flagUrl,
        alt: c,
        loading: "lazy",
        style: "width:18px; height:12px; object-fit:cover; vertical-align:middle; margin-right:6px;",
      })
    );
  }
  if (c) country.appendChild(document.createTextNode(c));

  div.append(punteggio, img, label, country);
  wrap.appendChild(div);
}

/**
 * Messaggi di stato per salvataggio/caricamento.
 */
function setStatus(text, ok) {
  const s = $("save-status");
  if (!s) return;
  s.textContent = text || "";
  s.style.color = ok ? "#0a7a2a" : "#b00020";
}

/**
 * Popola form e link "apri pagina friend" a partire dai dati del player.
 */
function fillForm(player) {
  const title = $("player-title");
  if (title) title.textContent = player && player.name ? player.name : "Player";

  const pid = String(player && player.id ? player.id : playerId);
  const openPublic = $("open-public");
  if (openPublic) openPublic.href = `/friend/player/${encodeURIComponent(pid)}`;

  const set = (id, v) => {
    const n = $(id);
    if (!n) return;
    n.value = v === null || v === undefined ? "" : String(v);
  };

  set("player-id", player && player.id);
  set("f-name", player && player.name);
  set("f-first_name", player && player.first_name);
  set("f-second_name", player && player.second_name);
  set("f-country", player && player.country);
  set("f-profile_url", player && player.profile_url);
  set("f-image_src", player && player.image_src);
  set("f-image_alt", player && player.image_alt);
}

/**
 * Debounce per evitare chiamate eccessive durante la digitazione nella search.
 */
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Cerca giocatori lato API.
 */
async function searchPlayers(q) {
  return await playerApi.searchPlayers(q, apiUrl);
}

/**
 * Render dropdown risultati della ricerca.
 */
function renderSearchResults(players) {
  const root = $("searchResults");
  if (!root) return;
  root.innerHTML = "";

  if (!players || !players.length) {
    root.style.display = "none";
    return;
  }

  players.forEach((p) => {
    const label = `${p.name || ""}${p.country ? ` (${p.country})` : ""}`;
    const row = el(
      "div",
      {
        style: "padding: 10px 12px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.06);",
        onclick: () => {
          root.style.display = "none";
          if (p && p.id) window.location.href = `/admin/player/${encodeURIComponent(p.id)}`;
        },
      },
      label
    );
    root.appendChild(row);
  });

  root.style.display = "block";
}

/**
 * Bootstrap pagina: se c'è playerId carica il player e riempie card+form.
 */
async function init() {
  setStatus("", true);
  try {
    if (!playerId) {
      const title = $("player-title");
      if (title) title.textContent = "Cerca un giocatore";
      return;
    }
    const player = await playerApi.getPlayer(playerId, apiUrl);
    renderPronosticoStyleCard(player);
    fillForm(player);
  } catch (e) {
    setStatus("Errore nel caricamento del player", false);
    console.error(e);
  }
}

/**
 * Setup ricerca giocatore (input + debounce + render risultati).
 */
function setupSearch() {
  const input = $("playerSearch");
  if (!input) return;

  input.addEventListener(
    "input",
    debounce(async (e) => {
      const q = (e && e.target && e.target.value ? e.target.value : "").trim();
      if (q.length < 2) {
        const root = $("searchResults");
        if (root) root.style.display = "none";
        return;
      }
      const players = await searchPlayers(q);
      renderSearchResults(players);
    }, 250)
  );
}

/**
 * Setup salvataggio player (submit form -> PUT -> refresh card+form).
 */
function setupSave() {
  const form = $("player-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Salvataggio...", true);

    const data = Object.fromEntries(new FormData(form));
    const id = data && data.id ? data.id : playerId;

    try {
      await playerApi.updatePlayer(
        id,
        {
          name: data.name,
          first_name: data.first_name || null,
          second_name: data.second_name || null,
          country: data.country || null,
          profile_url: data.profile_url || null,
          image_src: data.image_src || null,
          image_alt: data.image_alt || null,
        },
        apiUrl
      );

      setStatus("Salvato!", true);

      try {
        const player = await playerApi.getPlayer(id, apiUrl);
        renderPronosticoStyleCard(player);
        fillForm(player);
      } catch (_) {}
    } catch (error) {
      console.error(error);
      setStatus("Errore durante l'invio della richiesta", false);
    }
  });
}

setupSearch();
setupSave();
init();

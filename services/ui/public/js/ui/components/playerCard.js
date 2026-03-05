import { countryToFlagIconUrl, DEFAULT_PLAYER_IMG } from "/js/icons.js";

class PlayerCard {
  constructor(player) {
    this.player = player;
    this.element = this.createPlayerElement();
  }

  createPlayerElement() {
    const div = document.createElement("div");
    div.id = `player-${this.player.name}`;
    div.classList.add("player");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.style.display = "none";

    const img = document.createElement("img");
    img.src = this.player.image_src || DEFAULT_PLAYER_IMG;
    img.alt = this.player.image_alt || this.player.name;

    const playerId = this.player && this.player.id !== undefined && this.player.id !== null ? String(this.player.id) : "";
    const friendHref = playerId ? `/friend/player/${encodeURIComponent(playerId)}` : "";

    const imgWrap = document.createElement(friendHref ? "a" : "div");
    if (friendHref) {
      imgWrap.href = friendHref;
      imgWrap.style.textDecoration = "none";
    }
    imgWrap.appendChild(img);

    const punteggio = document.createElement("div");

    const rankings = this.player && Array.isArray(this.player.Rankings) ? this.player.Rankings : [];
    punteggio.textContent = rankings.length
      ? `${rankings[0].ranking} : ${this.player.puntiSemifinalist} / ${this.player.puntiWinner}`
      : "N/D";

    const label = document.createElement("label");
    label.textContent = this.player.name;

    const labelWrap = document.createElement(friendHref ? "a" : "div");
    if (friendHref) {
      labelWrap.href = friendHref;
      labelWrap.style.textDecoration = "none";
      labelWrap.style.color = "inherit";
    }
    labelWrap.appendChild(label);

    const country = document.createElement("div");
    const c = this.player && this.player.country ? String(this.player.country) : "";
    const flagUrl = c ? countryToFlagIconUrl(c, { format: "svg" }) : "";
    if (flagUrl) {
      const flagImg = document.createElement("img");
      flagImg.src = flagUrl;
      flagImg.alt = c;
      flagImg.loading = "lazy";
      flagImg.style.width = "18px";
      flagImg.style.height = "12px";
      flagImg.style.objectFit = "cover";
      flagImg.style.verticalAlign = "middle";
      flagImg.style.marginRight = "6px";
      country.appendChild(flagImg);
    }
    country.appendChild(document.createTextNode(c ? String(c) : ""));

    div.append(punteggio, imgWrap, checkbox, labelWrap, country);
    return div;
  }

  getElement() {
    return this.element;
  }
}

export function buildPlayerInfoElement(player, opts = {}) {
  const isPlaceholder = player && Number(player.id) === 0;
  const playerDiv = document.createElement("div");
  playerDiv.id = player && typeof player.id !== "undefined" ? player.id : "";
  playerDiv.className = "player";
  playerDiv.dataset.playerid = player && typeof player.id !== "undefined" ? player.id : "";

  const img = document.createElement("img");
  img.className = "player-avatar";
  img.src = (player && player.image_src) || DEFAULT_PLAYER_IMG;
  img.alt = isPlaceholder ? "" : (player && (player.image_alt || player.name)) || "";
  if (isPlaceholder) img.style.display = "none";

  const nameDiv = document.createElement("span");

  const getCompactPlayerName = (p) => {
    if (!p) return "";
    const first = p.first_name ? String(p.first_name).trim() : "";
    const second = p.second_name ? String(p.second_name).trim() : "";
    const base = first || second ? `${first} ${second}`.trim() : String(p.name || "").trim();
    if (!base) return "";
    if (Number(p.id) === 0) return base;

    const compactFromParts = (parts) => {
      const clean = (parts || []).map((s) => String(s || "").trim()).filter(Boolean);
      if (clean.length === 0) return "";
      if (clean.length === 1) return clean[0];
      const firstInitial = clean[0] ? `${clean[0][0].toUpperCase()}.` : "";
      const rest = clean.slice(1).join(" ");
      return `${firstInitial} ${rest}`.trim();
    };

    if (first || second) {
      const firstInitial = first ? `${first[0].toUpperCase()}.` : "";
      return `${firstInitial} ${second}`.trim();
    }

    // Fallback su 'name': puntiamo solo la prima parola (se esiste un cognome dopo).
    const parts = String(p.name || "")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return compactFromParts(parts);
  };

  const nameFormat = opts.nameFormat === "initials" ? "initials" : "full";
  const showCountryCode = opts.showCountryCode === false ? false : true;
  nameDiv.textContent =
    nameFormat === "initials" ? getCompactPlayerName(player) : (player && player.name) || "";

  const ratingDiv = document.createElement("span");
  const rankings = player && Array.isArray(player.Rankings) ? player.Rankings : [];
  const ranking = rankings.length ? rankings[0].ranking : "N/D";
  ratingDiv.textContent = isPlaceholder ? "" : `[${ranking}] `;

  const prizeDiv = document.createElement("span");
  const pw = player && typeof player.puntiWinner === "number" ? player.puntiWinner : 0;
  const ps = player && typeof player.puntiSemifinalist === "number" ? player.puntiSemifinalist : 0;
  prizeDiv.textContent = isPlaceholder ? "" : ` {${pw}/${ps}}`;

  const c = player && player.country ? String(player.country) : "";
  const countryDiv = document.createElement("span");
  if (!isPlaceholder && c) {
    const flagUrl = countryToFlagIconUrl(c, { format: "svg" });
    if (flagUrl) {
      const flagImg = document.createElement("img");
      flagImg.src = flagUrl;
      flagImg.alt = c;
      flagImg.loading = "lazy";
      flagImg.style.width = "16px";
      flagImg.style.height = "11px";
      flagImg.style.objectFit = "cover";
      flagImg.style.verticalAlign = "middle";
      flagImg.style.margin = "0 6px 0 6px";
      countryDiv.appendChild(flagImg);
    } else {
      countryDiv.appendChild(document.createTextNode(" "));
    }
    if (showCountryCode) {
      countryDiv.appendChild(document.createTextNode(String(c)));
    }
  }

  playerDiv.append(ratingDiv, img, nameDiv, countryDiv, prizeDiv);
  return playerDiv;
}

export function buildSelectablePlayerCard(player, { onCheckboxChange } = {}) {
  const el = buildPlayerInfoElement(player);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = player && player.name ? player.name : "";
  if (typeof onCheckboxChange === "function") {
    checkbox.onchange = (event) => onCheckboxChange(event, player);
  }

  const playerId = player && player.id !== undefined && player.id !== null ? String(player.id) : "";
  const friendHref = playerId ? `/friend/player/${encodeURIComponent(playerId)}` : "";

  if (friendHref) {
    const img = el.querySelector("img");
    if (img && img.parentElement) {
      const imgLink = document.createElement("a");
      imgLink.href = friendHref;
      imgLink.style.textDecoration = "none";
      img.parentElement.replaceChild(imgLink, img);
      imgLink.appendChild(img);
    }

    const nameSpan = img ? img.nextElementSibling : null;
    if (nameSpan && nameSpan.tagName === "SPAN") {
      const nameLink = document.createElement("a");
      nameLink.href = friendHref;
      nameLink.style.textDecoration = "none";
      nameLink.style.color = "inherit";
      nameSpan.parentElement.replaceChild(nameLink, nameSpan);
      nameLink.appendChild(nameSpan);
    }
  }

  const insertBeforeNode = el.children.length >= 2 ? el.children[2] : null;
  if (insertBeforeNode) el.insertBefore(checkbox, insertBeforeNode);
  else el.appendChild(checkbox);

  return el;
}

export { PlayerCard };

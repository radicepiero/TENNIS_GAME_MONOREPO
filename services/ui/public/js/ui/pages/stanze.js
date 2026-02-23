import { roomApi } from "/js/api/roomApi.js";
import { getEffectiveRoomId, setSelectedRoomId } from "/js/ui/utils/roomSelection.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  const raw = el ? el.textContent || "{}" : "{}";
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
  const { apiUrl = "" } = readBootstrap();

  const statusEl = document.getElementById("room-status");
  const membersEl = document.getElementById("room-members");
  const inviteesEl = document.getElementById("room-invitees");
  const tournamentsEl = document.getElementById("room-tournaments");
  const inviteInput = document.getElementById("invite-search");
  const inviteBtn = document.getElementById("invite-search-btn");
  const inviteResults = document.getElementById("invite-results");
  const inviteStatus = document.getElementById("invite-status");

  const setStatus = (text) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
  };

  let currentRoomId = getEffectiveRoomId();

  const setInviteStatus = (text) => {
    if (!inviteStatus) return;
    inviteStatus.textContent = text || "";
  };


  const renderMembers = (rows) => {
    if (!membersEl) return;
    const list = Array.isArray(rows) ? rows : [];
    const accepted = list.filter((m) => String(m && m.status ? m.status : "") === "accepted");
    if (!accepted.length) {
      membersEl.innerHTML = "<div>Nessun membro</div>";
      return;
    }

    const html = accepted
      .map((m) => {
        const u = m.user || {};
        const nick = u.soprannome ? ` (${escapeHtml(u.soprannome)})` : "";
        const role = m.role ? ` - ${escapeHtml(m.role)}` : "";
        const status = m.status ? ` - ${escapeHtml(m.status)}` : "";
        const inv = m.inviter || {};
        const invitedBy = inv.email ? ` - invitato da ${escapeHtml(inv.email)}` : "";
        const email = u.email ? escapeHtml(u.email) : "";
        return `<div>${email}${nick}${role}${status}${invitedBy}</div>`;
      })
      .join("");

    membersEl.innerHTML = html;
  };

  const renderInvitees = (rows) => {
    if (!inviteesEl) return;
    const list = Array.isArray(rows) ? rows : [];
    const invited = list.filter((m) => {
      const s = String(m && m.status ? m.status : "");
      return s === "pending" || s === "declined";
    });
    if (!invited.length) {
      inviteesEl.innerHTML = "<div>Nessun invitato</div>";
      return;
    }

    const html = invited
      .map((m) => {
        const u = m.user || {};
        const nick = u.soprannome ? ` (${escapeHtml(u.soprannome)})` : "";
        const role = m.role ? ` - ${escapeHtml(m.role)}` : "";
        const status = m.status ? ` - ${escapeHtml(m.status)}` : "";
        const inv = m.inviter || {};
        const invitedBy = inv.email ? ` - invitato da ${escapeHtml(inv.email)}` : "";
        const email = u.email ? escapeHtml(u.email) : "";
        return `<div>${email}${nick}${role}${status}${invitedBy}</div>`;
      })
      .join("");

    inviteesEl.innerHTML = html;
  };

  const renderTournaments = (rows) => {
    if (!tournamentsEl) return;
    if (!rows || rows.length === 0) {
      tournamentsEl.innerHTML = "<div>Nessun torneo</div>";
      return;
    }

    const html = rows
      .map((r) => {
        const t = r.tournament || {};
        const name = t.nickname || t.name || `Torneo ${r.tournament_id}`;
        const safeName = escapeHtml(name);
        const id = r.tournament_id;
        return `<div><a href="/tornei/${id}/pronostico">${safeName}</a></div>`;
      })
      .join("");

    tournamentsEl.innerHTML = html;
  };

  const loadRoomData = async (roomId) => {
    if (!roomId) {
      setStatus("Nessuna stanza selezionata");
      renderMembers([]);
      renderInvitees([]);
      renderTournaments([]);
      return;
    }

    setStatus("Caricamento...");
    try {
      const [members, tournaments] = await Promise.all([
        roomApi.getRoomMembers(roomId, apiUrl),
        roomApi.getRoomTournaments(roomId, apiUrl),
      ]);
      setStatus("");
      renderMembers(members);
      renderInvitees(members);
      renderTournaments(tournaments);
    } catch (e) {
      console.error(e);
      setStatus("Errore nel caricamento della stanza");
    }
  };

  try {
    await loadRoomData(currentRoomId);

    const renderInvitees = (rows) => {
      if (!inviteResults) return;
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        inviteResults.innerHTML = "<div>Nessun utente trovato</div>";
        return;
      }
      inviteResults.innerHTML = "";
      list.forEach((u) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.padding = "8px 0";
        row.style.borderBottom = "1px solid rgba(0,0,0,0.08)";

        const label = document.createElement("div");
        const email = u && u.email ? String(u.email) : "";
        const nick = u && u.soprannome ? String(u.soprannome) : "";
        label.textContent = nick ? `${email} (${nick})` : email;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Invita";
        btn.addEventListener("click", async () => {
          if (!currentRoomId) return;
          setInviteStatus("Invito in corso...");
          try {
            await roomApi.inviteUser(currentRoomId, u.uuid, apiUrl);
            setInviteStatus("Invito inviato");
            inviteResults.innerHTML = "";
            await loadRoomData(currentRoomId);
          } catch (e) {
            setInviteStatus("Errore invito");
          }
        });

        row.append(label, btn);
        inviteResults.appendChild(row);
      });
    };

    const doInviteSearch = async () => {
      const q = inviteInput ? String(inviteInput.value || "").trim() : "";
      if (!currentRoomId) {
        setInviteStatus("Seleziona una stanza");
        return;
      }
      if (q.length < 2) {
        setInviteStatus("Inserisci almeno 2 caratteri");
        return;
      }
      setInviteStatus("Ricerca...");
      try {
        const rows = await roomApi.searchInvitees(currentRoomId, q, apiUrl);
        setInviteStatus("");
        renderInvitees(rows);
      } catch (e) {
        setInviteStatus("Errore ricerca");
      }
    };

    if (inviteBtn) inviteBtn.addEventListener("click", doInviteSearch);
    if (inviteInput) {
      inviteInput.addEventListener("keydown", (e) => {
        if (e && e.key === "Enter") doInviteSearch();
      });
    }
  } catch (e) {
    console.error(e);
    setStatus("Errore nel caricamento delle stanze");
  }
});

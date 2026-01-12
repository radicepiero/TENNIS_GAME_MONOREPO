function $(id) {
  return document.getElementById(id);
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text || "";
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

document.addEventListener("DOMContentLoaded", () => {
  const root = $("admin-users");
  if (!root) return;

  const apiUrl = root.dataset.apiUrl || "/api";

  const emailEl = $("new-email");
  const soprannomeEl = $("new-soprannome");
  const pwdEl = $("new-password");
  const pwd2El = $("new-password-confirm");
  const createBtn = $("create-friend");
  const createStatus = $("create-status");

  const reloadBtn = $("reload");
  const listStatus = $("list-status");
  const tbody = $("users-table").querySelector("tbody");

  function rowHtml(u) {
    const safe = (v) => (v === null || typeof v === "undefined" ? "" : String(v));
    const uuid = safe(u.uuid);
    return `
      <tr data-uuid="${uuid}">
        <td style="border-bottom: 1px solid #eee; padding: 8px;">${uuid}</td>
        <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(u.email)}</td>
        <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(u.soprannome)}</td>
        <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(u.level)}</td>
        <td style="border-bottom: 1px solid #eee; padding: 8px;">
          <button data-action="delete" data-uuid="${uuid}">Elimina</button>
        </td>
      </tr>
    `;
  }

  let allUsers = [];

  async function loadUsers() {
    setText(listStatus, "Caricamento...");
    try {
      const res = await apiFetch(`${apiUrl}/users`, { method: "GET" });
      if (!res.ok) {
        setText(listStatus, `Errore: ${res.status}`);
        return;
      }
      const json = await res.json();
      allUsers = Array.isArray(json) ? json : [];
      tbody.innerHTML = allUsers.map(rowHtml).join("");
      setText(listStatus, `OK (${allUsers.length})`);
    } catch (e) {
      setText(listStatus, "Errore caricamento");
    }
  }

  if (reloadBtn) reloadBtn.addEventListener("click", loadUsers);

  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      const email = emailEl ? String(emailEl.value || "").trim() : "";
      const soprannome = soprannomeEl ? String(soprannomeEl.value || "").trim() : "";
      const password = pwdEl ? String(pwdEl.value || "") : "";
      const password2 = pwd2El ? String(pwd2El.value || "") : "";

      if (!email || !password) {
        setText(createStatus, "Email e password obbligatorie");
        return;
      }
      if (password !== password2) {
        setText(createStatus, "Le password non coincidono");
        return;
      }

      setText(createStatus, "Creazione...");
      try {
        const res = await apiFetch(`${apiUrl}/users`, {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            soprannome,
            level: "friend",
            active: true,
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = (json && (json.error || json.message)) || `Errore: ${res.status}`;
          setText(createStatus, msg);
          return;
        }

        setText(createStatus, "Creato");
        if (emailEl) emailEl.value = "";
        if (soprannomeEl) soprannomeEl.value = "";
        if (pwdEl) pwdEl.value = "";
        if (pwd2El) pwd2El.value = "";
        await loadUsers();
      } catch (e) {
        setText(createStatus, "Errore creazione");
      }
    });
  }

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action='delete']");
    if (!btn) return;
    const uuid = btn.dataset.uuid;
    if (!uuid) return;

    const ok = confirm(`Eliminare utente ${uuid}?`);
    if (!ok) return;

    setText(listStatus, "Eliminazione...");
    try {
      const res = await apiFetch(`${apiUrl}/users/${encodeURIComponent(uuid)}`, { method: "DELETE" });
      if (!res.ok) {
        setText(listStatus, `Errore delete: ${res.status}`);
        return;
      }
      allUsers = allUsers.filter((u) => String(u.uuid) !== String(uuid));
      tbody.innerHTML = allUsers.map(rowHtml).join("");
      setText(listStatus, "Eliminato");
    } catch (e2) {
      setText(listStatus, "Errore delete");
    }
  });

  loadUsers();
});

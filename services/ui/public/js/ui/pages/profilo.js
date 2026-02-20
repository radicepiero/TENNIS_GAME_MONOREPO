function setStatus(el, text) {
  el.textContent = text;
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("profile");
  if (!root) return;

  const apiUrl = root.dataset.apiUrl;
  const userUuid = root.dataset.userUuid;

  const soprannomeInput = document.getElementById("soprannome");
  const preview = document.getElementById("profile-preview");
  const uploadStatus = document.getElementById("upload-status");
  const saveBtn = document.getElementById("save-profile");
  const statusEl = document.getElementById("profile-status");

  const imageUrlInput = document.getElementById("image_url");
  const uploaderRoot = document.getElementById("profile-avatar-uploader");

  const currentPasswordInput = document.getElementById("current_password");
  const newPasswordInput = document.getElementById("new_password");
  const confirmPasswordInput = document.getElementById("confirm_password");
  const changePasswordBtn = document.getElementById("change-password");
  const passwordStatus = document.getElementById("password-status");

  const createRoomName = document.getElementById("create-room-name");
  const createRoomShort = document.getElementById("create-room-short");
  const createRoomLong = document.getElementById("create-room-long");
  const createRoomBtn = document.getElementById("create-room-btn");
  const createRoomStatus = document.getElementById("create-room-status");

  const invitationsEl = document.getElementById("my-invitations");
  const invitationsStatus = document.getElementById("my-invitations-status");

  let initialSoprannome = soprannomeInput ? soprannomeInput.value : "";
  let initialImageUrl = imageUrlInput ? imageUrlInput.value : "";

  const setCreateRoomStatus = (text) => {
    if (!createRoomStatus) return;
    createRoomStatus.textContent = text || "";
  };

  const setInvitationsStatus = (text) => {
    if (!invitationsStatus) return;
    invitationsStatus.textContent = text || "";
  };

  const renderInvitations = (rows) => {
    if (!invitationsEl) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      invitationsEl.innerHTML = "<div>Nessun invito</div>";
      return;
    }

    invitationsEl.innerHTML = "";
    list.forEach((inv) => {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.justifyContent = "space-between";
      wrap.style.alignItems = "center";
      wrap.style.gap = "10px";
      wrap.style.padding = "8px 0";
      wrap.style.borderBottom = "1px solid rgba(0,0,0,0.08)";

      const left = document.createElement("div");
      const roomName = inv && inv.room && inv.room.name ? String(inv.room.name) : String(inv.room_id);
      const inviterEmail = inv && inv.inviter && inv.inviter.email ? String(inv.inviter.email) : "";
      left.textContent = inviterEmail ? `${roomName} (da ${inviterEmail})` : roomName;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";

      const accept = document.createElement("button");
      accept.type = "button";
      accept.textContent = "Accetta";
      accept.addEventListener("click", async () => {
        setInvitationsStatus("Aggiornamento...");
        try {
          const res = await fetch(`${apiUrl}/rooms/${encodeURIComponent(String(inv.room_id))}/invitations/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json || json.success !== true) {
            setInvitationsStatus((json && (json.message || json.error)) || "Errore");
            return;
          }
          setInvitationsStatus("");
          await refreshInvitations();
        } catch (e) {
          setInvitationsStatus("Errore");
        }
      });

      const decline = document.createElement("button");
      decline.type = "button";
      decline.textContent = "Rifiuta";
      decline.addEventListener("click", async () => {
        setInvitationsStatus("Aggiornamento...");
        try {
          const res = await fetch(`${apiUrl}/rooms/${encodeURIComponent(String(inv.room_id))}/invitations/decline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json || json.success !== true) {
            setInvitationsStatus((json && (json.message || json.error)) || "Errore");
            return;
          }
          setInvitationsStatus("");
          await refreshInvitations();
        } catch (e) {
          setInvitationsStatus("Errore");
        }
      });

      actions.append(accept, decline);
      wrap.append(left, actions);
      invitationsEl.appendChild(wrap);
    });
  };

  const refreshInvitations = async () => {
    if (!invitationsEl) return;
    setInvitationsStatus("Caricamento...");
    try {
      const res = await fetch(`${apiUrl}/rooms/invitations/my`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.success !== true) {
        invitationsEl.innerHTML = "<div>Errore caricamento inviti</div>";
        setInvitationsStatus("");
        return;
      }
      renderInvitations(json.data || []);
      setInvitationsStatus("");
    } catch (e) {
      invitationsEl.innerHTML = "<div>Errore caricamento inviti</div>";
      setInvitationsStatus("");
    }
  };

  const updateSaveVisibility = () => {
    if (!saveBtn) return;
    const sopChanged = soprannomeInput ? soprannomeInput.value !== initialSoprannome : false;
    const imgChanged = imageUrlInput ? imageUrlInput.value !== initialImageUrl : false;
    const shouldShow = sopChanged || imgChanged;
    saveBtn.style.display = shouldShow ? "block" : "none";
  };

  if (uploaderRoot && typeof window.setupAvatarUploader === "function") {
    window.setupAvatarUploader(uploaderRoot, {
      onUploaded: () => {
        updateSaveVisibility();
      },
      onError: () => {
        updateSaveVisibility();
      },
    });
  }

  if (soprannomeInput) {
    soprannomeInput.addEventListener("input", () => {
      updateSaveVisibility();
    });
  }

  if (createRoomBtn) {
    createRoomBtn.addEventListener("click", async () => {
      const name = createRoomName ? String(createRoomName.value || "").trim() : "";
      const short_description = createRoomShort ? String(createRoomShort.value || "").trim() : "";
      const long_description = createRoomLong ? String(createRoomLong.value || "").trim() : "";

      if (!name) {
        setCreateRoomStatus("Inserisci un nome");
        return;
      }

      setCreateRoomStatus("Creazione...");
      try {
        const res = await fetch(`${apiUrl}/rooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name,
            short_description: short_description || null,
            long_description: long_description || null,
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json || json.success !== true) {
          setCreateRoomStatus((json && (json.message || json.error)) || "Errore");
          return;
        }

        const room = json.data || null;
        const newId = room && room.id ? String(room.id) : "";
        if (!newId) {
          setCreateRoomStatus("Stanza creata");
          return;
        }

        window.location.href = `/stanze?room_id=${encodeURIComponent(String(newId))}`;
      } catch (e) {
        setCreateRoomStatus("Errore");
      }
    });
  }

  updateSaveVisibility();

  refreshInvitations();

  saveBtn.addEventListener("click", async () => {
    setStatus(statusEl, "Salvataggio...");
    try {
      const res = await fetch(`${apiUrl}/users/${userUuid}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          soprannome: soprannomeInput.value,
          image_url: imageUrlInput ? imageUrlInput.value : "",
        }),
      });

      if (!res.ok) {
        setStatus(statusEl, "Errore nel salvataggio");
        return;
      }

      const updated = await res.json();
      if (updated && preview && imageUrlInput && imageUrlInput.value) preview.src = imageUrlInput.value;
      setStatus(statusEl, "Salvato");

      if (soprannomeInput) initialSoprannome = soprannomeInput.value;
      if (imageUrlInput) initialImageUrl = imageUrlInput.value;

      if (updated && soprannomeInput && typeof updated.soprannome !== "undefined") {
        // keep the UI coherent after save
        // (initial values are captured on load; we simply hide the button again)
        saveBtn.style.display = "none";
      } else {
        saveBtn.style.display = "none";
      }
    } catch (e) {
      setStatus(statusEl, "Errore nel salvataggio");
    }
  });

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", async () => {
      setStatus(passwordStatus, "Salvataggio...");
      try {
        const res = await fetch(`${apiUrl}/users/me/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            current_password: currentPasswordInput ? currentPasswordInput.value : "",
            new_password: newPasswordInput ? newPasswordInput.value : "",
            confirm_password: confirmPasswordInput ? confirmPasswordInput.value : "",
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json || json.success !== true) {
          const msg = (json && (json.message || json.error)) || "Errore";
          setStatus(passwordStatus, msg);
          return;
        }

        if (currentPasswordInput) currentPasswordInput.value = "";
        if (newPasswordInput) newPasswordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
        setStatus(passwordStatus, "Password aggiornata");
      } catch (e) {
        setStatus(passwordStatus, "Errore");
      }
    });
  }
});

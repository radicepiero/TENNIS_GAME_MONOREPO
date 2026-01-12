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

  const initialSoprannome = soprannomeInput ? soprannomeInput.value : "";

  const updateSaveVisibility = () => {
    if (!saveBtn) return;
    const sopChanged = soprannomeInput ? soprannomeInput.value !== initialSoprannome : false;
    const shouldShow = sopChanged;
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

  updateSaveVisibility();

  saveBtn.addEventListener("click", async () => {
    setStatus(statusEl, "Salvataggio...");
    try {
      const res = await fetch(`${apiUrl}/users/${userUuid}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soprannome: soprannomeInput.value,
        }),
      });

      if (!res.ok) {
        setStatus(statusEl, "Errore nel salvataggio");
        return;
      }

      const updated = await res.json();
      if (updated && preview && imageUrlInput && imageUrlInput.value) preview.src = imageUrlInput.value;
      setStatus(statusEl, "Salvato");
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

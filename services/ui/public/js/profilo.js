function setStatus(el, text) {
  el.textContent = text;
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("profile");
  if (!root) return;

  const apiUrl = root.dataset.apiUrl;
  const userUuid = root.dataset.userUuid;

  const soprannomeInput = document.getElementById("soprannome");
  const imageUrlInput = document.getElementById("image_url");
  const preview = document.getElementById("profile-preview");
  const saveBtn = document.getElementById("save-profile");
  const statusEl = document.getElementById("profile-status");

  if (imageUrlInput && preview) {
    imageUrlInput.addEventListener("input", () => {
      preview.src = imageUrlInput.value || "";
    });
  }

  saveBtn.addEventListener("click", async () => {
    setStatus(statusEl, "Salvataggio...");
    try {
      const res = await fetch(`${apiUrl}/users/${userUuid}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soprannome: soprannomeInput.value,
          image_url: imageUrlInput.value,
        }),
      });

      if (!res.ok) {
        setStatus(statusEl, "Errore nel salvataggio");
        return;
      }

      const updated = await res.json();
      if (updated && preview) {
        preview.src = updated.image_url || imageUrlInput.value || "";
      }
      setStatus(statusEl, "Salvato");
    } catch (e) {
      setStatus(statusEl, "Errore nel salvataggio");
    }
  });
});

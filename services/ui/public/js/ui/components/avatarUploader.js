(function () {
  function setText(el, text) {
    if (!el) return;
    el.textContent = text || "";
  }

  async function uploadFile({ uploadUrl, file, credentials = "include" }) {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      credentials,
    });

    let payload = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await res.json().catch(() => null);
    } else {
      const txt = await res.text().catch(() => "");
      payload = txt ? { error: txt } : null;
    }

    if (!res.ok) {
      const err = (payload && payload.error) || "Errore upload";
      const e = new Error(err);
      e.status = res.status;
      throw e;
    }

    if (!payload || !payload.image_url) {
      throw new Error("Risposta upload non valida");
    }

    return payload;
  }

  function setupAvatarUploader(rootEl, opts = {}) {
    if (!rootEl) return null;

    const initialUploadUrl = opts.uploadUrl || rootEl.dataset.uploadUrl || "/profilo/upload-image";
    const previewId = opts.previewId || rootEl.dataset.previewId;
    const imageUrlInputId = opts.imageUrlInputId || rootEl.dataset.imageUrlInputId;
    const statusId = opts.statusId || rootEl.dataset.statusId;

    const fileInput = rootEl.querySelector("input[type='file']");
    const preview = previewId ? document.getElementById(previewId) : null;
    const imageUrlInput = imageUrlInputId ? document.getElementById(imageUrlInputId) : null;
    const statusEl = statusId ? document.getElementById(statusId) : null;

    let lastObjectUrl = null;

    async function handleSelectedFile(file) {
      if (!file) return;

      const currentUploadUrl = opts.uploadUrl || rootEl.dataset.uploadUrl || initialUploadUrl;

      if (preview) {
        try {
          if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
          lastObjectUrl = URL.createObjectURL(file);
          preview.src = lastObjectUrl;
        } catch (e) {}
      }

      setText(statusEl, "Caricamento...");

      try {
        const json = await uploadFile({ uploadUrl: currentUploadUrl, file });
        if (imageUrlInput) imageUrlInput.value = json.image_url;
        if (preview) preview.src = json.image_url;
        setText(statusEl, "Caricato");
        if (typeof opts.onUploaded === "function") opts.onUploaded(json);
      } catch (e) {
        const msg = (() => {
          if (!e) return "Errore upload";
          if (e.status === 413) return "File troppo grande (max 2MB)";
          const raw = String(e.message || "").toLowerCase();
          if (raw.includes("file too large") || raw.includes("too large") || raw.includes("limit")) return "File troppo grande (max 2MB)";
          return e.message || "Errore upload";
        })();

        setText(statusEl, msg);
        if (typeof opts.onError === "function") opts.onError(e);
      }
    }

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const f = fileInput.files && fileInput.files[0];
        handleSelectedFile(f);
      });
    }

    return {
      handleSelectedFile,
    };
  }

  window.setupAvatarUploader = setupAvatarUploader;
})();

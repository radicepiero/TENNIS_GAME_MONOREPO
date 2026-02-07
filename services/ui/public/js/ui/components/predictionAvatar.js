import { fetchJson } from "/js/utils.js";

function getTournamentIdFromPath() {
  const path = String(window.location.pathname || "");
  const m = path.match(/(\d+)(?!.*\d)/);
  return m ? m[1] : "";
}

export async function setupPredictionAvatar() {
  const avatarRoot = document.getElementById("prediction-avatar-uploader");
  const chooseBtn = document.getElementById("choose-prediction-avatar");
  const fileInput = document.getElementById("prediction_avatar_file");
  const preview = document.getElementById("prediction-avatar-preview");
  const hiddenUrl = document.getElementById("prediction_avatar_url");
  const statusEl = document.getElementById("prediction-avatar-status");

  const tournamentId = getTournamentIdFromPath();
  if (!tournamentId) return;

  try {
    const defaultUrl = hiddenUrl && hiddenUrl.value ? String(hiddenUrl.value) : "";
    if (defaultUrl && preview) {
      preview.src = defaultUrl;
      preview.style.display = "inline-block";
    }
  } catch (e) {}

  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => {
      try {
        if (avatarRoot) {
          const oldUrl = hiddenUrl && hiddenUrl.value ? String(hiddenUrl.value) : "";
          avatarRoot.dataset.uploadUrl = `/pronostico/upload-avatar?tournament_id=${encodeURIComponent(
            String(tournamentId || "")
          )}&old_avatar_url=${encodeURIComponent(oldUrl)}`;
        }
      } catch (e) {}
      fileInput.click();
    });
  }

  if (avatarRoot && typeof window.setupAvatarUploader === "function") {
    window.setupAvatarUploader(avatarRoot, {
      onUploaded: (json) => {
        if (preview) preview.style.display = "inline-block";
        if (hiddenUrl && json && json.image_url) {
          hiddenUrl.value = json.image_url;
          if (preview) preview.src = json.image_url;
        }

        try {
          const ev = new CustomEvent("predictionAvatarUploaded", {
            detail: { image_url: json && json.image_url ? String(json.image_url) : "" },
          });
          document.dispatchEvent(ev);
        } catch (e) {}
      },
      onError: () => {},
    });
  }
}

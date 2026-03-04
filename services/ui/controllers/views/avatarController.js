const multer = require("multer");
const path = require("path");
const fs = require("fs");
const avatarStore = require("../../services/avatarStore");

const PROFILE_UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads", "profile");
const PREDICTION_AVATAR_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "uploads",
  "predictions"
);

const ensureProfileUploadDir = () => {
  try {
    fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("[profilo/upload-image] mkdir failed:", e);
  }
};

const ensurePredictionAvatarUploadDir = () => {
  try {
    fs.mkdirSync(PREDICTION_AVATAR_UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.error("[pronostico/upload-avatar] mkdir failed:", e);
  }
};

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensureProfileUploadDir();
      cb(null, PROFILE_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".png";
      const ts = Date.now();
      const rnd = Math.random().toString(16).slice(2);
      cb(null, `profile-${ts}-${rnd}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      String(file.mimetype || "").toLowerCase()
    );
    cb(ok ? null : new Error("Tipo file non supportato"), ok);
  },
});

const predictionAvatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensurePredictionAvatarUploadDir();
      cb(null, PREDICTION_AVATAR_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".png";
      const ts = Date.now();
      const rnd = Math.random().toString(16).slice(2);
      cb(null, `prediction-avatar-${ts}-${rnd}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      String(file.mimetype || "").toLowerCase()
    );
    cb(ok ? null : new Error("Tipo file non supportato"), ok);
  },
});

const postProfileUploadImage = (req, res) => {
  profileUpload.single("image")(req, res, (err) => {
    console.log("[profilo/upload-image] cwd:", process.cwd());
    console.log("[profilo/upload-image] __dirname:", __dirname);
    console.log("[profilo/upload-image] PROFILE_UPLOAD_DIR:", PROFILE_UPLOAD_DIR);
    if (err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File troppo grande (max 2MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload fallito" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nessun file" });
    }
    console.log("[profilo/upload-image] saved file:", {
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination,
    });

    const publicPath = `/uploads/profile/${encodeURIComponent(req.file.filename)}`;

    try {
      const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
      const oldUrl = uuid ? String(avatarStore.getProfileAvatar(uuid) || "") : "";
      const newFilename = String(req.file.filename || "");
      if (oldUrl.startsWith("/uploads/profile/") && newFilename) {
        const oldFilename = path.basename(decodeURIComponent(oldUrl.replace("/uploads/profile/", "")));
        if (oldFilename && oldFilename !== newFilename) {
          const oldPath = path.join(PROFILE_UPLOAD_DIR, oldFilename);
          fs.unlinkSync(oldPath);
          console.log("[profilo/upload-image] deleted previous profile image:", oldPath);
        }
      }
      if (uuid) {
        avatarStore.setProfileAvatar(uuid, publicPath);
      }
    } catch (e) {
      console.warn(
        "[profilo/upload-image] could not delete/store previous profile image:",
        e && e.message ? e.message : e
      );
    }

    return res.status(200).json({ image_url: publicPath });
  });
};

const postDeletePredictionAvatar = (req, res) => {
  try {
    const avatarUrl = req.body && req.body.avatar_url ? String(req.body.avatar_url) : "";
    if (!avatarUrl || !avatarUrl.startsWith("/uploads/predictions/")) {
      return res.status(200).json({ success: true });
    }

    const filename = path.basename(decodeURIComponent(avatarUrl.replace("/uploads/predictions/", "")));
    if (!filename) {
      return res.status(200).json({ success: true });
    }

    const filePath = path.join(PREDICTION_AVATAR_UPLOAD_DIR, filename);
    fs.unlinkSync(filePath);
    console.log("[pronostico/delete-avatar] deleted prediction avatar:", filePath);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.warn(
      "[pronostico/delete-avatar] could not delete prediction avatar:",
      e && e.message ? e.message : e
    );
    return res.status(200).json({ success: true });
  }
};

const postDeletePredictionAvatars = (req, res) => {
  try {
    const avatarUrls = (req.body && req.body.avatar_urls) || [];
    const list = Array.isArray(avatarUrls) ? avatarUrls : [];
    for (const u of list) {
      try {
        const avatarUrl = u ? String(u) : "";
        if (!avatarUrl || !avatarUrl.startsWith("/uploads/predictions/")) continue;
        const filename = path.basename(decodeURIComponent(avatarUrl.replace("/uploads/predictions/", "")));
        if (!filename) continue;
        const filePath = path.join(PREDICTION_AVATAR_UPLOAD_DIR, filename);
        fs.unlinkSync(filePath);
        console.log("[pronostico/delete-avatars] deleted prediction avatar:", filePath);
      } catch (e) {}
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(200).json({ success: true });
  }
};

const getProfileAvatar = (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const image_url = uuid ? avatarStore.getProfileAvatar(uuid) : "";
    return res.status(200).json({ image_url: image_url || "" });
  } catch (e) {
    return res.status(200).json({ image_url: "" });
  }
};

const putProfileAvatar = (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const { image_url } = req.body || {};
    const saved = uuid ? avatarStore.setProfileAvatar(uuid, image_url) : "";
    return res.status(200).json({ image_url: saved || "" });
  } catch (e) {
    return res.status(400).json({ error: "Errore nel salvataggio avatar" });
  }
};

const getPredictionAvatar = (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const tournamentId = req.params.tournamentId;
    const image_url = uuid ? avatarStore.getPredictionAvatar(uuid, tournamentId) : "";
    return res.status(200).json({ image_url: image_url || "" });
  } catch (e) {
    return res.status(200).json({ image_url: "" });
  }
};

const putPredictionAvatar = (req, res) => {
  try {
    const uuid = res.locals.user && res.locals.user.uuid ? String(res.locals.user.uuid) : "";
    const tournamentId = req.params.tournamentId;
    const { image_url } = req.body || {};
    const saved = uuid ? avatarStore.setPredictionAvatar(uuid, tournamentId, image_url) : "";
    return res.status(200).json({ image_url: saved || "" });
  } catch (e) {
    return res.status(400).json({ error: "Errore nel salvataggio avatar" });
  }
};

const postPredictionUploadAvatar = (req, res) => {
  predictionAvatarUpload.single("image")(req, res, (err) => {
    if (err) {
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File troppo grande (max 2MB)" });
      }
      return res.status(400).json({ error: err.message || "Upload fallito" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nessun file" });
    }
    const publicPath = `/uploads/predictions/${encodeURIComponent(req.file.filename)}`;

    try {
      const oldUrl = req.query && req.query.old_avatar_url ? String(req.query.old_avatar_url) : "";
      const newFilename = String(req.file.filename || "");
      if (oldUrl.startsWith("/uploads/predictions/") && newFilename) {
        const oldFilename = path.basename(
          decodeURIComponent(oldUrl.replace("/uploads/predictions/", ""))
        );
        if (oldFilename && oldFilename !== newFilename) {
          const oldPath = path.join(PREDICTION_AVATAR_UPLOAD_DIR, oldFilename);
          fs.unlinkSync(oldPath);
          console.log("[pronostico/upload-avatar] deleted previous prediction avatar:", oldPath);
        }
      }
    } catch (e) {
      console.warn(
        "[pronostico/upload-avatar] could not delete previous prediction avatar:",
        e && e.message ? e.message : e
      );
    }

    return res.status(200).json({ image_url: publicPath });
  });
};

module.exports = {
  postProfileUploadImage,
  postDeletePredictionAvatar,
  postDeletePredictionAvatars,
  getProfileAvatar,
  putProfileAvatar,
  getPredictionAvatar,
  putPredictionAvatar,
  postPredictionUploadAvatar,
};

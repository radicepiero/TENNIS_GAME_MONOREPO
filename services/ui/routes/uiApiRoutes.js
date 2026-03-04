const router = require("express").Router();
const avatarController = require("../controllers/views/avatarController");

router.post("/profilo/upload-image", avatarController.postProfileUploadImage);

router.post("/pronostico/delete-avatar", avatarController.postDeletePredictionAvatar);

router.post("/pronostico/delete-avatars", avatarController.postDeletePredictionAvatars);

router.get("/ui/avatar/profile", avatarController.getProfileAvatar);

router.put("/ui/avatar/profile", avatarController.putProfileAvatar);

router.get(
  "/ui/avatar/prediction/:tournamentId",
  avatarController.getPredictionAvatar
);

router.put(
  "/ui/avatar/prediction/:tournamentId",
  avatarController.putPredictionAvatar
);

router.post(
  "/pronostico/upload-avatar",
  avatarController.postPredictionUploadAvatar
);

module.exports = router;

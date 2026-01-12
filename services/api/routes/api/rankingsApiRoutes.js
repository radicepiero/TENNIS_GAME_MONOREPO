//            /rankings
const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/rankingApiController"); //get all predictions
const { requireAdmin } = require("../../middleware/authMiddleware");
const multer = require("multer");
const os = require("os");

const upload = multer({ dest: os.tmpdir() });
router.use((req, res, next) => {
  console.log(req.url);
  next(); // Importante per far proseguire la richiesta
});

router.get("/dates", controller.getRankingDates);
router.post("/import-csv", requireAdmin, upload.single("file"), controller.importRankingCsv);
router.get("/:date", controller.getRankingByDate); //get player by ID
router.get("/", controller.getRanking);
//router.get("/", controller.getFirstNPlayersOfAnyRankingDate);

module.exports = router;

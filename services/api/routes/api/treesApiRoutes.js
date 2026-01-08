const { Router } = require("express");
const router = Router();
const treeApiController = require("../../controllers/api/treeApiController");
const { requireAuth } = require("../../middleware/authMiddleware");

router.get("/", treeApiController.getAll);
router.get("/superuser/:tournamentId", treeApiController.getSuperuserByTournament);
router.post(
  "/clone/superuser/:tournamentId",
  requireAuth,
  treeApiController.cloneSuperuserTree
);
router.post("/", treeApiController.create);
router.put("/", treeApiController.update);
router.get("/id", treeApiController.getById);
router.delete("/", treeApiController.deleteOne);

module.exports = router;

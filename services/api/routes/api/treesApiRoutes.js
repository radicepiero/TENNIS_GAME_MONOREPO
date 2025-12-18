const { Router } = require("express");
const router = Router();
treeApiController = require("../../controllers/api/treeApiController");

router.get("/", treeApiController.getAll);
router.post("/", treeApiController.create);
router.put("/", treeApiController.update);
router.get("/id", treeApiController.getById);
router.delete("/", treeApiController.deleteOne);

module.exports = router;

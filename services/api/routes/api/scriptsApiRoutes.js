const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/scriptApiController");
const { requireAdmin } = require("../../middleware/authMiddleware");

router.get("/", controller.getScripts);

module.exports = router;

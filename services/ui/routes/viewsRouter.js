const router = require("express").Router();

const friendRoutes = require("./friendRoutes");
const predictionRoutes = require("./predictionRoutes");
const tournamentsRoutes = require("./tournamentsRoutes");
const roomsRoutes = require("./roomsRoutes");
const profileRoutes = require("./profileRoutes");
const adminRoutes = require("./adminRoutes");
const uiApiRoutes = require("./uiApiRoutes");

router.use(friendRoutes);
router.use(predictionRoutes);
router.use(tournamentsRoutes);
router.use(roomsRoutes);
router.use(profileRoutes);
router.use(adminRoutes);
router.use(uiApiRoutes);

module.exports = router;

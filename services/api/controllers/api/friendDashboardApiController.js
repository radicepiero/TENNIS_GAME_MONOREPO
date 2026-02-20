const friendDashboardService = require("../../services/friendDashboardService");

async function getFriendDashboard(req, res) {
  try {
    const user = res.locals.user;
    const userUuid = user && user.dataValues ? user.dataValues.uuid : null;
    const roomId = (req.query && (req.query.room_id || req.query.roomId)) || null;
    const data = await friendDashboardService.getFriendDashboard(userUuid, roomId);
    res.status(200).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || "Errore dashboard" });
  }
}

module.exports = {
  getFriendDashboard,
};

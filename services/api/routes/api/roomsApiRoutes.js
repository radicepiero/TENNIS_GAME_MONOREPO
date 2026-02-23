const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/roomApiController");

router.get("/my", controller.getMyRooms);
router.get("/invitations/my", controller.getMyInvitations);
router.post("/", controller.postRoom);
router.get("/:id/members", controller.getRoomMembers);
router.get("/:id/tournaments", controller.getRoomTournaments);
router.get("/:id/invitees/search", controller.searchRoomInvitees);
router.post("/:id/invitations", controller.postRoomInvitation);
router.post("/:id/invitations/accept", controller.postAcceptInvitation);
router.post("/:id/invitations/decline", controller.postDeclineInvitation);

module.exports = router;

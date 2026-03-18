const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/userApiController");
const { requireAdmin, requireAuth } = require("../../middleware/authMiddleware");

router.get("/", requireAdmin, controller.getUsers);
router.get("/mail/:mail", requireAdmin, controller.getUserByMail);
router.post("/me/change-password", requireAuth, controller.changePassword);
router.put("/:uuid/profile", requireAuth, controller.updateUserProfile);
router.get("/:uuid", requireAuth, controller.getUser);
router.post("/", requireAdmin, controller.postUser);
router.delete("/:uuid", requireAdmin, controller.deleteUser);
router.put("/:uuid", requireAdmin, controller.updateActiveUser);
router.get("/tournaments/", requireAdmin, controller.getUsersTournaments);
router.get("/tournaments/:uuid", requireAuth, controller.getUserTournaments);
router.get("/:uuid/tournaments/:tournamentId", requireAuth, controller.getUserTournament);

module.exports = router;
// The userRoutes.js file is similar to the authRoutes.js file,
// but it has different routes and controllers.
// The userRoutes.js file is responsible for handling all the routes related to users,
//  such as getting all users,  getting a specific user,  creating a user,  deleting a user,
// and updating a user.

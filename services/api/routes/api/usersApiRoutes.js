const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/userApiController");
const { requireAdmin } = require("../../middleware/authMiddleware");

router.get("/", requireAdmin, controller.getUsers);
router.get("/mail/:mail", controller.getUserByMail);
router.post("/me/change-password", controller.changePassword);
router.put("/:uuid/profile", controller.updateUserProfile);
router.get("/:uuid", controller.getUser);
router.post("/", requireAdmin, controller.postUser);
router.delete("/:uuid", requireAdmin, controller.deleteUser);
router.put("/:uuid", controller.updateActiveUser);
router.get("/tournaments/", controller.getUsersTournaments);
router.get("/tournaments/:uuid", controller.getUserTournaments);
router.get("/:uuid/tournaments/:tournamentId", controller.getUserTournament);

module.exports = router;
// The userRoutes.js file is similar to the authRoutes.js file,
// but it has different routes and controllers.
// The userRoutes.js file is responsible for handling all the routes related to users,
//  such as getting all users,  getting a specific user,  creating a user,  deleting a user,
// and updating a user.

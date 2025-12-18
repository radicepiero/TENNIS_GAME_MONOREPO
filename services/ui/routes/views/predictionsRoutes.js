const router = require("express").Router();

router.get("/", (req, res) => {
  res.render("prediction");
});

module.exports = router;
// The routes are the same,  but the controller is different.
// The controller for tournaments is tournamentsController.js,  while the controller for tornei is torneiController.js.
// The controller for tornei is in the controllers folder,  and it has the following code:

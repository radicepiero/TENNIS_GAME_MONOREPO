const router = require("express").Router();

router.get("/friend/home", (req, res) => {
  res.render("friend-home", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/friend/player", (req, res) => {
  res.render("friend-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: "",
  });
});

router.get("/friend/player/:id", (req, res) => {
  res.render("friend-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: req.params.id,
  });
});

module.exports = router;

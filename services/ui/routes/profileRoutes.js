const router = require("express").Router();

router.get("/profilo", (req, res) => {
  res.render("profilo", {
    apiUrl: req.app.locals.apiUrl || "/api",
    user: res.locals.user,
  });
});

module.exports = router;

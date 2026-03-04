const router = require("express").Router();

router.get("/stanze", (req, res) => {
  res.render("stanze", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

module.exports = router;

const router = require("express").Router();

router.get("/prediction", (req, res) => {
  res.render("prediction");
});

router.get("/pronostici/colonna", (req, res) => {
  res.render("pronostici-colonna", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

module.exports = router;

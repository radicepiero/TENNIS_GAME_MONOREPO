const router = require("express").Router();
const { requireAdmin } = require("../middleware/authMiddleware");
const tournamentsController = require("../controllers/views/tournamentsController");

router.get("/tornei/friends", (req, res) => {
  res.render("tornei", {
    viewMode: "friends",
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tornei/:id/albero-superuser", async (req, res) => {
  res.render("albero-superuser", {
    tournamentId: req.params.id,
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tornei/:id/albero_superuser", async (req, res) => {
  res.render("albero-superuser", {
    tournamentId: req.params.id,
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get(
  "/tornei/:id/edit",
  requireAdmin,
  tournamentsController.getEditTournament
);

router.get("/tornei/:id/pronostico", (req, res) => {
  //res.render("pronostico", { tournamentId: req.params.id });
  res.render("pronostico", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get(
  "/tornei/:id/sviluppo",
  tournamentsController.getSviluppoTorneo
);

router.get("/tornei/:id/genera-albero", async (req, res) => {
  res.render("generaAlbero.ejs", {
    tournamentId: req.params.id,
  });
});

router.get("/tornei/:id/albero-pronostico", async (req, res) => {
  const tournamentId = req.params.id;
  const apiUrl = req.app.locals.apiUrl || "/api";
  res.render("albero-pronostico", {
    tournamentId,
    apiUrl,
  });
});

router.get("/tornei/:id/schedule", async (req, res) => {
  res.render("schedule.ejs", {
    tournamentId: req.params.id,
  });
});

module.exports = router;

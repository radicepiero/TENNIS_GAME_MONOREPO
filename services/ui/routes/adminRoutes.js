const router = require("express").Router();
const { requireAdmin } = require("../middleware/authMiddleware");

router.get("/admin/player", requireAdmin, (req, res) => {
  res.render("admin-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: "",
  });
});

router.get("/admin/player/:id", requireAdmin, (req, res) => {
  res.render("admin-player", {
    apiUrl: req.app.locals.apiUrl || "/api",
    playerId: req.params.id,
  });
});

router.get("/admin/tornei", requireAdmin, (req, res) => {
  res.render("admin-tornei");
});

router.get("/admin/utenti", requireAdmin, (req, res) => {
  res.render("admin-utenti", {
    apiUrl: req.app.locals.apiUrl || "/api",
  });
});

router.get("/tennisti", (req, res) => {
  res.render("tennisti");
});

router.get("/tennisti/classifica", (req, res) => {
  res.render("classifica");
});

router.get("/classifica-annuale/:year?", (req, res) => {
  const apiUrl = req.app.locals.apiUrl || "/api";
  const yNow = new Date().getFullYear();
  const yearRaw = req.params.year;
  const year = yearRaw ? Number(yearRaw) : yNow;
  res.render("classifica-annuale", { apiUrl, year: Number.isFinite(year) ? year : yNow });
});

router.get("/tennisti/:id/edit", async (req, res) => {
  const { id } = req.params;
  try {
    const risposta = await fetch(`${process.env.API}/players/${id}`);
    if (!risposta.ok) {
      return res.status(404).send("giocatore non trovato.");
    }
    const json = await risposta.json();
    console.log("Risposta JSON:", json.data[0].Rankings);
    const player = json.data[0];
    res.render("edit-player", { player, apiUrl: req.app.locals.apiUrl || "/api" });
  } catch (err) {
    console.error("Errore nel recupero del giocatore:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

module.exports = router;

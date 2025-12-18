const router = require("express").Router();

router.get("/prediction", (req, res) => {
  res.render("prediction");
});

router.get("/tornei", (req, res) => {
  res.render("tornei");
});

router.get("/tornei/:id/edit", async (req, res) => {
  const { id } = req.params;
  try {
    const risposta = await fetch(`${process.env.API}/tournaments/${id}`);
    if (!risposta.ok) {
      return res.status(404).send("Torneo non trovato.");
    }
    const json = await risposta.json();
    console.log("Risposta JSON:", json);
    // Supponiamo che json.data sia un oggetto torneo (non un array)
    const tournament = json.data;
    res.render("edit-tournament", { tournament });
  } catch (err) {
    console.error("Errore nel recupero torneo:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

router.get("/tornei/:id/pronostico", (req, res) => {
  //res.render("pronostico", { tournamentId: req.params.id });
  res.render("pronostico");
});

router.get("/tornei/:id/sviluppo", async (req, res) => {
  res.render("sviluppoTorneo", {
    tournamentId: req.params.id,
  });
});

router.get("/tornei/:id/genera-albero", async (req, res) => {
  console.log("/tornei/:id/genera-albero");
  res.render("generaAlbero.ejs", {
    tournamentId: req.params.id,
  });
});

router.get("/tornei/:id/schedule", async (req, res) => {
  console.log("/tornei/:id/schedule");
  res.render("schedule.ejs", {
    tournamentId: req.params.id,
  });
});

router.get("/tennisti", (req, res) => {
  res.render("tennisti");
});

router.get("/tennisti/classifica", (req, res) => {
  res.render("classifica");
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
    res.render("edit-player", { player });
  } catch (err) {
    console.error("Errore nel recupero del giocatore:", err);
    res.status(500).send("Errore nel recupero dei dati.");
  }
});

module.exports = router;
// The routes are the same,  but the controller is different.
// The controller for tournaments is tournamentsController.js,  while the controller for tornei is torneiController.js.
// The controller for tornei is in the controllers folder,  and it has the following code:

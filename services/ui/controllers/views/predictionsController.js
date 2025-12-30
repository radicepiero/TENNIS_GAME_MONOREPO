const postPronostico = async (req, res) => {
  //recupero id utente dalla richiesta
  user_id = res.locals.user;
  //recuopero i dati dal body della richiesta
  const predizione = req.body;
  //controllo se il torneo è in corso o completato
  //controllo se l'utente ha già inserito una predizione per quel torneo
  try {
    const url = `${process.env.API}/tournaments/${predizione.tournament_id}`;
    const response = await fetch(url);
  
    if (!response.ok) {
      return res.status(response.status).json({ error: "Errore nel recupero del torneo" });
    }
  
    const torneo = await response.json();

    const user = res.locals.user;
    const isSuper = user && user.level === "super";

    if (torneo.status === "in-progress" && !isSuper) {
      return res.status(400).json({ error: "Torneo in corso: pronostici bloccati" });
    }
    if (torneo.status !== "open" && !(torneo.status === "in-progress" && isSuper)) {
      return res.status(400).json({ error: "Torneo non aperto ai pronostici" });
    }
  
    const esisteGia = await predictionsService.getUserTournamentPredictions(
      user_id,
      predizione.tournament_id
    );
  
    if (esisteGia) {
      return res.status(400).json({ error: "Hai già inserito una predizione per questo torneo" });
    }
  
    // continua con la logica di salvataggio predizione ecc...
  
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore del server" });
  }
  

  //controllo se tutti i players sono presenti nel db
  predizione.players.forEach(async (player) => {
    try {
      const player = await predictionsService.getPlayer(player);
      if (!player) {
        res.status(404).json({ error: "Player non trovato" });
      }
    } catch (error) {
      res.status(404).json({ error: "Player non trovato" });
    }
  });
  //inserimento predizione
  try {
    predizione.players.forEach(async (player) => {
      await predictionsService.postPrediction({
        user_id: user_id,
        tournament_id: predizione.tournament_id,
        player_id: player.id,
        prediction: player.prediction,
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Errore nell'inserimento della predizione" });
  }
};

module.exports = {
  postPronostico,
};
// The controller for predictions is predictionsController.js,  and it has the following code:

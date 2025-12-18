const getTournamentById = async (tournamentId) => {
  try {
    const response = await fetch(
      `${process.env.API}/tournaments/${tournamentId}`
    );
    return await response.json();
  } catch (error) {
    console.log("errore nel recupero del torneo", error);
  }
};
module.exports = {
  getTournamentById,
};
// The controller for predictions is predictionsController.js,  and it has the following code:

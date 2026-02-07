import { fetchJson } from "../utils.js";

export const predictionApi = {
  async getTournamentPredictions(tournamentId, apiUrl) {
    const json = await fetchJson(
      `${apiUrl}/predictions/tournaments/${tournamentId}`,
      { method: "GET" },
      {
        allowStatus: [404],
        buildErrorMessage: ({ json, text }) => {
          if (!json) return text || "";
          let msg = json && (json.message || json.error) ? (json.message || json.error) : JSON.stringify(json);
          if (json && json.chiusuraPronostici) {
            msg = `${msg} (visibili dopo: ${json.chiusuraPronostici})`;
          }
          return msg;
        },
      }
    );
    return (json && json.data) || [];
  },

  async getUserPredictionByTournament(tournamentId, apiUrl) {
    const json = await fetchJson(
      `${apiUrl}/predictions/tournaments/${tournamentId}/user`,
      { method: "GET" },
      { allowStatus: [404] }
    );
    const data = (json && json.data) || [];
    const first = Array.isArray(data) ? data[0] : data;
    return first || null;
  },

  async getUserPredictionRowsByTournament(tournamentId, apiUrl) {
    const p = await predictionApi.getUserPredictionByTournament(tournamentId, apiUrl);
    return (p && p.rows) || [];
  },

  async userPredictionExistsByTournament(tournamentId, apiUrl) {
    const json = await fetchJson(
      `${apiUrl}/predictions/tournaments/${tournamentId}/user`,
      { method: "GET" },
      { allowStatus: [404] }
    );
    const data = (json && json.data) || [];
    return Array.isArray(data) ? data.length > 0 : Boolean(data);
  },

  async createPrediction(pronostico, apiUrl) {
    return await fetchJson(`${apiUrl}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pronostico),
    });
  },

  async deletePrediction(pronostico, apiUrl) {
    return await fetchJson(`${apiUrl}/predictions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pronostico),
    });
  },

  async getUserPredictions(apiUrl) {
    const json = await fetchJson(`${apiUrl}/predictions/user`, { method: "GET" });
    return (json && json.data) || [];
  },

  async getPredictionCountsByTournament(apiUrl) {
    const json = await fetchJson(`${apiUrl}/predictions/counts/tournaments`, { method: "GET" });
    return (json && json.data) || [];
  },
};

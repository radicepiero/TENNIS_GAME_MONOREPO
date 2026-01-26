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
};

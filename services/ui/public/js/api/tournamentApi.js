import { fetchJson, unwrapFirst } from "../utils.js";

export const tournamentApi = {
  async getTournamentBasic(tournamentId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}`, { method: "GET" });
    return unwrapFirst(json) || json;
  },

  async getTournamentScripts(tournamentId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}/scripts`, { method: "GET" });
    return unwrapFirst(json) || json;
  },
};

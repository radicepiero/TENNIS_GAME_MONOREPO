import { fetchJson, unwrapFirst } from "../utils.js";

export const tournamentApi = {
  async getTournamentBasic(tournamentId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}`, { method: "GET" });
    return unwrapFirst(json) || json;
  },

  async listTournaments(apiUrl) {
    const json = await fetchJson(`${apiUrl}/tournaments`, { method: "GET" });
    return Array.isArray(json) ? json : [];
  },

  async getTournamentScripts(tournamentId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/tournaments/${tournamentId}/scripts`, { method: "GET" });
    return unwrapFirst(json) || json;
  },

  async createTournament(tournamentPayload, apiUrl) {
    return await fetchJson(`${apiUrl}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tournamentPayload),
    });
  },

  async deleteTournament(tournamentId, apiUrl) {
    if (!tournamentId) throw new Error("tournamentId is required");
    return await fetchJson(`${apiUrl}/tournaments/${tournamentId}`, { method: "DELETE" });
  },
};

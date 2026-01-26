import { fetchJson } from "../utils.js";

export const treeApi = {
  async getSuperuserTreeByTournament(tournamentId, apiUrl) {
    return await fetchJson(`${apiUrl}/trees/superuser/${tournamentId}`, { method: "GET" });
  },

  async getMatchesByTreeId(treeId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/matches/tree/${treeId}`, { method: "GET" });
    return Array.isArray(json) ? json : [];
  },
};

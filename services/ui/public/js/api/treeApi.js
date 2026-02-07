import { fetchJson, generateQueryUrl } from "../utils.js";

export const treeApi = {
  generateTreeApiUrl(options = {}, apiUrl) {
    const defaultOptions = { includeMatches: true };
    return generateQueryUrl({ ...defaultOptions, ...options }, apiUrl);
  },

  async getTrees(options = {}, apiUrl) {
    const url = this.generateTreeApiUrl(options, apiUrl);
    return await fetchJson(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  },

  async getTree(treeId, apiUrl, includeMatches = true) {
    if (!treeId) throw new Error("treeId is required");
    const result = await this.getTrees({ treeId, includeMatches }, apiUrl);
    return Array.isArray(result) ? result[0] : result;
  },

  async saveTree(treeId, treePayload, apiUrl) {
    if (!treeId) throw new Error("treeId is required");
    const url = this.generateTreeApiUrl({ treeId }, apiUrl);
    return await fetchJson(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(treePayload),
    });
  },

  async createTree(treePayload, apiUrl) {
    const url = this.generateTreeApiUrl({}, apiUrl);
    return await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(treePayload),
    });
  },

  async deleteTree(treeId, apiUrl) {
    if (!treeId) throw new Error("treeId is required");
    const url = this.generateTreeApiUrl({ treeId }, apiUrl);
    return await fetchJson(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  },

  async getSuperuserTreeByTournament(tournamentId, apiUrl, includeMatches = true) {
    if (!tournamentId) throw new Error("tournamentId is required");
    const encoded = encodeURIComponent(String(tournamentId));
    const url = `${apiUrl}/trees/superuser/${encoded}${includeMatches ? "?includeMatches=true" : ""}`;
    return await fetchJson(url, { method: "GET" });
  },

  async cloneSuperuserTreeByTournament(tournamentId, apiUrl) {
    if (!tournamentId) throw new Error("tournamentId is required");
    const encoded = encodeURIComponent(String(tournamentId));
    return await fetchJson(`${apiUrl}/trees/clone/superuser/${encoded}`, { method: "POST" });
  },

  async getMatchesByTreeId(treeId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/matches/tree/${treeId}`, { method: "GET" });
    return Array.isArray(json) ? json : [];
  },
};

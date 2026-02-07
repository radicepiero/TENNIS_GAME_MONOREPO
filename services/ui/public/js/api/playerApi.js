import { fetchJson, normalizeYmd } from "../utils.js";

export const playerApi = {
  async getPlayer(playerId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/players/${encodeURIComponent(playerId)}`, { method: "GET" });
    if (json && Array.isArray(json.data) && json.data[0]) return json.data[0];
    if (json && json.data) return json.data;
    return json;
  },

  async searchPlayers(query, apiUrl) {
    const q = String(query || "").trim();
    const json = await fetchJson(`${apiUrl}/players/search?q=${encodeURIComponent(q)}`, { method: "GET" });
    return Array.isArray(json) ? json : (json && json.data) || [];
  },

  async updatePlayer(playerId, payload, apiUrl) {
    return await fetchJson(`${apiUrl}/players/${encodeURIComponent(playerId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
  },

  async getPlayersByRankingDate(rankingDate, apiUrl) {
    const normalizedDate = normalizeYmd(rankingDate);
    const url = normalizedDate
      ? `${apiUrl}/players/ranking/${encodeURIComponent(normalizedDate)}`
      : `${apiUrl}/players/ranking`;

    const json = await fetchJson(url, { method: "GET" });
    return (json && json.data) || [];
  },

  async listPlayers(apiUrl) {
    const json = await fetchJson(`${apiUrl}/players`, { method: "GET" });
    return Array.isArray(json) ? json : (json && json.data) || [];
  },
};

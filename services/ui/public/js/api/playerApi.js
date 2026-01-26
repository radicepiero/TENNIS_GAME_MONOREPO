import { fetchJson, normalizeYmd } from "../utils.js";

export const playerApi = {
  async getPlayersByRankingDate(rankingDate, apiUrl) {
    const normalizedDate = normalizeYmd(rankingDate);
    const url = normalizedDate
      ? `${apiUrl}/players/ranking/${encodeURIComponent(normalizedDate)}`
      : `${apiUrl}/players/ranking`;

    const json = await fetchJson(url, { method: "GET" });
    return (json && json.data) || [];
  },
};

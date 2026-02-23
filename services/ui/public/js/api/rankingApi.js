import { fetchJson } from "../utils.js";

export const rankingApi = {
  async getRankingDates(apiUrl) {
    const json = await fetchJson(`${apiUrl}/rankings/dates`, { method: "GET" });
    return (json && json.data) || [];
  },

  async importRankingsCsv(file, rankingDate, apiUrl) {
    if (!file) throw new Error("file is required");
    if (!rankingDate) throw new Error("rankingDate is required");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("ranking_date", rankingDate);

    return await fetchJson(
      `${apiUrl}/rankings/import-csv`,
      {
        method: "POST",
        body: fd,
        credentials: "include",
      },
      {
        buildErrorMessage: ({ json }) => (json && (json.message || json.error)) || "",
      }
    );
  },
};

import { fetchJson } from "../utils.js";

export const predictionApi = {
  async getTournamentPredictions(tournamentId, apiUrl, { roomId } = {}) {
    const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
    const json = await fetchJson(
      `${apiUrl}/predictions/tournaments/${tournamentId}${qs}`,
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

  async getUserPredictionByTournament(tournamentId, apiUrl, { roomId } = {}) {
    const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
    const json = await fetchJson(
      `${apiUrl}/predictions/tournaments/${tournamentId}/user${qs}`,
      { method: "GET" },
      { allowStatus: [404] }
    );
    const data = (json && json.data) || [];
    const first = Array.isArray(data) ? data[0] : data;
    return first || null;
  },

  async getUserPredictionRowsByTournament(tournamentId, apiUrl, { roomId } = {}) {
    const p = await predictionApi.getUserPredictionByTournament(tournamentId, apiUrl, { roomId });
    return (p && p.rows) || [];
  },

  async userPredictionExistsByTournament(tournamentId, apiUrl, { roomId } = {}) {
    const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
    const json = await fetchJson(
      `${apiUrl}/predictions/tournaments/${tournamentId}/user${qs}`,
      { method: "GET" },
      { allowStatus: [404] }
    );
    const data = (json && json.data) || [];
    return Array.isArray(data) ? data.length > 0 : Boolean(data);
  },

  async createPrediction(pronostico, apiUrl, { roomId } = {}) {
    const payload = roomId ? { ...pronostico, room_id: roomId } : pronostico;
    return await fetchJson(`${apiUrl}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async deletePrediction(pronostico, apiUrl, { roomId } = {}) {
    const payload = roomId ? { ...pronostico, room_id: roomId } : pronostico;
    return await fetchJson(`${apiUrl}/predictions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async copyPredictionToRoom({ tournamentId, fromRoomId, toRoomId, overwrite }, apiUrl) {
    return await fetchJson(`${apiUrl}/predictions/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournament_id: tournamentId,
        from_room_id: fromRoomId,
        to_room_id: toRoomId,
        overwrite: Boolean(overwrite),
      }),
    });
  },

  async getUserPredictions(apiUrl, { roomId } = {}) {
    const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
    const json = await fetchJson(`${apiUrl}/predictions/user${qs}`, { method: "GET" });
    return (json && json.data) || [];
  },

  async getPredictionCountsByTournament(apiUrl) {
    const json = await fetchJson(`${apiUrl}/predictions/counts/tournaments`, { method: "GET" });
    return (json && json.data) || [];
  },
};

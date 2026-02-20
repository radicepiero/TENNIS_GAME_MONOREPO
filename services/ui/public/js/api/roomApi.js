import { fetchJson } from "../utils.js";

export const roomApi = {
  async getMyRooms(apiUrl) {
    const json = await fetchJson(`${apiUrl}/rooms/my`, { method: "GET" });
    return (json && json.data) || [];
  },

  async createRoom({ name, short_description, long_description }, apiUrl) {
    return await fetchJson(`${apiUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        short_description,
        long_description,
      }),
    });
  },

  async getRoomMembers(roomId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/rooms/${roomId}/members`, { method: "GET" });
    return (json && json.data) || [];
  },

  async getRoomTournaments(roomId, apiUrl) {
    const json = await fetchJson(`${apiUrl}/rooms/${roomId}/tournaments`, { method: "GET" });
    return (json && json.data) || [];
  },

  async getMyInvitations(apiUrl) {
    const json = await fetchJson(`${apiUrl}/rooms/invitations/my`, { method: "GET" });
    return (json && json.data) || [];
  },

  async searchInvitees(roomId, q, apiUrl) {
    const qs = q ? `?q=${encodeURIComponent(String(q))}` : "";
    const json = await fetchJson(`${apiUrl}/rooms/${roomId}/invitees/search${qs}`, { method: "GET" });
    return (json && json.data) || [];
  },

  async inviteUser(roomId, userUuid, apiUrl) {
    return await fetchJson(`${apiUrl}/rooms/${roomId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_uuid: userUuid }),
    });
  },

  async acceptInvitation(roomId, apiUrl) {
    return await fetchJson(`${apiUrl}/rooms/${roomId}/invitations/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  },

  async declineInvitation(roomId, apiUrl) {
    return await fetchJson(`${apiUrl}/rooms/${roomId}/invitations/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  },
};

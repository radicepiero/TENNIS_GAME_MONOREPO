import { fetchJson } from "../utils.js";

export const pronosticoApi = {
  async deleteAvatars(avatarUrls) {
    const list = Array.isArray(avatarUrls) ? avatarUrls.filter(Boolean) : [];
    if (list.length === 0) return null;

    return await fetchJson(
      "/pronostico/delete-avatars",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_urls: list }),
        credentials: "include",
      },
      { allowStatus: [404] }
    );
  },
};

import { fetchJson } from "../utils.js";

export class Prediction {
  constructor({ id, user_uuid, tournament_id, img, createdAt, updatedAt }) {
    this.id = id;
    this.user_uuid = user_uuid;
    this.tournament_id = tournament_id;
    this.img = img;
    this.createdAt = createdAt ? new Date(createdAt) : null;
    this.updatedAt = updatedAt ? new Date(updatedAt) : null;
  }

  static fromJSON(json) {
    return new Prediction(json);
  }

  toJSON() {
    return {
      id: this.id,
      user_uuid: this.user_uuid,
      tournament_id: this.tournament_id,
      img: this.img,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }

  static async fetchById(id) {
    const data = await fetchJson(`/api/predictions/${id}`, { method: "GET", credentials: "include" });
    return Prediction.fromJSON(data);
  }

  async save() {
    const data = await fetchJson(`/api/predictions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.toJSON()),
    });
    Object.assign(this, Prediction.fromJSON(data));
  }
}

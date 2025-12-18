export class PredictionRow {
  constructor({ prediction_id, player_id, prediction, createdAt, updatedAt }) {
    this.prediction_id = prediction_id;
    this.player_id = player_id;
    this.prediction = prediction;
    this.createdAt = createdAt ? new Date(createdAt) : null;
    this.updatedAt = updatedAt ? new Date(updatedAt) : null;
  }

  static fromJSON(json) {
    return new PredictionRow(json);
  }

  toJSON() {
    return {
      prediction_id: this.prediction_id,
      player_id: this.player_id,
      prediction: this.prediction,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }

  static async fetchByPrediction(prediction_id) {
    const res = await fetch(`/api/predictions/${prediction_id}/rows`);
    const data = await res.json();
    return data.map(PredictionRow.fromJSON);
  }

  async save() {
    const res = await fetch(`/api/prediction-rows`, {
      method: "POST",
      //credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.toJSON()),
    });
    const data = await res.json();
    Object.assign(this, PredictionRow.fromJSON(data));
  }
}

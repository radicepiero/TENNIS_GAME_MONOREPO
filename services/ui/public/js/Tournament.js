export class Tournament {
  constructor({
    id,
    name,
    href,
    category = null,
    location,
    country,
    surface,
    prizemoney,
    currency = "€",
    datainizio,
    datafine,
    status,
    ranking_date = null,
    rounds = null,
  }) {
    this.id = id;
    this.name = name;
    this.href = href;
    this.category = category;
    this.location = location;
    this.country = country;
    this.surface = surface;
    this.prizemoney = prizemoney;
    this.currency = currency;
    this.datainizio = datainizio;
    this.datafine = datafine;
    this.status = status;
    this.ranking_date = ranking_date;
    this.rounds = rounds;
  }

  getPrizeFormatted() {
    return `${this.currency}${this.prizemoney.toLocaleString()}`;
  }

  getDateRange() {
    return `${this.datainizio} → ${this.datafine}`;
  }

  isUpcoming() {
    return this.status === "upcoming";
  }

  isInProgress() {
    return this.status === "in-progress";
  }

  isCompleted() {
    return this.status === "completed";
  }

  getYear() {
    return new Date(this.datafine).getFullYear();
  }

  toString() {
    return `${this.name} (${this.getYear()}) in ${this.location}, ${
      this.country
    }`;
  }
  static async fetchTournament(tournament_id, apiUrl) {
    try {
      let response = await fetch(
        `${apiUrl}/tournaments/${tournament_id}/scripts`,
        {
          method: "GET",
          //credentials: "include", // <<< necessario
        }
      );
      return await response.json();
    } catch (error) {
      console.error(error);
    }
  }
}

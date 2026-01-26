export class Tournament {
  /*
   * Significato dello status del torneo:
   * excluded: il torneo è presente nel db ma non costituisce una campo per i pronostici
   * upcoming: il torneo costituirà un campo di gara ma non è ancora possibile inserire pronostici tramite albero
   * open: al torneo è stata assegnata una classifica ATP ed è possibile ottenere pronostico con punteggio
   * in-progress: il torneo è in svolgimento e non possono più essere modificati e salvati i pronostici (tranne che dal superuser)
   * completed: il torneo si è concluso e non è possibile presentare modificare cancellare ... i pronostici
   */
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

  isOpen() {
    return this.status === "open";
  }

  isInProgress() {
    return this.status === "in-progress";
  }

  isCompleted() {
    return this.status === "completed";
  }

  isExcluded() {
    return this.status === "excluded";
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
    const { fetchJson } = await import("./utils.js");
    return await fetchJson(`${apiUrl}/tournaments/${tournament_id}/scripts`, {
      method: "GET",
      credentials: "include",
    });
  }
}

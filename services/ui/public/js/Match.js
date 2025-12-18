export class Match {
  constructor({
    uuid = crypto.randomUUID(),
    tree = null,
    round = 1,
    player1 = null,
    player2 = null,
    p1Wins = false,
    p2Wins = false,
    date = null,
    fatherId = null,
    children = [],
    autoGenerateChildren = true, // nuovo parametro
  }) {
    this.uuid = uuid;
    this.tree = tree;
    this.round = round;
    this.player1 = player1;
    this.player2 = player2;
    this.p1Wins = p1Wins;
    this.p2Wins = p2Wins;
    this.date = date;
    this.fatherId = fatherId;
    this.children = children;

    this.ensureOnlyOneWinner();
    if (tree && round < tree.roundMax && autoGenerateChildren) {
      this.generateChildren();
    }
  }

  ensureOnlyOneWinner() {
    if (this.p1Wins && this.p2Wins) {
      throw new Error("Only one player can win a match.");
    }
  }

  generateChildren(roundMax) {
    if (this.children.length > 0 || this.round >= roundMax) return;

    const child1 = new Match({
      round: this.round + 1,
      fatherId: this.uuid,
      tree: this.tree,
    });
    const child2 = new Match({
      round: this.round + 1,
      fatherId: this.uuid,
      tree: this.tree,
    });

    this.children = [child1, child2];
    this.tree.matches.push(child1, child2);
  }

  autoTransferWinnerToFather() {
    if (!this.tree) return;

    const father = this.tree.matches.find((m) => m.uuid === this.fatherId);
    if (!father) return;

    const winner = this.p1Wins
      ? this.player1
      : this.p2Wins
      ? this.player2
      : null;
    if (!winner) return;

    const index = father.children.findIndex((c) => c.uuid === this.uuid);
    if (index === 0) father.player1 = winner;
    else if (index === 1) father.player2 = winner;
  }

  getRoundLabel() {
    const labels = ["Finale", "Semifinale", "Quarti", "Ottavi", "16-esimi", "32-esimi", "64-esimi"];
    return labels[this.round - 1] || `Round ${this.round}`;
  }

  toJSON() {
    return {
      uuid: this.uuid,
      treeId: this.tree?.uuid || null,
      round: this.round,
      player1: this.player1,
      player2: this.player2,
      p1Wins: this.p1Wins,
      p2Wins: this.p2Wins,
      date: this.date,
      fatherId: this.fatherId,
    };
  }

}

// tree/Tree.js
import { Match } from "../js/Match.js";

export class Tree {
  constructor({ uuid, name, tournament, roundMax, ownerId, matches = [] }) {
    this.uuid = uuid;
    this.name = name;
    this.tournament = tournament;
    this.ownerId = ownerId;
    this.roundMax = roundMax;
    this.matches = matches.map((m) => new Match({ ...m, tree: this }));
  }

  toJSON() {
    const tournamentId =
      this.tournament && typeof this.tournament === "object"
        ? this.tournament.id
        : this.tournament;
    return {
      uuid: this.uuid,
      name: this.name,
      tournamentId,
      ownerId: this.ownerId,
      roundMax: this.roundMax,
      matches: this.matches.map((m) => m.toJSON()),
    };
  }

  static generate({ name, tournament, ownerId, numPlayers }) {
    const roundMax = tournament.rounds
      ? tournament.rounds
      : Number.isInteger(Math.log2(numPlayers))
      ? Math.log2(numPlayers)
      : 1;

    if (!Number.isInteger(roundMax)) {
      throw new Error("Il numero di giocatori deve essere una potenza di 2");
    }

    const tree = new Tree({
      uuid: crypto.randomUUID(),
      name,
      tournament,
      ownerId,
      roundMax,
    });

    const finalMatch = new Match({
      uuid: crypto.randomUUID(),
      tree,
      round: 1,
    });

    tree.matches.push(finalMatch);
    finalMatch.generateChildren();

    return tree;
  }

  getUpdatedMatchesComparedTo(originalTree) {
    const updates = [];
    const originalMap = new Map(
      originalTree.matches.map((m) => [m.uuid, JSON.stringify(m.toJSON())])
    );

    for (const match of this.matches) {
      const current = JSON.stringify(match.toJSON());
      if (originalMap.get(match.uuid) !== current) {
        updates.push(match.toJSON());
      }
    }
    return updates;
  }

  static import({ treeData, matchList }) {
    const tree = new Tree({ ...treeData, matches: [] });
    const matchMap = {};

    matchList.forEach((matchData) => {
      const match = new Match({
        ...matchData,
        tree,
        autoGenerateChildren: false,
      });
      matchMap[match.uuid] = match;
      tree.matches.push(match);
    });

    tree.matches.forEach((match) => {
      if (match.fatherId) {
        const father = matchMap[match.fatherId];
        if (father) father.children.push(match);
      }
    });

    return tree;
  }
}

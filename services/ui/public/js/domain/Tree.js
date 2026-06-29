// tree/Tree.js
import { Match } from "./Match.js";

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

  static fromApi(apiData) {
    if (!apiData || typeof apiData !== "object") {
      throw new Error("apiData is required");
    }

    const toBool = (v) => {
      if (v === true) return true;
      if (v === false) return false;
      if (v === 1 || v === "1") return true;
      if (v === 0 || v === "0" || v === null || typeof v === "undefined") return false;
      if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true" || s === "t" || s === "yes" || s === "y") return true;
        if (s === "false" || s === "f" || s === "no" || s === "n" || s === "") return false;
      }
      return Boolean(v);
    };

    const treeData = {
      uuid: apiData.id ?? apiData.uuid,
      name: apiData.name,
      tournament: apiData.tournament,
      ownerId: apiData.ownerId,
      roundMax: apiData.roundMax,
    };

    const matchList =
      apiData.Matches?.map((match) => ({
        uuid: match.uuid,
        treeId: match.treeId,
        round: match.round,
        player1: match.player1Id,
        player2: match.player2Id,
        fatherId: match.fatherId,
        childIndex: match.childIndex,
        p1Wins: toBool(match.p1Wins),
        p2Wins: toBool(match.p2Wins),
        date: match.date,
      })) || [];

    return Tree.import({ treeData, matchList });
  }
}

// tree/TreeTreantAdapter.js

/**
 * Adatta un oggetto Tree alla struttura richiesta da Treant.js
 */
export function toTreantNodeStructure(tree, fromRound = null, toRound = null) {
  const matchesById = {};
  const childrenMap = {};

  for (const match of tree.matches) {
    matchesById[match.uuid] = match;
    if (match.fatherId) {
      if (!childrenMap[match.fatherId]) {
        childrenMap[match.fatherId] = [];
      }
      childrenMap[match.fatherId].push(match);
    }
  }

  const compareChildren = (a, b) => {
    const aC = typeof a.childIndex === "number" ? a.childIndex : null;
    const bC = typeof b.childIndex === "number" ? b.childIndex : null;

    if (aC !== null && bC !== null) {
      const by = aC - bC;
      if (by !== 0) return by;
    } else if (aC !== null) {
      return -1;
    } else if (bC !== null) {
      return 1;
    }

    return String(a.uuid).localeCompare(String(b.uuid));
  };

  const buildNode = (match) => {
    if (fromRound !== null && toRound !== null) {
      if (match.round < toRound || match.round > fromRound) {
        return null;
      }
    }

    const node = {
      innerHTML: `text`,
      HTMLid: `${match.uuid}`,
      nodeWidth: 300,
      nodeHeight: 200,
      HTMLclass: `treant-node round-${match.round}`,
      style: { width: "300px" },
    };

    if (childrenMap[match.uuid]) {
      const filteredChildren = childrenMap[match.uuid]
        .slice()
        .sort(compareChildren)
        .map(buildNode)
        .filter((child) => child !== null);

      if (filteredChildren.length > 0) {
        node.children = filteredChildren;
      }
    }

    return node;
  };

  const rootMatches = tree.matches.filter((m) => {
    const inRange =
      fromRound === null ||
      toRound === null ||
      (m.round >= toRound && m.round <= fromRound);
    const fatherOutOfRange =
      !m.fatherId ||
      !matchesById[m.fatherId] ||
      matchesById[m.fatherId].round < toRound ||
      matchesById[m.fatherId].round > fromRound;
    return inRange && fatherOutOfRange;
  });

  const nodes = rootMatches.map(buildNode).filter((node) => node !== null);

  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  return { pseudo: true, children: nodes };
}

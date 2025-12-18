import { generateQueryUrl } from "../js/utils.js";
import { Tree } from "/js/Tree.js";

export const treeApiClient = {
  generateTreeApiUrl(options = {}, apiUrl) {
    const defaultOptions = { includeMatches: true };
    return generateQueryUrl({ ...defaultOptions, ...options }, apiUrl);
  },

  async getTrees(options = {}, apiUrl) {
    const url = this.generateTreeApiUrl(options, apiUrl);
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to fetch trees");
    }

    return response.json();
  },

  async getTree(treeId, apiUrl, includeMatches = true) {
    if (!treeId) throw new Error("treeId is required");
    const result = await this.getTrees({ treeId, includeMatches }, apiUrl);
    return Array.isArray(result) ? result[0] : result;
  },

  /**
   * Converte un oggetto Tree nel formato API
   * @param {Tree} tree
   * @returns {Object} Dati nel formato API
   */
  _convertTreeToApiFormat(tree) {
    return {
      id: tree.uuid,
      name: tree.name,
      tournament: tree.tournament,
      ownerId: tree.ownerId,
      roundMax: tree.roundMax,
      Matches: tree.matches.map((match) => ({
        uuid: match.uuid,
        treeId: tree.uuid,
        round: match.round,
        player1Id: match.player1,
        player2Id: match.player2,
        fatherId: match.fatherId,
        p1Wins: match.p1Wins,
        p2Wins: match.p2Wins,
        date: match.date,
      })),
    };
  },

  /**
   * Converte i dati API in un formato compatibile con Tree.import()
   * @param {Object} apiData
   * @returns {Object} Dati nel formato di importazione
   */
  _convertApiToTreeFormat(apiData) {
    return {
      treeData: {
        uuid: apiData.id,
        name: apiData.name,
        tournament: apiData.tournament,
        ownerId: apiData.ownerId,
        roundMax: apiData.roundMax,
      },
      matchList:
        apiData.Matches?.map((match) => ({
          uuid: match.uuid,
          treeId: match.treeId,
          round: match.round,
          player1: match.player1Id,
          player2: match.player2Id,
          fatherId: match.fatherId,
          p1Wins: match.p1Wins,
          p2Wins: match.p2Wins,
          date: match.date,
        })) || [],
    };
  },

  /**
   * Salva o aggiorna un albero completo (dati + partite)
   * @param {Tree|Object} tree - Oggetto Tree OPPURE dati nel formato {id, name, Matches, ...}
   * @param {string} apiUrl - URL dell'API
   * @returns {Promise<Object>} - Risposta del server
   */
  async saveTree(tree, apiUrl) {
    if (!tree) throw new Error("tree is required");

    const treeId = tree.uuid || tree.id;
    if (!treeId) throw new Error("Tree ID is missing");

    if (!(tree instanceof Tree)) throw new Error("tree non è un albero Tree");

    const url = this.generateTreeApiUrl({ treeId }, apiUrl);

    const response = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tree),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to save tree");
    }

    return response.json();
  },

  /**
   * Elimina un albero dal server
   * @param {string} treeId - ID dell'albero da eliminare
   * @param {string} apiUrl - L'URL dell'API
   * @returns {Promise<Object>} - La risposta del server
   */
  async deleteTree(treeId, apiUrl) {
    if (!treeId) throw new Error("treeId is required");
    const url = this.generateTreeApiUrl({ treeId }, apiUrl);
    console.log(url);
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to delete tree");
    }

    return response.json();
  },

  /**
   * Recupera un albero e lo importa in un oggetto Tree
   * @param {string} treeId
   * @param {string} apiUrl
   * @returns {Promise<Tree>}
   */
  async fetchAndImportTree(treeId, apiUrl) {
    if (!treeId) throw new Error("treeId is required");
    const rawTree = await this.getTree(treeId, apiUrl, true);
    const importData = this._convertApiToTreeFormat(rawTree);
    return Tree.import(importData);
  },

  /**
   * Crea un nuovo albero sul server
   * @param {Tree|Object} tree - L'oggetto Tree o i dati dell'albero
   * @param {string} apiUrl - L'URL dell'API
   * @returns {Promise<Object>} - La risposta del server
   */
  async createTree(tree, apiUrl) {
    if (!tree) throw new Error("tree is required");

    if (!(tree instanceof Tree)) throw new Error("tree non è un albero Tree");

    const url = this.generateTreeApiUrl({}, apiUrl);
    
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tree),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(error);
      throw new Error(error || "Failed to create tree");
    }

    return response.json();
  },
};

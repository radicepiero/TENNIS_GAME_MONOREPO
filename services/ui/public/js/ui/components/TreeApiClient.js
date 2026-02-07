import { Tree } from "/js/domain/Tree.js";
import { treeApi } from "/js/api/treeApi.js";

export const treeApiClient = {
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

    return await treeApi.saveTree(treeId, tree, apiUrl);
  },

  /**
   * Recupera un albero e lo importa in un oggetto Tree
   * @param {string} treeId
   * @param {string} apiUrl
   * @returns {Promise<Tree>}
   */
  async fetchAndImportTree(treeId, apiUrl) {
    if (!treeId) throw new Error("treeId is required");
    const rawTree = await treeApi.getTree(treeId, apiUrl, true);
    return Tree.fromApi(rawTree);
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

    return await treeApi.createTree(tree, apiUrl);
  },
};

const db = require("../../models");

const getScripts = async (req, res) => {
  try {
    const scripts = await db.Script.findAll({ order: [["name", "ASC"]] });
    res.status(200).json({ success: true, data: scripts });
  } catch (error) {
    console.error("Errore nel recupero degli script:", error);
    res.status(500).json({ error: "Errore nel recupero degli script" });
  }
};

module.exports = {
  getScripts,
};

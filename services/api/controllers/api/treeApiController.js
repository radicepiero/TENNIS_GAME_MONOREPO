const TreeService = require("../../services/treeService");
const db = require("../../models");

async function create(req, res) {
  try {
    const result = await TreeService.createTree(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Create failed",
      details: error.message,
    });
  }
}

// READ (Single)
async function getById(req, res) {
  try {
    const tree = await TreeService.getTree({ treeId: req.params.id });
    tree ? res.json(tree) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    res.status(500).json({
      error: "Fetch failed",
      details: error.message,
    });
  }
}

// READ (All)
async function getAll(req, res) {
  try {
    req.query.ownerId = res.locals.user.dataValues.uuid;
    const user_trees = await TreeService.getTree(req.query);

    let trees = [];
    if (req.query.ownerId !== process.env.SUPERUSER) {
      req.query.ownerId = process.env.SUPERUSER;
      const superuser_trees = await TreeService.getTree(req.query);
      superuser_trees != null
        ? (trees = [...superuser_trees, ...user_trees])
        : (trees = user_trees);
    } else {
      trees = user_trees;
    }
    res.json(trees);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Fetch failed",
      details: error.message,
    });
  }
}

async function getSuperuserByTournament(req, res) {
  try {
    const tournamentId = req.params.tournamentId;
    if (!tournamentId) {
      return res.status(400).json({ error: "Bad Request", details: "tournamentId è obbligatorio" });
    }

    let superuserId = process.env.SUPERUSER;
    if (!superuserId) {
      const superUser = await db.User.findOne({ where: { level: "super" } });
      superuserId = superUser ? superUser.uuid : null;
    }
    if (!superuserId) {
      return res.status(404).json({ error: "Not found", details: "Utente super non trovato" });
    }

    const trees = await TreeService.getTree({
      tournamentId,
      ownerId: superuserId,
      includeMatches: req.query.includeMatches,
    });

    if (!trees || trees.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(trees[0]);
  } catch (error) {
    res.status(500).json({
      error: "Fetch failed",
      details: error.message,
    });
  }
}

// UPDATE
async function update(req, res) {
  try {
    const { treeId } = req.query;
    // Validazione input
    if (!treeId) {
      return res.status(400).json({
        error: "Bad Request",
        details: "treeId è obbligatorio",
      });
    }
    const userUuid = res.locals.user?.dataValues?.uuid;

    if (!userUuid) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "Utente non autenticato",
      });
    }
    // Recupera l'albero
    const trees = await TreeService.getTree({ treeId });

    if (!trees || trees.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        details: "Albero non trovato",
      });
    }

    const tree = trees[0];

    // Verifica proprietario
    if (tree.ownerId !== userUuid) {
      return res.status(403).json({
        error: "Forbidden",
        details: "Impossibile modificare alberi di altri utenti",
      });
    }

    const result = await TreeService.updateTree(treeId, req.body);
    res.json(result);
  } catch (error) {
    const status = error.message === "Tree not found" ? 404 : 500;
    res.status(status).json({
      error: "Update failed",
      details: error.message,
    });
  }
}
// DELETE
async function deleteOne(req, res) {
  try {
    const { treeId } = req.query;
    const userUuid = res.locals.user?.dataValues?.uuid;

    // Validazione input
    if (!treeId) {
      return res.status(400).json({
        error: "Bad Request",
        details: "treeId è obbligatorio",
      });
    }

    if (!userUuid) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "Utente non autenticato",
      });
    }

    // Recupera l'albero
    const trees = await TreeService.getTree({ treeId });

    if (!trees || trees.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        details: "Albero non trovato",
      });
    }

    const tree = trees[0];

    // Verifica proprietario
    if (tree.ownerId !== userUuid) {
      return res.status(403).json({
        error: "Forbidden",
        details: "Impossibile cancellare alberi di altri utenti",
      });
    }

    // Eliminazione
    const result = await TreeService.deleteTree(treeId);

    res.json({
      success: true,
      message: "Albero eliminato con successo",
      data: result,
    });
  } catch (error) {
    console.error("Delete tree error:", error);

    const status = error.statusCode || 500;
    res.status(status).json({
      error: "Delete Failed",
      details: error.message || "Errore interno del server",
    });
  }
}

module.exports = {
  create,
  update,
  deleteOne,
  getById,
  getAll,
  getSuperuserByTournament,
};

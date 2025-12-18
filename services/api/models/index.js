const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");
const basename = path.basename(__filename);

const db = {};
// Configura la connessione al database
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DB_USER,
  process.env.DB_PSSW,
  {
    host: process.env.DB_CONNESSIONE,
    dialect: "postgres",
  }
);

// Importa e inizializza i modelli
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
  )
  .forEach((file) => {
    const modelModule = require(path.join(__dirname, file));
    console.log(`Loading ${file}:`, typeof modelModule);
    const model = modelModule(sequelize, Sequelize.DataTypes); // qui fallisce se non è funzione
    db[model.name] = model;
  });

// Setup delle associazioni
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

const { Sequelize, DataTypes } = require("sequelize");
require("dotenv/config");
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DB_USER,
  process.env.DB_PSSW,
  {
    host: process.env.DB_CONNESSIONE,
    dialect: process.env.DIALECT,
  }
);
// Funzione per connettersi al database
async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("Connessione al database riuscita");
    await sequelize.sync();
  } catch (error) {
    console.error("Errore di connessione al database:", error);
    process.exit(1);
  }
}
const db = require("../models");
const Player = db.Player;
//const rank = require("../services/rankingService");
async function splitAndUpdateNames() {
  try {
    await sequelize.authenticate();
    console.log("Connessione a PostgreSQL riuscita.");

    const players = await Player.findAll();

    for (const player of players) {
      if (!player.name) continue;

      const parts = player.name.trim().split(/\s+/);
      const firstName = parts[0];
      const secondName = parts.slice(1).join(" ") || null;

      await player.update({
        first_name: firstName,
        second_name: secondName,
      });

      console.log(`Aggiornato ${player.id}: ${firstName} ${secondName || ""}`);
    }

    console.log("Aggiornamento completato.");
  } catch (error) {
    console.error("Errore:", error);
  } finally {
    await sequelize.close();
  }
}

connectDB().then(() => {
  splitAndUpdateNames();
});

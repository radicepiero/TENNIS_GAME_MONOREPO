const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const dotenv = require("dotenv");

// opzionale: se esiste un .env (root o services/api), caricalo
try {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const candidates = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, "services", "api", ".env"),
  ];
  for (const p of candidates) {
    dotenv.config({ path: p });
  }
} catch (e) {}

// Defaults per esecuzione su host (docker-compose espone Postgres su 5432)
if (!process.env.DATABASE) process.env.DATABASE = "utenticoi_1";
if (!process.env.DB_USER) process.env.DB_USER = "postgres";
if (typeof process.env.DB_PSSW === "undefined") process.env.DB_PSSW = "postgres";
if (!process.env.DB_CONNESSIONE) process.env.DB_CONNESSIONE = "localhost";

// assicurati che DB_PSSW sia una stringa
process.env.DB_PSSW = String(process.env.DB_PSSW);

const db = require("../../models");
const Player = db.Player;
const Ranking = db.Ranking;
// Funzione per connettersi al database
async function connectDB() {
  try {
    await db.sequelize.authenticate();
    console.log("Connessione al database riuscita");
    await db.sequelize.sync();
  } catch (error) {
    console.error("Errore di connessione al database:", error);
    process.exit(1);
  }
}

// Funzione per elaborare il file CSV
async function processCSV(filePath, rankingDate) {
  await connectDB();
  const results = [];
  const resolvedCsv = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  fs.createReadStream(resolvedCsv)
    .pipe(csv({ headers: true, skipLines: 1, trim: true }))
    .on("data", (data) => {
      const name = data[Object.keys(data)[0]];
      const value = parseInt(data[Object.keys(data)[1]], 10);
      results.push({ name, value });
    })
    .on("end", async () => {
      for (const row of results) {
        console.log("Elaborazione riga:", row);
        const { name, value } = row;

        let player = await Player.findOne({ where: { name } });
        if (!player) {
          player = await Player.create({ name });
        }

        await Ranking.create({
          player_name: name,
          date: new Date(rankingDate),
          ranking: value,
        });
      }
      console.log("Elaborazione completata");
      await db.sequelize.close();
    });
}

// Esegui la funzione con il percorso del file CSV
if (require.main === module) {
  const [, , csvPath, rankingDate] = process.argv;
  if (!csvPath || !rankingDate) {
    console.error("Uso: node aggiungiRanking.js <file.csv> <YYYY-MM-DD>");
    process.exit(1);
  }
  processCSV(csvPath, rankingDate);
}

module.exports = { processCSV };

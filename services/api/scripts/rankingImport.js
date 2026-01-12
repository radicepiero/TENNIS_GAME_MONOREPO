const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const db = require("../models");
const Player = db.Player;
const Ranking = db.Ranking;

async function connectDB() {
  await db.sequelize.authenticate();
  await db.sequelize.sync();
}

async function importRankingFromCsv(filePath, rankingDate) {
  await connectDB();

  const resolvedCsv = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(resolvedCsv)
      .pipe(csv({ headers: true, skipLines: 1, trim: true }))
      .on("data", (data) => {
        try {
          const keys = Object.keys(data);
          const name = data[keys[0]];
          const value = parseInt(data[keys[1]], 10);
          rows.push({ name, value });
        } catch (e) {
          reject(e);
        }
      })
      .on("error", reject)
      .on("end", resolve);
  });

  let createdPlayers = 0;
  let createdRankings = 0;

  for (const row of rows) {
    const name = row && row.name ? String(row.name).trim() : "";
    const value = Number.isFinite(row.value) ? row.value : Number(row.value);
    if (!name || !Number.isFinite(value)) continue;

    let player = await Player.findOne({ where: { name } });
    if (!player) {
      player = await Player.create({ name });
      createdPlayers += 1;
    }

    await Ranking.create({
      player_name: name,
      date: new Date(rankingDate),
      ranking: value,
    });
    createdRankings += 1;
  }

  return { rows: rows.length, createdPlayers, createdRankings };
}

module.exports = { importRankingFromCsv };

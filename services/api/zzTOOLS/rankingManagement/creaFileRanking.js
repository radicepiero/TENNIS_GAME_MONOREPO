const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const creaFileRanking = (pathToDataFile, dataRanking) => {
  const inputPath = path.isAbsolute(pathToDataFile)
    ? pathToDataFile
    : path.resolve(process.cwd(), pathToDataFile);
  const html = fs.readFileSync(inputPath, "utf-8");
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const table = document.getElementsByClassName(
    "mega-table desktop-table non-live"
  )[0];
  if (!table) {
    throw new Error(
      "Tabella ranking non trovata: classe 'mega-table desktop-table non-live'"
    );
  }
  const elems = table.getElementsByClassName("lower-row");
  const players = [];

  for (let i = 0; i < Math.min(600, elems.length); i++) {
    const row = elems[i];
    const player = {};

    // Rank
    player.rank = elems[i].getElementsByClassName(
      "rank bold heavy tiny-cell"
    )[0].innerHTML;

    player.name = elems[i]
      .getElementsByClassName("name center")[0]
      .getElementsByTagName("span")[0].innerHTML;

    players.push(player);
  }

  // Crea il contenuto CSV
  const csvLines = ["rank,name"];
  players.forEach((p) => {
    csvLines.push(`${p.name},${p.rank}`);
  });

  const csvContent = csvLines.join("\n");
  const outputPath = path.isAbsolute(dataRanking)
    ? dataRanking
    : path.resolve(process.cwd(), dataRanking);
  fs.writeFileSync(outputPath, csvContent, "utf-8");

  console.log(`✅ File CSV creato con successo: ${outputPath}`);
};

// Esempio di utilizzo:
// creaFileRanking("./pagina.html", "classifica.csv");

if (require.main === module) {
  const [, , htmlPath, csvOutPath] = process.argv;
  if (!htmlPath || !csvOutPath) {
    console.error("Uso: node creaFileRanking.js <ranking.html> <output.csv>");
    process.exit(1);
  }
  creaFileRanking(htmlPath, csvOutPath);
}

module.exports = { creaFileRanking };

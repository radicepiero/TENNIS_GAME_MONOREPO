const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

function loadEnvIfExists(envPath) {
  if (!envPath) return false;
  try {
    if (!fs.existsSync(envPath)) return false;
    dotenv.config({ path: envPath });
    return true;
  } catch (e) {
    return false;
  }
}

const XLSX = require("xlsx");

let db;
let predictionService;
let tournamentService;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function assertDbEnv() {
  const required = ["DATABASE", "DB_USER", "DB_PSSW", "DB_CONNESSIONE"];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).length === 0);
  if (missing.length === 0) return true;

  console.error("Variabili DB mancanti:", missing.join(", "));
  console.error(
    "Suggerimenti:\n" +
      "- Lancia lo script dalla cartella services/api dove normalmente hai le env\n" +
      "- Oppure passa un file env esplicito: --env C:\\path\\to\\.env\n" +
      "- Se stai usando docker-compose: usa --compose (host postgres) oppure --composeLocal (host localhost)\n" +
      "- Oppure esporta le variabili d'ambiente (DATABASE, DB_USER, DB_PSSW, DB_CONNESSIONE)"
  );
  return false;
}

function applyComposeDefaults({ local } = {}) {
  if (!process.env.DATABASE) process.env.DATABASE = "utenticoi_1";
  if (!process.env.DB_USER) process.env.DB_USER = "postgres";
  if (!process.env.DB_PSSW) process.env.DB_PSSW = "postgres";
  if (!process.env.DB_CONNESSIONE)
    process.env.DB_CONNESSIONE = local ? "localhost" : "postgres";
}

function applyDbOverrides(args) {
  if (args.dbName) process.env.DATABASE = String(args.dbName);
  if (args.dbUser) process.env.DB_USER = String(args.dbUser);
  if (args.dbPass) process.env.DB_PSSW = String(args.dbPass);
  if (args.dbHost) process.env.DB_CONNESSIONE = String(args.dbHost);
}

function normalizeString(v) {
  if (v === null || typeof v === "undefined") return "";
  return String(v).trim();
}

function normalizePlayerCellValue(v) {
  const s = normalizeString(v);
  if (!s) return "";

  // Common formats in exported spreadsheets:
  // - "11 Player Name 320" (ranking + name + points)
  // - "Player Name 12"
  // - "Player Name (12)"
  // - "Player Name - 12" / "Player Name: 12"
  // We strip the trailing numeric score part when present.
  let out = s;

  // Remove leading ranking like: "1 Jannik Sinner ..."
  out = out.replace(/^\s*\d+\s+/, "");

  // Remove any trailing "punti ..." section (e.g. "(1) punti : 80")
  out = out.replace(/\s+punti\b.*$/i, "");

  // Remove parenthesized ranking like: "Jannik Sinner (1)"
  out = out.replace(/\s*\(\s*\d+\s*\)\s*$/g, "");

  // Strip trailing numeric score part when present.
  out = out.replace(/\s*(?:[-:]\s*)?\(?\s*\d+\s*\)?\s*$/g, "");

  const stripped = out.trim();

  return stripped;
}

function isNumericId(v) {
  const s = normalizeString(v);
  return /^\d+$/.test(s);
}

function pickColumnKey(rowKeys, explicitKey, predicate) {
  if (explicitKey) {
    const k = rowKeys.find((x) => String(x) === String(explicitKey));
    if (k) return k;
  }
  return rowKeys.find((k) => predicate(String(k)));
}

function defaultColumnMapping(sampleRow, args) {
  const keys = Object.keys(sampleRow || {});

  const emailKey = pickColumnKey(
    keys,
    args.emailCol,
    (k) => k.toLowerCase().includes("email")
  );

  const winnerKey = pickColumnKey(
    keys,
    args.winnerCol,
    (k) => /winner|vincitore/i.test(k)
  );

  let semiKeys = [];
  if (args.semiCols) {
    const wanted = String(args.semiCols)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    semiKeys = wanted
      .map((w) => keys.find((k) => String(k) === String(w)))
      .filter(Boolean);
  } else {
    semiKeys = keys
      .filter((k) => /semi|semifinal/i.test(String(k)))
      .filter((k) => String(k) !== String(winnerKey));
  }

  return {
    emailKey,
    winnerKey,
    semiKeys,
  };
}

async function resolveUserUuidByEmail(email) {
  const e = normalizeString(email).toLowerCase();
  if (!e) return null;

  const user = await db.User.findOne({ where: { email: e } });
  return user ? user.uuid : null;
}

async function resolvePlayerId(value) {
  const v = normalizeString(value);
  if (!v) return null;

  if (isNumericId(v)) {
    const id = Number(v);
    const player = await db.Player.findByPk(id);
    return player ? player.id : null;
  }

  const byName = normalizePlayerCellValue(v);
  if (!byName) return null;

  const player = await db.Player.findOne({ where: { name: byName } });
  return player ? player.id : null;
}

async function upsertPrediction({ user_uuid, tournament_id, rows, overwrite }) {
  if (!overwrite) {
    return await predictionService.createPrediction({ user_uuid, tournament_id, rows });
  }

  const existing = await predictionService.readPredictionByUserIdTournamentId(
    user_uuid,
    tournament_id
  );

  if (existing && existing.length > 0) {
    await predictionService.deletePrediction(existing[0].id);
  }

  return await predictionService.createPrediction({ user_uuid, tournament_id, rows });
}

async function main() {
  const args = parseArgs(process.argv);

  const explicitEnv = args.env ? String(args.env) : "";
  const envCandidates = [
    explicitEnv,
    path.resolve(__dirname, "../.env"),
    path.resolve(process.cwd(), ".env"),
  ].filter(Boolean);

  let loaded = false;
  for (const p of envCandidates) {
    if (loadEnvIfExists(p)) {
      loaded = true;
      break;
    }
  }

  if (args.composeLocal) applyComposeDefaults({ local: true });
  else if (args.compose) applyComposeDefaults({ local: false });

  applyDbOverrides(args);

  // Require models/services only after env has been loaded/applied.
  db = require("../models");
  predictionService = require("../services/predictionService");
  tournamentService = require("../services/tournamentService");

  const file = args.file;
  const tournamentId = args.tournamentId;

  if (!file || !tournamentId) {
    console.error(
      "Uso: node zzTOOLS/importPredictionsFromXlsx.js --file <path.xlsx> --tournamentId <id> [--env <path.env>] [--compose|--composeLocal] [--dbHost <host>] [--dbName <db>] [--dbUser <user>] [--dbPass <pass>] [--sheet <name>] [--dryRun] [--overwrite] [--emailCol <col>] [--winnerCol <col>] [--semiCols <c1,c2,c3>]"
    );
    process.exit(1);
  }

  if (!assertDbEnv()) {
    process.exit(1);
  }

  const absPath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

  await db.sequelize.authenticate();

  const torneo = await tournamentService.getTournament(tournamentId);
  if (!torneo) {
    console.error(`Torneo non trovato: ${tournamentId}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(absPath);
  const sheetName = args.sheet || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet non trovato: ${sheetName}`);
    process.exit(1);
  }

  const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
  if (!Array.isArray(data) || data.length === 0) {
    console.error("Nessuna riga trovata nel file XLSX");
    process.exit(1);
  }

  const mapping = defaultColumnMapping(data[0], args);
  if (!mapping.emailKey) {
    console.error("Colonna email non trovata. Usa --emailCol per specificarla.");
    process.exit(1);
  }
  if (!mapping.winnerKey) {
    console.error("Colonna winner/vincitore non trovata. Usa --winnerCol per specificarla.");
    process.exit(1);
  }
  if (!mapping.semiKeys || mapping.semiKeys.length < 3) {
    console.error(
      "Colonne semifinalisti non trovate (almeno 3). Usa --semiCols col1,col2,col3 per specificarle."
    );
    process.exit(1);
  }

  const dryRun = Boolean(args.dryRun);
  const overwrite = Boolean(args.overwrite);

  console.log("Import pronostici da XLSX");
  console.log("- file:", absPath);
  console.log("- tournamentId:", tournamentId);
  console.log("- sheet:", sheetName);
  console.log("- dryRun:", dryRun);
  console.log("- overwrite:", overwrite);
  console.log("- mapping:", mapping);

  const stats = {
    totalRows: data.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];

    try {
      const email = normalizeString(row[mapping.emailKey]);
      const user_uuid = await resolveUserUuidByEmail(email);

      if (!user_uuid) {
        stats.skipped++;
        console.warn(`[skip] Riga ${idx + 2}: utente non trovato per email '${email}'`);
        continue;
      }

      const winnerValue = row[mapping.winnerKey];
      const semiValues = mapping.semiKeys.slice(0, 3).map((k) => row[k]);

      const winnerPlayerId = await resolvePlayerId(winnerValue);
      const semiPlayerIds = [];
      for (const sv of semiValues) {
        semiPlayerIds.push(await resolvePlayerId(sv));
      }

      if (!winnerPlayerId || semiPlayerIds.some((x) => !x)) {
        stats.skipped++;
        console.warn(
          `[skip] Riga ${idx + 2}: player non risolti (winner='${normalizeString(
            winnerValue
          )}', semi='${semiValues.map(normalizeString).join(" | ")}')`
        );
        continue;
      }

      const uniq = new Set([winnerPlayerId, ...semiPlayerIds]);
      if (uniq.size !== 4) {
        stats.skipped++;
        console.warn(`[skip] Riga ${idx + 2}: player duplicati nella riga`);
        continue;
      }

      const rows = [
        { player_id: winnerPlayerId, prediction: "winner" },
        ...semiPlayerIds.map((id) => ({ player_id: id, prediction: "semifinalist" })),
      ];

      if (dryRun) {
        stats.imported++;
        console.log(`[dryRun] Riga ${idx + 2}: OK user=${email} rows=${JSON.stringify(rows)}`);
        continue;
      }

      await upsertPrediction({
        user_uuid,
        tournament_id: Number(tournamentId),
        rows,
        overwrite,
      });

      stats.imported++;
      console.log(`[ok] Riga ${idx + 2}: importata prediction per ${email}`);
    } catch (e) {
      stats.errors++;
      console.error(`[error] Riga ${idx + 2}:`, e && e.message ? e.message : e);
    }
  }

  console.log("FINE import", stats);
  await db.sequelize.close();
}

main().catch(async (e) => {
  console.error("Errore fatale:", e);
  try {
    await db.sequelize.close();
  } catch (err) {}
  process.exit(1);
});

const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");

const db = require("../models");

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

function loadEnvIfExists(envPath) {
  if (!envPath) return false;
  try {
    if (!fs.existsSync(envPath)) return false;
    dotenv.config({ path: envPath });
    return true;
  } catch (_) {
    return false;
  }
}

function applyComposeDefaults({ local } = {}) {
  if (!process.env.DATABASE) process.env.DATABASE = "utenticoi_1";
  if (!process.env.DB_USER) process.env.DB_USER = "postgres";
  if (!process.env.DB_PSSW) process.env.DB_PSSW = "postgres";
  if (!process.env.DB_CONNESSIONE) process.env.DB_CONNESSIONE = local ? "localhost" : "postgres";
}

function assertDbEnv() {
  const required = ["DATABASE", "DB_USER", "DB_PSSW", "DB_CONNESSIONE"];
  const missing = required.filter(
    (k) => !process.env[k] || String(process.env[k]).length === 0
  );
  if (missing.length === 0) return true;

  console.error("Variabili DB mancanti:", missing.join(", "));
  console.error(
    "Suggerimenti:\n" +
      "- Se stai usando docker-compose, lancia lo script nel container api, oppure usa --compose (host postgres)\n" +
      "- Se lo lanci in locale con postgres esposto su 5432, usa --composeLocal (host localhost)\n" +
      "- Oppure passa un env esplicito: --env C:\\path\\to\\.env"
  );
  return false;
}

const MONTHS = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateOnly(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function slugify(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function cleanCity(token) {
  // remove footnote digits and stray commas
  return token.replace(/[0-9]/g, "").replace(/,+/g, ",").trim();
}

function surfaceFromCode(code) {
  // Codes observed in the TXT: H, CL, G, IH
  switch (code) {
    case "H":
      return { material: "hard", indoor: false, color: null };
    case "CL":
      return { material: "clay", indoor: false, color: null };
    case "G":
      return { material: "grass", indoor: false, color: null };
    case "IH":
      return { material: "hard", indoor: true, color: null };
    default:
      return { material: "hard", indoor: false, color: null };
  }
}

function estimateDurationDays(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("GRAND SLAM")) return 14;
  if (c.includes("ATP MASTERS 1000")) return 13;
  if (c.includes("ATP FINALS")) return 8;
  if (c.includes("UNITED CUP")) return 10;
  if (c.includes("LAVER CUP")) return 3;
  if (c.includes("DAVIS CUP")) return 3;
  if (c.includes("ATP 500")) return 7;
  if (c.includes("ATP 250")) return 7;
  return 7;
}

function addDays(dateOnly, days) {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return toDateOnly(y, m, day);
}

function normalizeSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

function hasDateToken(line) {
  return /\b\d{1,2}-[A-Z]{3}\b/.test(line);
}

function extractFirstDateToken(line) {
  const m = line.match(/\b(\d{1,2}-[A-Z]{3})\b/);
  return m ? m[1] : null;
}

function parseCategoryFromTokens(tokens) {
  const joined = tokens.join(" ");
  if (joined.includes("ATP MASTERS 1000")) return "ATP Masters 1000";
  if (joined.includes("GRAND SLAM")) return "Grand Slam";
  if (joined.includes("ATP FINALS")) return "ATP Finals";
  if (joined.includes("UNITED CUP")) return "United Cup";
  if (joined.includes("LAVER CUP")) return "Laver Cup";
  if (joined.includes("DAVIS CUP")) return "Davis Cup";

  // ATP 250 / 500
  const m = joined.match(/ATP\s+(250|500)/);
  if (m) return `ATP ${m[1]}`;

  return null;
}

function findSurfaceCode(tokens) {
  // surface code is usually one token among: H, CL, G, IH
  // Sometimes IH appears as separate token.
  const idx = tokens.findIndex((t) => ["H", "CL", "G", "IH"].includes(t));
  if (idx === -1) return null;
  return { code: tokens[idx], index: idx };
}

function isChallengerSectionLine(line) {
  // After this marker we stop parsing ATP Tour section.
  return /2026\s+Calendar\s+Revised/i.test(line);
}

function isMonthHeader(line) {
  return /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+2026\s*$/i.test(line);
}

function parseDateToken(token, defaultYear = 2026) {
  // token like 02-JAN
  const m = token.match(/^(\d{1,2})-([A-Z]{3})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[m[2]];
  if (!mon) return null;
  return { year: defaultYear, month: mon, day };
}

function parseAtpTourTournamentLine(line) {
  // Best-effort parser for a normalized *record* line.
  // The TXT is messy: records are often wrapped across multiple lines.
  // We therefore parse by locating substrings (date, category, surface).
  // Example (after reconstruction):
  // "02-FEB MONTPELLIER ATP 250 OPEN OCCITANIE IH 28"
  const s = normalizeSpaces(line);
  const dateTok = extractFirstDateToken(s);
  if (!dateTok) return null;
  const date = parseDateToken(dateTok);
  if (!date) return null;

  // Remove any leading tokens before date (week number etc.)
  const afterDateStr = s.slice(s.indexOf(dateTok) + dateTok.length).trim();
  if (!afterDateStr) return null;

  // Find category marker position
  const catRe = /(ATP\s+MASTERS\s+1000|GRAND\s+SLAM|ATP\s+FINALS|UNITED\s+CUP|LAVER\s+CUP|DAVIS\s+CUP|ATP\s+500|ATP\s+250)/;
  const catMatch = afterDateStr.match(catRe);
  if (!catMatch || typeof catMatch.index !== "number") return null;

  const city = cleanCity(afterDateStr.slice(0, catMatch.index));
  const afterCatStr = afterDateStr.slice(catMatch.index + catMatch[0].length).trim();
  if (!city || !afterCatStr) return null;

  // Find surface code (first occurrence)
  const surfRe = /\b(IH|CL|H|G)\b/;
  const surfMatch = afterCatStr.match(surfRe);
  if (!surfMatch || typeof surfMatch.index !== "number") return null;

  const name = normalizeSpaces(afterCatStr.slice(0, surfMatch.index));
  if (!name) return null;

  const category =
    catMatch[0].replace(/\s+/g, " ") === "ATP MASTERS 1000"
      ? "ATP Masters 1000"
      : catMatch[0].replace(/\s+/g, " ") === "GRAND SLAM"
        ? "Grand Slam"
        : catMatch[0].replace(/\s+/g, " ");

  const surface = surfaceFromCode(surfMatch[1]);

  return {
    datainizio: toDateOnly(date.year, date.month, date.day),
    location: city,
    category,
    name,
    surface,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.file || process.argv[2];
  if (!inputPath) {
    console.error(
      "Usage: node zzTOOLS/importAtpTour2026FromTxt.js --file <path-to-txt> [--env <path.env>] [--compose] [--composeLocal]"
    );
    process.exit(1);
  }

  const explicitEnv = args.env ? String(args.env) : "";
  const envCandidates = [
    explicitEnv,
    path.resolve(__dirname, "../.env"),
    path.resolve(process.cwd(), ".env"),
  ].filter(Boolean);
  for (const p of envCandidates) {
    if (loadEnvIfExists(p)) break;
  }

  if (args.composeLocal) applyComposeDefaults({ local: true });
  else if (args.compose) applyComposeDefaults({ local: false });

  if (!assertDbEnv()) process.exit(1);

  const abs = path.resolve(inputPath);
  const raw = fs.readFileSync(abs, "utf8");
  const lines = raw.split(/\r?\n/);

  // Extract only the first ATP Tour block (Jan-Dec 2026) and stop before Challenger section.
  const filtered = [];
  let inAtp2026 = false;

  for (const l of lines) {
    const line = normalizeSpaces(l);
    if (!line) continue;

    if (isChallengerSectionLine(line)) break;

    if (/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+2026/i.test(line)) {
      inAtp2026 = true;
      continue;
    }

    if (!inAtp2026) continue;

    // Skip headers
    if (/WEEK DATE CITY CATEGORY/i.test(line)) continue;
    if (/OTHER INFORMATION/i.test(line)) continue;
    if (/DRAWS/i.test(line) && line.length < 20) continue;

    filtered.push(line);
  }

  // Reassemble records: start a new record when a line contains a date token.
  // Append following lines until the next date-token line.
  const records = [];
  let current = "";
  for (const line of filtered) {
    if (hasDateToken(line)) {
      if (current) records.push(normalizeSpaces(current));
      current = line;
    } else if (current) {
      current = `${current} ${line}`;
    }
  }
  if (current) records.push(normalizeSpaces(current));

  const candidates = [];
  const skipped = [];

  for (const line of records) {
    const parsed = parseAtpTourTournamentLine(line);
    if (!parsed) {
      skipped.push(line);
      continue;
    }
    candidates.push(parsed);
  }

  // De-dup within this run by (name, datainizio)
  const uniqueMap = new Map();
  for (const t of candidates) {
    const key = `${t.name}__${t.datainizio}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, t);
  }
  const unique = Array.from(uniqueMap.values());

  await db.sequelize.authenticate();

  const Tournament = db.Tournament;
  const YEAR = 2026;
  const yearStart = `${YEAR}-01-01`;
  const yearEnd = `${YEAR}-12-31`;

  let inserted = 0;
  let existed = 0;
  let failed = 0;

  for (const t of unique) {
    const duration = estimateDurationDays(t.category);
    const datafine = addDays(t.datainizio, duration);

    // Enforce 2026 year by datafine
    if (!datafine.startsWith("2026-")) {
      continue;
    }

    const href = `/tornei/${slugify(t.name)}-2026`;

    try {
      const already = await Tournament.findOne({
        where: {
          name: t.name,
          datafine: {
            [db.Sequelize.Op.between]: [yearStart, yearEnd],
          },
        },
      });

      if (already) {
        existed++;
        continue;
      }

      await Tournament.create({
        name: t.name,
        href,
        category: t.category,
        location: t.location || "Unknown",
        country: "Unknown",
        surface_jsonb: t.surface || { material: "hard", indoor: false, color: null },
        prizemoney: 0,
        currency: "€",
        datainizio: t.datainizio,
        datafine,
        status: "upcoming",
        ranking_date: null,
        rounds: null,
        costopartecipazione: 5,
      });

      inserted++;
    } catch (e) {
      failed++;
      console.error("Failed insert:", t, e?.message || e);
    }
  }

  console.log("\n--- Import report (ATP Tour 2026) ---");
  console.log("Parsed candidates:", candidates.length);
  console.log("Unique candidates:", unique.length);
  console.log("Inserted:", inserted);
  console.log("Already existed:", existed);
  console.log("Failed:", failed);
  console.log("Skipped lines (unparsed):", skipped.length);

  if (skipped.length) {
    console.log("\n--- Sample skipped lines (first 30) ---");
    skipped.slice(0, 30).forEach((s) => console.log(s));
  }

  await db.sequelize.close();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await db.sequelize.close();
  } catch (_) {}
  process.exit(1);
});

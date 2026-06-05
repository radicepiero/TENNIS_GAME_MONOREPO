export const APP_ICONS = {
  EDIT: "✏️",
  DELETE: "🗑️",
  SAVE: "💾",
  ADD: "➕",
  SEARCH: "🔍",
  VIEW: "👁️",
  CRYSTAL_BALL: "🔮",
  RESULTS: "📊",
  ARROW_LEFT: "←",
  ARROW_RIGHT: "→",
  PLAYER_TBD: "🫸",
  WINNER: "👍",
  LOOSER: "👎",
  CLOSE: "❌",
  SETTINGS: "⚙️",
  MOVE: "⤢",
  EXPAND: "➕",
  COLLAPSE: "➖",
  DEFAULT_PLAYER: "👤",
  DRAW: '<img src="/immagini/tabellone.png" alt="" style="height:1em;width:1em;vertical-align:-0.15em;" />',
  SVILUPPO: '<img src="/immagini/pronostici.png" alt="" style="height:2em;width:2em;vertical-align:-0.15em;" />',
};
export const APP_BUTTONS = {
  EDIT: APP_ICONS.EDIT+" Modifica",
  DELETE: APP_ICONS.DELETE+" Elimina",
  SAVE: APP_ICONS.SAVE+" Salva",
  ADD: APP_ICONS.ADD+" Aggiungi",
  SEARCH: APP_ICONS.SEARCH+" Cerca",
  VIEW: APP_ICONS.VIEW+" Visualizza",
  CRYSTAL_BALL: APP_ICONS.CRYSTAL_BALL+" Pronostici",
  RESULTS: APP_ICONS.RESULTS+" Risultati",
  PLAYER_TBD: APP_ICONS.PLAYER_TBD + " giocatore da stabilire",
  DRAW: APP_ICONS.DRAW + " tabellone",
  SVILUPPO: APP_ICONS.SVILUPPO + " sviluppo",
};

export const DEFAULT_PLAYER_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export const roundLabels = [
  "Pronostici",
  "128-esimi",
  "64-esimi",
  "32-esimi",
  "16-esimi",
  "Ottavi",
  "Quarti",
  "Semifinali",
  "Finale",
];

export const phaseLabels = [
  roundLabels[0],
  roundLabels[3],
  roundLabels[4],
  roundLabels[5],
  roundLabels[6],
  roundLabels[7],
  roundLabels[8],
];
export const COUNTRY_CODE_MAP = {
AD: { iso3: "AND", name_it: "Andorra" },
AE: { iso3: "ARE", name_it: "Emirati Arabi Uniti" },
AF: { iso3: "AFG", name_it: "Afghanistan" },
AG: { iso3: "ATG", name_it: "Antigua e Barbuda" },
AI: { iso3: "AIA", name_it: "Anguilla" },
AL: { iso3: "ALB", name_it: "Albania" },
AM: { iso3: "ARM", name_it: "Armenia" },
AO: { iso3: "AGO", name_it: "Angola" },
AQ: { iso3: "ATA", name_it: "Antartide" },
AR: { iso3: "ARG", name_it: "Argentina" },
AS: { iso3: "ASM", name_it: "Samoa americane" },
AT: { iso3: "AUT", name_it: "Austria" },
AU: { iso3: "AUS", name_it: "Australia" },
AW: { iso3: "ABW", name_it: "Aruba" },
AX: { iso3: "ALA", name_it: "Isole Åland" },
AZ: { iso3: "AZE", name_it: "Azerbaigian" },
BA: { iso3: "BIH", name_it: "Bosnia ed Erzegovina" },
BB: { iso3: "BRB", name_it: "Barbados" },
BD: { iso3: "BGD", name_it: "Bangladesh" },
BE: { iso3: "BEL", name_it: "Belgio" },
BF: { iso3: "BFA", name_it: "Burkina Faso" },
BG: { iso3: "BGR", name_it: "Bulgaria" },
BH: { iso3: "BHR", name_it: "Bahrein" },
BI: { iso3: "BDI", name_it: "Burundi" },
BJ: { iso3: "BEN", name_it: "Benin" },
BL: { iso3: "BLM", name_it: "Saint-Barthélemy" },
BM: { iso3: "BMU", name_it: "Bermuda" },
BN: { iso3: "BRN", name_it: "Brunei" },
BO: { iso3: "BOL", name_it: "Bolivia" },
BQ: { iso3: "BES", name_it: "Caraibi olandesi" },
BR: { iso3: "BRA", name_it: "Brasile" },
BS: { iso3: "BHS", name_it: "Bahamas" },
BT: { iso3: "BTN", name_it: "Bhutan" },
BV: { iso3: "BVT", name_it: "Isola Bouvet" },
BW: { iso3: "BWA", name_it: "Botswana" },
BY: { iso3: "BLR", name_it: "Bielorussia" },
BZ: { iso3: "BLZ", name_it: "Belize" },
CA: { iso3: "CAN", name_it: "Canada" },
CC: { iso3: "CCK", name_it: "Isole Cocos (Keeling)" },
CD: { iso3: "COD", name_it: "Congo - Kinshasa" },
CF: { iso3: "CAF", name_it: "Repubblica Centrafricana" },
CG: { iso3: "COG", name_it: "Congo-Brazzaville" },
CH: { iso3: "CHE", name_it: "Svizzera" },
CI: { iso3: "CIV", name_it: "Costa d’Avorio" },
CK: { iso3: "COK", name_it: "Isole Cook" },
CL: { iso3: "CHL", name_it: "Cile" },
CM: { iso3: "CMR", name_it: "Camerun" },
CN: { iso3: "CHN", name_it: "Cina" },
CO: { iso3: "COL", name_it: "Colombia" },
CR: { iso3: "CRI", name_it: "Costa Rica" },
CU: { iso3: "CUB", name_it: "Cuba" },
CV: { iso3: "CPV", name_it: "Capo Verde" },
CW: { iso3: "CUW", name_it: "Curaçao" },
CX: { iso3: "CXR", name_it: "Isola Christmas" },
CY: { iso3: "CYP", name_it: "Cipro" },
CZ: { iso3: "CZE", name_it: "Cechia" },
DE: { iso3: "DEU", name_it: "Germania" },
DJ: { iso3: "DJI", name_it: "Gibuti" },
DK: { iso3: "DNK", name_it: "Danimarca" },
DM: { iso3: "DMA", name_it: "Dominica" },
DO: { iso3: "DOM", name_it: "Repubblica Dominicana" },
DZ: { iso3: "DZA", name_it: "Algeria" },
EC: { iso3: "ECU", name_it: "Ecuador" },
EE: { iso3: "EST", name_it: "Estonia" },
EG: { iso3: "EGY", name_it: "Egitto" },
EH: { iso3: "ESH", name_it: "Sahara occidentale" },
ER: { iso3: "ERI", name_it: "Eritrea" },
ES: { iso3: "ESP", name_it: "Spagna" },
ET: { iso3: "ETH", name_it: "Etiopia" },
FI: { iso3: "FIN", name_it: "Finlandia" },
FJ: { iso3: "FJI", name_it: "Figi" },
FK: { iso3: "FLK", name_it: "Isole Falkland" },
FM: { iso3: "FSM", name_it: "Micronesia" },
FO: { iso3: "FRO", name_it: "Isole Fær Øer" },
FR: { iso3: "FRA", name_it: "Francia" },
GA: { iso3: "GAB", name_it: "Gabon" },
GB: { iso3: "GBR", name_it: "Regno Unito" },
GD: { iso3: "GRD", name_it: "Grenada" },
GE: { iso3: "GEO", name_it: "Georgia" },
GF: { iso3: "GUF", name_it: "Guyana Francese" },
GG: { iso3: "GGY", name_it: "Guernsey" },
GH: { iso3: "GHA", name_it: "Ghana" },
GI: { iso3: "GIB", name_it: "Gibilterra" },
GL: { iso3: "GRL", name_it: "Groenlandia" },
GM: { iso3: "GMB", name_it: "Gambia" },
GN: { iso3: "GIN", name_it: "Guinea" },
GP: { iso3: "GLP", name_it: "Guadalupa" },
GQ: { iso3: "GNQ", name_it: "Guinea Equatoriale" },
GR: { iso3: "GRC", name_it: "Grecia" },
GS: { iso3: "SGS", name_it: "Georgia del Sud e Sandwich Australi" },
GT: { iso3: "GTM", name_it: "Guatemala" },
GU: { iso3: "GUM", name_it: "Guam" },
GW: { iso3: "GNB", name_it: "Guinea-Bissau" },
GY: { iso3: "GUY", name_it: "Guyana" },
HK: { iso3: "HKG", name_it: "RAS di Hong Kong" },
HM: { iso3: "HMD", name_it: "Isole Heard e McDonald" },
HN: { iso3: "HND", name_it: "Honduras" },
HR: { iso3: "HRV", name_it: "Croazia" },
HT: { iso3: "HTI", name_it: "Haiti" },
HU: { iso3: "HUN", name_it: "Ungheria" },
ID: { iso3: "IDN", name_it: "Indonesia" },
IE: { iso3: "IRL", name_it: "Irlanda" },
IL: { iso3: "ISR", name_it: "Israele" },
IM: { iso3: "IMN", name_it: "Isola di Man" },
IN: { iso3: "IND", name_it: "India" },
IO: { iso3: "IOT", name_it: "Territorio britannico dell’Oceano Indiano" },
IQ: { iso3: "IRQ", name_it: "Iraq" },
IR: { iso3: "IRN", name_it: "Iran" },
IS: { iso3: "ISL", name_it: "Islanda" },
IT: { iso3: "ITA", name_it: "Italia" },
JE: { iso3: "JEY", name_it: "Jersey" },
JM: { iso3: "JAM", name_it: "Giamaica" },
JO: { iso3: "JOR", name_it: "Giordania" },
JP: { iso3: "JPN", name_it: "Giappone" },
KE: { iso3: "KEN", name_it: "Kenya" },
KG: { iso3: "KGZ", name_it: "Kirghizistan" },
KH: { iso3: "KHM", name_it: "Cambogia" },
KI: { iso3: "KIR", name_it: "Kiribati" },
KM: { iso3: "COM", name_it: "Comore" },
KN: { iso3: "KNA", name_it: "Saint Kitts e Nevis" },
KP: { iso3: "PRK", name_it: "Corea del Nord" },
KR: { iso3: "KOR", name_it: "Corea del Sud" },
KW: { iso3: "KWT", name_it: "Kuwait" },
KY: { iso3: "CYM", name_it: "Isole Cayman" },
KZ: { iso3: "KAZ", name_it: "Kazakistan" },
LA: { iso3: "LAO", name_it: "Laos" },
LB: { iso3: "LBN", name_it: "Libano" },
LC: { iso3: "LCA", name_it: "Saint Lucia" },
LI: { iso3: "LIE", name_it: "Liechtenstein" },
LK: { iso3: "LKA", name_it: "Sri Lanka" },
LR: { iso3: "LBR", name_it: "Liberia" },
LS: { iso3: "LSO", name_it: "Lesotho" },
LT: { iso3: "LTU", name_it: "Lituania" },
LU: { iso3: "LUX", name_it: "Lussemburgo" },
LV: { iso3: "LVA", name_it: "Lettonia" },
LY: { iso3: "LBY", name_it: "Libia" },
MA: { iso3: "MAR", name_it: "Marocco" },
MC: { iso3: "MCO", name_it: "Monaco" },
MD: { iso3: "MDA", name_it: "Moldavia" },
ME: { iso3: "MNE", name_it: "Montenegro" },
MF: { iso3: "MAF", name_it: "Saint Martin" },
MG: { iso3: "MDG", name_it: "Madagascar" },
MH: { iso3: "MHL", name_it: "Isole Marshall" },
MK: { iso3: "MKD", name_it: "Macedonia del Nord" },
ML: { iso3: "MLI", name_it: "Mali" },
MM: { iso3: "MMR", name_it: "Myanmar (Birmania)" },
MN: { iso3: "MNG", name_it: "Mongolia" },
MO: { iso3: "MAC", name_it: "RAS di Macao" },
MP: { iso3: "MNP", name_it: "Isole Marianne settentrionali" },
MQ: { iso3: "MTQ", name_it: "Martinica" },
MR: { iso3: "MRT", name_it: "Mauritania" },
MS: { iso3: "MSR", name_it: "Montserrat" },
MT: { iso3: "MLT", name_it: "Malta" },
MU: { iso3: "MUS", name_it: "Mauritius" },
MV: { iso3: "MDV", name_it: "Maldive" },
MW: { iso3: "MWI", name_it: "Malawi" },
MX: { iso3: "MEX", name_it: "Messico" },
MY: { iso3: "MYS", name_it: "Malaysia" },
MZ: { iso3: "MOZ", name_it: "Mozambico" },
NA: { iso3: "NAM", name_it: "Namibia" },
NC: { iso3: "NCL", name_it: "Nuova Caledonia" },
NE: { iso3: "NER", name_it: "Niger" },
NF: { iso3: "NFK", name_it: "Isola Norfolk" },
NG: { iso3: "NGA", name_it: "Nigeria" },
NI: { iso3: "NIC", name_it: "Nicaragua" },
NL: { iso3: "NLD", name_it: "Paesi Bassi" },
NO: { iso3: "NOR", name_it: "Norvegia" },
NP: { iso3: "NPL", name_it: "Nepal" },
NR: { iso3: "NRU", name_it: "Nauru" },
NU: { iso3: "NIU", name_it: "Niue" },
NZ: { iso3: "NZL", name_it: "Nuova Zelanda" },
OM: { iso3: "OMN", name_it: "Oman" },
PA: { iso3: "PAN", name_it: "Panama" },
PE: { iso3: "PER", name_it: "Perù" },
PF: { iso3: "PYF", name_it: "Polinesia francese" },
PG: { iso3: "PNG", name_it: "Papua Nuova Guinea" },
PH: { iso3: "PHL", name_it: "Filippine" },
PK: { iso3: "PAK", name_it: "Pakistan" },
PL: { iso3: "POL", name_it: "Polonia" },
PM: { iso3: "SPM", name_it: "Saint-Pierre e Miquelon" },
PN: { iso3: "PCN", name_it: "Isole Pitcairn" },
PR: { iso3: "PRI", name_it: "Portorico" },
PS: { iso3: "PSE", name_it: "Territori palestinesi" },
PT: { iso3: "PRT", name_it: "Portogallo" },
PW: { iso3: "PLW", name_it: "Palau" },
PY: { iso3: "PRY", name_it: "Paraguay" },
QA: { iso3: "QAT", name_it: "Qatar" },
RE: { iso3: "REU", name_it: "Riunione" },
RO: { iso3: "ROU", name_it: "Romania" },
RS: { iso3: "SRB", name_it: "Serbia" },
RU: { iso3: "RUS", name_it: "Russia" },
RW: { iso3: "RWA", name_it: "Ruanda" },
SA: { iso3: "SAU", name_it: "Arabia Saudita" },
SB: { iso3: "SLB", name_it: "Isole Salomone" },
SC: { iso3: "SYC", name_it: "Seychelles" },
SD: { iso3: "SDN", name_it: "Sudan" },
SE: { iso3: "SWE", name_it: "Svezia" },
SG: { iso3: "SGP", name_it: "Singapore" },
SH: { iso3: "SHN", name_it: "Sant’Elena" },
SI: { iso3: "SVN", name_it: "Slovenia" },
SJ: { iso3: "SJM", name_it: "Svalbard e Jan Mayen" },
SK: { iso3: "SVK", name_it: "Slovacchia" },
SL: { iso3: "SLE", name_it: "Sierra Leone" },
SM: { iso3: "SMR", name_it: "San Marino" },
SN: { iso3: "SEN", name_it: "Senegal" },
SO: { iso3: "SOM", name_it: "Somalia" },
SR: { iso3: "SUR", name_it: "Suriname" },
SS: { iso3: "SSD", name_it: "Sud Sudan" },
ST: { iso3: "STP", name_it: "São Tomé e Príncipe" },
SV: { iso3: "SLV", name_it: "El Salvador" },
SX: { iso3: "SXM", name_it: "Sint Maarten" },
SY: { iso3: "SYR", name_it: "Siria" },
SZ: { iso3: "SWZ", name_it: "Eswatini" },
TC: { iso3: "TCA", name_it: "Isole Turks e Caicos" },
TD: { iso3: "TCD", name_it: "Ciad" },
TF: { iso3: "ATF", name_it: "Terre australi francesi" },
TG: { iso3: "TGO", name_it: "Togo" },
TH: { iso3: "THA", name_it: "Thailandia" },
TJ: { iso3: "TJK", name_it: "Tagikistan" },
TK: { iso3: "TKL", name_it: "Tokelau" },
TL: { iso3: "TLS", name_it: "Timor Est" },
TM: { iso3: "TKM", name_it: "Turkmenistan" },
TN: { iso3: "TUN", name_it: "Tunisia" },
TO: { iso3: "TON", name_it: "Tonga" },
TR: { iso3: "TUR", name_it: "Turchia" },
TT: { iso3: "TTO", name_it: "Trinidad e Tobago" },
TV: { iso3: "TUV", name_it: "Tuvalu" },
TW: { iso3: "TWN", name_it: "Taiwan" },
TZ: { iso3: "TZA", name_it: "Tanzania" },
UA: { iso3: "UKR", name_it: "Ucraina" },
UG: { iso3: "UGA", name_it: "Uganda" },
UM: { iso3: "UMI", name_it: "Isole Minori Esterne degli Stati Uniti" },
US: { iso3: "USA", name_it: "Stati Uniti" },
UY: { iso3: "URY", name_it: "Uruguay" },
UZ: { iso3: "UZB", name_it: "Uzbekistan" },
VA: { iso3: "VAT", name_it: "Città del Vaticano" },
VC: { iso3: "VCT", name_it: "Saint Vincent e Grenadine" },
VE: { iso3: "VEN", name_it: "Venezuela" },
VG: { iso3: "VGB", name_it: "Isole Vergini Britanniche" },
VI: { iso3: "VIR", name_it: "Isole Vergini Americane" },
VN: { iso3: "VNM", name_it: "Vietnam" },
VU: { iso3: "VUT", name_it: "Vanuatu" },
WF: { iso3: "WLF", name_it: "Wallis e Futuna" },
WS: { iso3: "WSM", name_it: "Samoa" },
YE: { iso3: "YEM", name_it: "Yemen" },
YT: { iso3: "MYT", name_it: "Mayotte" },
ZA: { iso3: "ZAF", name_it: "Sudafrica" },
ZM: { iso3: "ZMB", name_it: "Zambia" },
ZW: { iso3: "ZWE", name_it: "Zimbabwe" },
};

const ISO3_TO_ISO2 = Object.freeze(
  Object.fromEntries(Object.entries(COUNTRY_CODE_MAP).map(([iso2, v]) => [v.iso3, iso2]))
);

function normalizeCountryKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

const IT_NAME_TO_ISO2 = Object.freeze(
  Object.fromEntries(
    Object.entries(COUNTRY_CODE_MAP)
      .map(([iso2, v]) => [normalizeCountryKey(v && v.name_it ? v.name_it : ""), iso2])
      .filter(([k]) => Boolean(k))
  )
);

export function iso2ToFlagSvgUrl(iso2Raw) {
  const iso2 = String(iso2Raw || "").trim().toLowerCase();
  if (!iso2 || iso2.length !== 2) return "";
  return `https://flagcdn.com/${iso2}.svg`;
}

export function iso2ToFlagPngUrl(iso2Raw, size = 48) {
  const iso2 = String(iso2Raw || "").trim().toLowerCase();
  if (!iso2 || iso2.length !== 2) return "";
  const s = Number(size);
  const px = Number.isFinite(s) && s > 0 ? Math.round(s) : 48;
  return `https://flagcdn.com/w${px}/${iso2}.png`;
}

export function countryToFlagIconUrl(countryRaw, { format = "svg", size = 48 } = {}) {
  const iso2 = countryToIso2(countryRaw);
  if (!iso2) return "";
  if (String(format).toLowerCase() === "png") return iso2ToFlagPngUrl(iso2, size);
  return iso2ToFlagSvgUrl(iso2);
}
export function countryToFlag(countryRaw) {
  const iso2 = countryToIso2(countryRaw);
  if (!iso2) return "";
  if (!supportsFlagEmoji()) return iso2;
  return iso2ToFlag(iso2);
}
export function countryToIso2(countryRaw) {
  const raw = String(countryRaw || "").trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();
  if (upper.length === 2 && COUNTRY_CODE_MAP[upper]) return upper;

  if (upper.length === 3) {
    const iso2 = ISO3_TO_ISO2[upper] || "";
    if (iso2) return iso2;
  }

  const key = normalizeCountryKey(raw);
  const iso2 = IT_NAME_TO_ISO2[key] || "";
  return iso2 && COUNTRY_CODE_MAP[iso2] ? iso2 : "";
}

export function countryToIso3(countryRaw) {
  const iso2 = countryToIso2(countryRaw);
  if (!iso2) return "";
  return (COUNTRY_CODE_MAP[iso2] && COUNTRY_CODE_MAP[iso2].iso3) || "";
}

export function iso2ToFlag(iso2Raw) {
  const code = String(iso2Raw || "").trim().toUpperCase();
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  const pts = code
    .split("")
    .map((ch) => A + ch.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

let supportsFlagEmojiCache = null;
export function supportsFlagEmoji() {
  if (supportsFlagEmojiCache !== null) return supportsFlagEmojiCache;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return (supportsFlagEmojiCache = false);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "28px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("🇮🇹", 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let nonZero = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        nonZero++;
        if (nonZero > 10) break;
      }
    }
    supportsFlagEmojiCache = nonZero > 10;
    return supportsFlagEmojiCache;
  } catch (e) {
    supportsFlagEmojiCache = false;
    return false;
  }
}





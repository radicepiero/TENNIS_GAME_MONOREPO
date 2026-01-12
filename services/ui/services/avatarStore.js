const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "avatars.json");

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

function readStore() {
  ensureDataDir();
  try {
    if (!fs.existsSync(STORE_PATH)) return { users: {} };
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const json = JSON.parse(raw || "{}");
    if (!json || typeof json !== "object") return { users: {} };
    if (!json.users || typeof json.users !== "object") json.users = {};
    return json;
  } catch (e) {
    return { users: {} };
  }
}

function writeStore(store) {
  ensureDataDir();
  const safe = store && typeof store === "object" ? store : { users: {} };
  if (!safe.users || typeof safe.users !== "object") safe.users = {};
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), "utf8");
  fs.renameSync(tmp, STORE_PATH);
}

function getUserNode(store, uuid) {
  if (!store.users[uuid]) store.users[uuid] = { profile: "", predictions: {} };
  if (!store.users[uuid].predictions || typeof store.users[uuid].predictions !== "object") {
    store.users[uuid].predictions = {};
  }
  return store.users[uuid];
}

function getProfileAvatar(uuid) {
  if (!uuid) return "";
  const store = readStore();
  const node = store.users && store.users[uuid];
  return node && node.profile ? String(node.profile) : "";
}

function setProfileAvatar(uuid, imageUrl) {
  if (!uuid) return "";
  const store = readStore();
  const node = getUserNode(store, uuid);
  node.profile = imageUrl ? String(imageUrl) : "";
  writeStore(store);
  return node.profile;
}

function getPredictionAvatar(uuid, tournamentId) {
  if (!uuid || !tournamentId) return "";
  const store = readStore();
  const node = store.users && store.users[uuid];
  if (!node || !node.predictions) return "";
  const v = node.predictions[String(tournamentId)];
  return v ? String(v) : "";
}

function setPredictionAvatar(uuid, tournamentId, imageUrl) {
  if (!uuid || !tournamentId) return "";
  const store = readStore();
  const node = getUserNode(store, uuid);
  node.predictions[String(tournamentId)] = imageUrl ? String(imageUrl) : "";
  writeStore(store);
  return node.predictions[String(tournamentId)];
}

module.exports = {
  getProfileAvatar,
  setProfileAvatar,
  getPredictionAvatar,
  setPredictionAvatar,
};

function buildConnectionString() {
  const host = String(process.env.DB_CONNESSIONE || '').trim();
  const database = String(process.env.DATABASE || '').trim();
  const user = String(process.env.DB_USER || '').trim();
  const password = String(process.env.DB_PSSW || '');

  if (!host || !database || !user) {
    throw new Error(
      'Missing DB configuration for migrations. Required env vars: DB_CONNESSIONE, DATABASE, DB_USER, DB_PSSW',
    );
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  return `postgres://${u}:${p}@${host}:5432/${encodeURIComponent(database)}`;
}

module.exports = {
  buildConnectionString,
};

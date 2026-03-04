const toYmd = (v) => {
  if (!v) return v;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const toDatetimeLocal = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  // datetime-local expects local time, no timezone suffix
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalizeYmd = (v) => {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

module.exports = {
  toYmd,
  toDatetimeLocal,
  normalizeYmd,
};

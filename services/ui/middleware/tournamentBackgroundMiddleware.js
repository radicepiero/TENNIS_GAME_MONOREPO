module.exports = function tournamentBackgroundMiddleware() {
  return async (req, res, next) => {
    const DEFAULT_BG = {
      material: "hard",
      textureUrl: "/immagini/sfondi/texture-hard.webp",
      tintEnabled: false,
      tintHex: "#000000",
    };

    const normalizeMaterial = (m) => {
      const v = String(m || "").trim().toLowerCase();
      if (v === "hard" || v === "clay" || v === "grass" || v === "carpet") return v;
      return "hard";
    };

    const isHexColor = (s) => /^#[0-9a-f]{6}$/i.test(String(s || "").trim());

    const pickCurrentTournament = (tournaments) => {
      const list = Array.isArray(tournaments) ? tournaments.filter(Boolean) : [];
      const statusOf = (t) => (t && t.status ? String(t.status).trim().toLowerCase() : "");
      const bestTime = (t) => {
        const v = t && (t.dataopen || t.datainizio || t.datafine);
        const ms = v ? new Date(v).getTime() : NaN;
        return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
      };

      const pick = (st) =>
        list
          .filter((t) => statusOf(t) === st)
          .slice()
          .sort((a, b) => bestTime(b) - bestTime(a))[0] || null;

      return pick("in-progress") || pick("open") || pick("upcoming") || null;
    };

    const materialToTextureUrl = (material) => {
      const m = normalizeMaterial(material);
      return `/immagini/sfondi/texture-${m}.webp`;
    };

    const extractTournamentIdFromPath = (p) => {
      const m = String(p || "").match(/^\/tornei\/(\d+)(?:\/|$)/);
      return m ? m[1] : null;
    };

    const unwrapTournamentResponse = async (response) => {
      const json = await response.json().catch(() => null);
      if (!json) return null;
      if (json && typeof json === "object" && json.success && json.data) {
        return json.data;
      }
      return json;
    };

    try {
      const user = res.locals.user;
      if (!user) {
        res.locals.bg = { ...DEFAULT_BG };
        return next();
      }

      const apiBase = process.env.PUBLIC_API || "/api";
      const apiAbs = String(process.env.API || "");
      const apiRoot = apiAbs ? apiAbs.replace(/\/$/, "") : apiBase.replace(/\/$/, "");

      const tournamentIdFromPath = extractTournamentIdFromPath(req && req.path);
      const url = tournamentIdFromPath
        ? `${apiRoot}/tournaments/${encodeURIComponent(String(tournamentIdFromPath))}`
        : `${apiRoot}/tournaments`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          cookie: req.headers.cookie || "",
          accept: "application/json",
        },
      });
      if (!response.ok) {
        res.locals.bg = { ...DEFAULT_BG };
        return next();
      }

      let current = null;
      if (tournamentIdFromPath) {
        const maybeTournament = await unwrapTournamentResponse(response);
        current = maybeTournament && typeof maybeTournament === "object" ? maybeTournament : null;
      } else {
        const tournaments = await unwrapTournamentResponse(response);
        const list = Array.isArray(tournaments)
          ? tournaments
          : (tournaments && Array.isArray(tournaments.data) ? tournaments.data : []);
        current = pickCurrentTournament(list);
      }
      if (!current) {
        res.locals.bg = { ...DEFAULT_BG };
        return next();
      }

      const sj = current && current.surface_jsonb;
      let surfaceObj = null;
      if (sj && typeof sj === "object") {
        surfaceObj = sj;
      } else {
        surfaceObj = { material: null };
      }
      const material = normalizeMaterial(surfaceObj && surfaceObj.material);

      const tintCandidate = surfaceObj && surfaceObj.color;
      const tintEnabled = (material === "hard" || material === "carpet") && isHexColor(tintCandidate);

      res.locals.bg = {
        material,
        textureUrl: materialToTextureUrl(material),
        tintEnabled,
        tintHex: tintEnabled ? String(tintCandidate).trim() : DEFAULT_BG.tintHex,
      };
      return next();
    } catch (e) {
      res.locals.bg = { ...DEFAULT_BG };
      return next();
    }
  };
};

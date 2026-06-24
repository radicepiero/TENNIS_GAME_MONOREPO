//questo middleware deve analizzare tutte le richieste e controllare il cookie jwt
//se il cookie non esiste reindirizza il client alla home
//se il cookie esiste ma è scaduto reindirizza alla home
//se il cookie esiste valido allora restituisce quello che è stato richiesto
const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.User;

const JWT_SECRET = process.env.JWT_SECRET || "un segreto generato a caso";

const extractJwtFromRequest = (req) => {
  const cookieToken = req?.cookies?.jwt;
  if (cookieToken) return cookieToken;

  const auth = String(req.headers.authorization || "");
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m && m[1]) return m[1].trim();
  return null;
};

const isApiRequest = (req) => {
  // API service is mounted under /api, but keep this generic.
  if (req.originalUrl && String(req.originalUrl).startsWith("/api")) return true;
  const accept = String(req.headers.accept || "").toLowerCase();
  return accept.includes("application/json");
};

const rejectUnauthorized = (req, res) => {
  if (isApiRequest(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return res.redirect("/login");
};

const requireAuth = (req, res, next) => {
  const token = extractJwtFromRequest(req);

  // verifica dell'esistenza del cookie jwt e verifica della validità
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        rejectUnauthorized(req, res);
      } else {
        req.jwt = decodedToken;
        next();
      }
    });
  } else {
    rejectUnauthorized(req, res);
  }
};

// controllo dell'utente

const checkUser = async (req, res, next) => {
  const token = extractJwtFromRequest(req);

  if (!token) {
    res.locals.user = null;
    return next();
  }
  try {
    // Verifica il token in modo asincrono
    const decodedToken = await new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Recupera dati utente dal db
    const user = await User.scope("withPassword").findByPk(decodedToken.uuid);
    if (!user) {
      res.locals.user = null;
      return next();
    }
    res.locals.user = user;
    req.jwt = decodedToken;
  } catch (error) {
    res.locals.user = null;
  }
  next();
};

const requireAuthAndUser = async (req, res, next) => {
  const token = extractJwtFromRequest(req);
  if (!token) return rejectUnauthorized(req, res);

  try {
    const decodedToken = await new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    const user = await User.scope("withPassword").findByPk(decodedToken.uuid);
    if (!user) {
      res.locals.user = null;
      return rejectUnauthorized(req, res);
    }

    res.locals.user = user;
    req.jwt = decodedToken;
    return next();
  } catch (error) {
    res.locals.user = null;
    return rejectUnauthorized(req, res);
  }
};

const requireAdmin = (req, res, next) => {
  const user = res.locals.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.level === "admin" || user.level === "super") return next();
  return res.status(403).json({ error: "Forbidden" });
};

module.exports = { requireAuth, checkUser, requireAuthAndUser, requireAdmin };

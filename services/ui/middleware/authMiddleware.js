//questo middleware deve analizzare tutte le richieste e controllare il cookie jwt
//se il cookie non esiste reindirizza il client alla home
//se il cookie esiste ma è scaduto reindirizza alla home
//se il cookie esiste valido allora restituisce quello che è stato richiesto
const jwt = require("jsonwebtoken");
const avatarStore = require("../services/avatarStore");

const JWT_SECRET = process.env.JWT_SECRET || "un segreto generato a caso";

const requireAuth = (req, res, next) => {
  //console.log("sssss", req.url);
  const token = req.cookies.jwt;

  // verifica dell'esistenza del cookie jwt e verifica della validità
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect("/login");
      } else {
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

// controllo dell'utente

const checkUser = async (req, res, next) => {
  const token = req.cookies.jwt;

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

    // Recupera dati utente dall'API
    const url = `${process.env.API}/users/${decodedToken.uuid}`;
    const response = await fetch(url, {
      headers: {
        cookie: req.headers.cookie || "",
      },
    });
    if (!response.ok) {
      res.locals.user = null;
      return next();
    }
    const user = await response.json();
    //console.log("Dati utente recuperati:", user);
    try {
      const avatarUrl = avatarStore.getProfileAvatar(user && user.uuid);
      user.ui_avatar_url = avatarUrl || user.image_url || "";
    } catch (e) {
      user.ui_avatar_url = user.image_url || "";
    }
    res.locals.user = user;
  } catch (error) {
    res.locals.user = null;
  }
  next();
};

const requireAdmin = (req, res, next) => {
  const user = res.locals.user;
  if (!user) return res.redirect("/login");
  if (user.level === "admin" || user.level === "super") return next();
  return res.status(403).send("Forbidden");
};

module.exports = { requireAuth, checkUser, requireAdmin };

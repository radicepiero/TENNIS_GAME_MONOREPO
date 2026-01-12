const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { spedisciMailConferma } = require("../config/mailer");
const { handleErrors } = require("./authErrorsManagement");

const maxAge = 3 * 24 * 60 * 60;

const JWT_SECRET = process.env.JWT_SECRET || "un segreto generato a caso";

const getSignup = (req, res) => {
  res.render("signup");
};

const getSignupVerify = (req, res) => {
  res.render("home");
};

const postSignup = async (req, res) => {
  const url = `${process.env.API}/users/`;
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body), // 🔧 fix importante
  };

  try {
    const response = await fetch(url, requestOptions);
    const user = await response.json(); // serve per ottenere il body della risposta
    await spedisciMailConferma(process.env.MAILER_USER, user.uuid);
    res.status(200).json(user);
    console.log(`mail spedita a ${user.email}`);
  } catch (error) {
    const errors = handleErrors(error);
    res.status(400).json({ errors });
  }
};

const confermaSignup = async (req, res) => {
  //devo cercare nel db se esiste il token
  //devo vedere se l'utente è già attivo
  //devo modificare il campo active
  //poi devo confermare l'avvenuta registrazione (magari con una una mail dove invio anche la pssw)
  //poi c'è da gestire la durata della
  const tokenConfermaSignup = req.params.token;
  const url = `${process.env.API}/users/${tokenConfermaSignup}`;
  try {
    const user = await fetch(url);
    console.log(user);

    if (user) {
      if (!user.active) {
        const requestOptions = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        };
        await fetch(url, requestOptions);
      }
      const token = createToken(user.uuid);
      res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
      res.redirect("/");
    }
  } catch (error) {
    console.log(error);
  }
};

const getLogin = (req, res) => {
  res.render("login");
};

const postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await checkLogin(email, password);
    const token = createToken(user.uuid);
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
      sameSite: "Lax",
      secure: false, // solo per sviluppo
    });
    res.status(200).json({ user: user.uuid });
  } catch (err) {
    console.log(err);
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};
// creazione del token che verrà spedito al client per riconoscerlo nelle richieste successive
const createToken = function (uuid) {
  return jwt.sign({ uuid }, JWT_SECRET, {
    expiresIn: maxAge,
  });
};

const checkLogin = async function (email, password) {
  const url = `${process.env.API}/auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }

  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || "Errore login";
    throw Error(msg);
  }

  if (!json || !json.uuid) {
    throw Error("Errore login");
  }

  // Return minimal user object for token creation
  return { uuid: json.uuid };
};

const getLogout = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};

module.exports = {
  getSignup,
  postSignup,
  getLogin,
  postLogin,
  getLogout,
  confermaSignup,
  getSignupVerify,
};

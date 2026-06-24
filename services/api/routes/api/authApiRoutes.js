const { Router } = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const db = require("../../models");

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "un segreto generato a caso";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";

const createAccessToken = (uuid) =>
  jwt.sign({ uuid, typ: "access" }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

const createRefreshToken = (uuid) =>
  jwt.sign({ uuid, typ: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing email or password" });
    }

    const user = await db.User.scope("withPassword").findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: "incorrect email" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ success: false, message: "incorrect password" });
    }

    const access_token = createAccessToken(user.uuid);
    const refresh_token = createRefreshToken(user.uuid);

    if (String(req.query.set_cookie || "").trim() === "1") {
      res.cookie("jwt", access_token, { httpOnly: true, maxAge: 15 * 60 * 1000 });
    }

    return res.status(200).json({
      success: true,
      uuid: user.uuid,
      user: { uuid: user.uuid, email: user.email, level: user.level },
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (e) {
    console.error("Errore login API:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: "Missing refresh_token" });
    }

    const decoded = jwt.verify(refresh_token, JWT_SECRET);
    if (!decoded || decoded.typ !== "refresh" || !decoded.uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await db.User.findByPk(decoded.uuid);
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const access_token = createAccessToken(user.uuid);
    const new_refresh_token = createRefreshToken(user.uuid);

    return res.status(200).json({
      success: true,
      access_token,
      refresh_token: new_refresh_token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
});

module.exports = router;

const nodemailer = require("nodemailer");
require("dotenv/config");

const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE,
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PSSW,
  },
});

const spedisciMailConferma = (to, urlToken) => {
  // messaggio da inviare
  const mailOptions = {
    from: "radice.p@gmail.com",
    to: to,
    subject: "Test email nodejs",
    //text: 'Sgart.it' // invia il corpo in plaintext
    html: `<b>------------------ </b><a href="http://localhost:3000/confermaSignup/${urlToken}" >conferma</a>`, // invia il corpo in html
  };
  //sendmail restituisce una promise
  return transporter.sendMail(mailOptions);
};

const spedisciMailCambioPassword = (to, userEmail) => {
  const mailOptions = {
    from: "radice.p@gmail.com",
    to: to,
    subject: "Cambio password effettuato",
    html: `<b>Cambio password effettuato</b><div>Utente: ${String(userEmail || "")}</div>`,
  };
  return transporter.sendMail(mailOptions);
};

module.exports = { spedisciMailConferma, spedisciMailCambioPassword };

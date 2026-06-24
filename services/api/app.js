const express = require("express");
const http = require("http");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv/config");

//middleware
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      return callback(null, isLocalhost);
    };

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const { requireAuthAndUser } = require("./middleware/authMiddleware");
const apiRouter = require("./routes/api/apisRoutes");

const authApiRouter = require("./routes/api/authApiRoutes");

app.use("/api/auth", authApiRouter);

app.use("/api", requireAuthAndUser, apiRouter);

const PORT = process.env.PORT || 9000;
http.createServer(app).listen(PORT, "0.0.0.0", () => {
  console.log(`server API in ascolto su porta ${PORT}`);
});

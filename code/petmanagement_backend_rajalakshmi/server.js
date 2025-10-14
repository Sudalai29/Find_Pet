const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const requestIp = require("request-ip");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

// File requirements
const userRoutes = require("./app/routes/sresu.routes.js");
const useragent = require("./app/config/useragent.js");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =============================
// ✅ CORS Configuration (Top Priority)
// =============================
const allowedOrigins = [
  "http://13.203.226.60:4000", // Deployed frontend
  "http://localhost:4000",     // Local frontend
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  
  // ✅ Handle preflight OPTIONS requests quickly
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// =============================
// ✅ Helmet (Security Headers)
// =============================
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// =============================
// ✅ Core Middleware
// =============================
app.use(logger("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(mongoSanitize());
app.use(requestIp.mw());

// =============================
// ✅ Block Certain User Agents
// =============================
app.use((req, res, next) => {
  const userAgent = req.get("User-Agent");
  if (useragent.useragent.includes(userAgent)) {
    res.status(403).json({ status: false, message: "Access Denied" });
  } else {
    next();
  }
});

// =============================
// ✅ Rate Limiting
// =============================
const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 45,
  keyGenerator: (req) => req.clientIp,
});
app.use(limiter);

// =============================
// ✅ Database Connection
// =============================
const dbconfigconnection = require("./app/models/index.js");
dbconfigconnection();

// =============================
// ✅ Routes
// =============================
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "Welcome to pet missing report management backend application.",
  });
});

app.use("/uploads", express.static(path.join(__dirname, "/app/routes/uploads")));
app.use("/v1/users", userRoutes);

// =============================
// ✅ Start HTTP Server
// =============================
const server = http.createServer(app);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 HTTP Server running on port ${PORT}`);
});

module.exports = app;

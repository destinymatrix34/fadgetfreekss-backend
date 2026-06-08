import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { requireApiKey } from "./middleware/auth";
import { apiLimiter } from "./middleware/rateLimit";
import blogsRouter from "./routes/blogs";
import sitemapRouter from "./routes/sitemap";
import adminRouter from "./routes/admin";

// ─── Validate critical env vars at startup ────────────────────────────────────
if (!process.env.API_SECRET_KEY || process.env.API_SECRET_KEY === "CHANGE_ME_USE_A_STRONG_SECRET") {
  console.error(
    "\n❌  FATAL: API_SECRET_KEY is not set or is still the default placeholder.\n" +
    "    Copy backend/.env.example to backend/.env and set a strong secret.\n"
  );
  process.exit(1);
}

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gadgetfreeks";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("🌱 Connected to MongoDB successfully (gadgetfreeks)"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://gadgetfreeks.us";

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS: allow all origins for dev ─────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key", "Authorization"],
    credentials: false,
  })
);

// Request Logging Middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`  Origin: ${req.headers.origin}`);
  console.log(`  Key: ${req.headers["x-api-key"] ? "Present" : "MISSING"}`);
  next();
});

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Dynamic Public Sitemap (Unprotected) ────────────────────────────────────
app.use(sitemapRouter);

// ─── Public routes (no auth) ─────────────────────────────────────────────────
// Blog GET endpoints are public for SEO (POST/DELETE handled with x-api-key)
app.use("/api/blogs", blogsRouter);

// Admin login (public — auth is validated inside the route)
app.use("/api/admin", adminRouter);

// ─── Rate limiting on all /api/* routes ──────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Health check (no auth required) ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {

  console.log(`   CORS allowed origin: ${FRONTEND_ORIGIN}`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/blogs        — published blog posts (public)`);
  console.log(`     POST /api/blogs        — create blog post (x-api-key)`);
  console.log(`     PUT  /api/blogs/:id    — update blog post (x-api-key)`);
  console.log(`     DELETE /api/blogs/:id  — delete blog post (x-api-key)`);
  console.log(`     POST /api/admin/login  — admin login`);
  console.log(`     GET  /api/admin/verify — verify admin token`);
  console.log(`     GET  /sitemap.xml      — dynamic sitemap`);
  console.log(`     GET  /health           — health check\n`);
});

export default app;

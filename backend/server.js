import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import uploadRoutes from "./routes/upload.js";
import analyzeRoutes from "./routes/analyze.js";
import chatRoutes from "./routes/chat.js";
import logger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists at startup
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use(logger);

// ─── Routes ────────────────────────────────────────────────────
app.use("/api/upload", uploadRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/chat", chatRoutes);

// ─── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ──────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // console.log(`   Health: http://localhost:${PORT}/health\n`);
});

export default app;

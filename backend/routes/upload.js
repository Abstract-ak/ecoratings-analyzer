import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import pdfParser from "../services/pdfParser.js";
import chunker from "../services/chunker.js";
import vectorStore from "../services/vectorStore.js";

const router = express.Router();

// ─── Multer config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || "./uploads",
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only PDF and plain text files are supported"));
  },
});

/**
 * POST /api/upload
 * Accepts a PDF or text file, parses it, chunks it, and stores embeddings.
 * Returns a documentId to reference in subsequent /analyze and /chat calls.
 */
router.post("/", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const documentId = uuidv4();
    const filePath = req.file.path;

    // 1. Extract raw text from PDF / txt
    const rawText = await pdfParser.extract(filePath, req.file.mimetype);

    // 2. Split into chunks and embed
    const chunks = chunker.split(rawText);
    // console.log("chunk", chunks);
    await vectorStore.store(documentId, chunks);

    res.json({
      documentId,
      fileName: req.file.originalname,
      pageCount: chunks.length, // rough proxy for size
      characterCount: rawText.length,
      message: "Document processed successfully",
    });
  } catch (error) {
    console.error("Upload processing failed:", error);
    res.status(500).json({ error: "Failed to process document" });
  }
});

router.use((error, _req, res, _next) => {
  console.error("Upload request error:", error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }

  if (error?.message === "Only PDF and plain text files are supported") {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: "Upload failed" });
});

export default router;

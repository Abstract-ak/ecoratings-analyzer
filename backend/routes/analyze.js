import express from "express";
import agent from "../services/agent.js";

const router = express.Router();

/**
 * POST /api/analyze
 * Body: { documentId: string, framework?: "GRI" | "TCFD" | "BRSR" }
 *
 * Runs two agent tools:
 *  1. extract_metrics  → pulls key ESG numbers from the document
 *  2. check_compliance → compares against selected framework checklist
 */
router.post("/", async (req, res) => {
  const { documentId, framework = "GRI" } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: "documentId is required" });
  }

  const [metrics, gapAnalysis] = await Promise.all([
    agent.extractMetrics(documentId),
    agent.checkCompliance(documentId, framework),
  ]);

  res.json({ documentId, framework, metrics, gapAnalysis });
});

export default router;

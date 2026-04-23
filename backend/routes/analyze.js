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
 *
 *  Both are routed through agentLoop - the LLM decides the tool        sequence.
 */
router.post("/", async (req, res) => {
  try {
    const { documentId, framework = "GRI" } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: "documentId is required" });
    }

    const validFrameworks = ["GRI", "TCFD", "BRSR"];
    if (!validFrameworks.includes(framework)) {
      return res.status(400).json({
        error: `framework must be one of ${validFrameworks.join(", ")}`,
      });
    }

    const [metrics, gapAnalysis] = await Promise.all([
      agent.extractMetrics(documentId),
      agent.checkCompliance(documentId, framework),
    ]);

    res.json({ documentId, framework, metrics, gapAnalysis });
  } catch (error) {
    console.error("[analyze] Error:", error.message);

    // Distinguish document-not-found from LLM/server errors
    if (error.message?.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Analysis failed. Please try again later." });
  }
});

export default router;

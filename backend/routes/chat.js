import express from "express";
import agent from "../services/agent.js";

const router = express.Router();

/**
 * POST /api/chat
 * Body: { documentId: string, message: string, history?: Array }
 *
 * Routes the user query through the agent which decides whether to call
 * search_document, extract_metrics, or check_compliance based on intent.
 */
router.post("/", async (req, res) => {
  try {
    const { documentId, message, history = [] } = req.body;

    if (!documentId || !message) {
      return res
        .status(400)
        .json({ error: "documentId and message are required" });
    }

    const reply = await agent.chat(documentId, message, history);
    res.json({ reply });
  } catch (error) {
    console.error("[chat] Error:", error.message);
    // Distinguish document-not-found from LLM/server errors
    if (error.message?.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Chat failed. Please try again later." });
  }
});

export default router;

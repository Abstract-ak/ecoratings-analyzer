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
  const { documentId, message, history = [] } = req.body;

  if (!documentId || !message) {
    return res
      .status(400)
      .json({ error: "documentId and message are required" });
  }

  const reply = await agent.chat(documentId, message, history);
  res.json({ reply });
});

export default router;

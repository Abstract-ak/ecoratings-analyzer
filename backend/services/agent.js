/**
 * AI Agent — core orchestration layer.
 *
 * Exposes three high-level functions used by the routes:
 *   extractMetrics(documentId)            → structured ESG metrics
 *   checkCompliance(documentId, framework) → gap analysis vs framework
 *   chat(documentId, message, history)    → grounded Q&A
 *
 * Each function calls the OpenAI API with tool definitions.
 * GPT decides which tool to invoke based on the query intent.
 */

import { OpenAI } from "openai";
import vectorStore from "./vectorStore.js";
import extractMetricsTool from "../tools/extractMetrics.js";
import checkComplianceTool from "../tools/checkCompliance.js";
import searchDocumentTool from "../tools/searchDocument.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini"; // cost-effective + good reasoning, adjust as needed

// ─── Tool definitions sent to GPT ──────────────────────────
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "extract_metrics",
      description:
        "Extract key ESG/sustainability metrics from the document text.",
      parameters: {
        type: "object",
        properties: {
          context: { type: "string" },
        },
        required: ["context"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_framework_compliance",
      description: "Compare document against sustainability framework.",
      parameters: {
        type: "object",
        properties: {
          context: { type: "string" },
          framework: {
            type: "string",
            enum: ["GRI", "TCFD", "BRSR"],
          },
        },
        required: ["context", "framework"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_document",
      description: "Search relevant document chunks.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          top_k: { type: "number", default: 5 },
        },
        required: ["query"],
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────
async function executeTool(toolName, toolInput, documentId, framework) {
  switch (toolName) {
    case "extract_metrics":
      return extractMetricsTool.run(toolInput.context);

    case "check_framework_compliance":
      return checkComplianceTool.run(
        toolInput.context,
        toolInput.framework || framework,
      );

    case "search_document": {
      const results = vectorStore.search(
        documentId,
        toolInput.query,
        toolInput.top_k || 5,
      );
      return {
        results: results.map((r) => ({
          id: r.id,
          text: r.text,
          score: r.score,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ─── Agentic loop (handles multi-turn tool use) ───────────────
async function agentLoop(messages, documentId, framework = "GRI") {
  let response = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: TOOL_DEFINITIONS,
    temperature: 0,
  });

  let message = response.choices[0].message;

  // Loop while model wants to call tools
  while (message.tool_calls) {
    const toolMessages = [];

    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name;
      const toolInput = JSON.parse(toolCall.function.arguments || "{}");

      const toolResult = await executeTool(
        toolName,
        toolInput,
        documentId,
        framework,
      );

      toolMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    messages = [...messages, message, ...toolMessages];

    response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0,
    });

    message = response.choices[0].message;
  }

  return message.content || "";
}

// ─── Public functions ─────────────────────────────────────────

async function extractMetrics(documentId) {
  // Retrieve a broad context slice for metric extraction
  const context = vectorStore
    .search(documentId, "emissions energy water waste diversity", 8)
    .map((c) => c.text)
    .join("\n\n");
  return extractMetricsTool.run(context);
}

async function checkCompliance(documentId, framework = "GRI") {
  const context = vectorStore
    .search(documentId, "disclosure report framework governance", 10)
    .map((c) => c.text)
    .join("\n\n");

  return checkComplianceTool.run(context, framework);
}

async function chat(documentId, message, history = []) {
  const systemPrompt =
    "You are an ESG analyst assistant. Always use search_document before answering. Do not hallucinate.";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  return agentLoop(messages, documentId);
}

export default { extractMetrics, checkCompliance, chat };

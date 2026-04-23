/**
 * AI Agent — core orchestration layer.
 *
 * Architecture:
 *  - Three tool definitions tell the LLM WHEN and WHY to call each tool.
 *  - agentLoop() drives a multi-turn conversation until the model stops
 *    requesting tool calls and returns a final text response.
 *  - All three public functions (extractMetrics, checkCompliance, chat)
 *    go through agentLoop — the LLM always decides which tool to invoke.
 *
 * Tools:
 *  extract_metrics            — pull quantitative ESG numbers from document context
 *  check_framework_compliance — compare disclosures against GRI/TCFD/BRSR checklist
 *  search_document            — retrieve relevant chunks via TF-IDF cosine similarity
 */

import { OpenAI } from "openai";
import vectorStore from "./vectorStore.js";
import extractMetricsTool from "../tools/extractMetrics.js";
import checkComplianceTool from "../tools/checkCompliance.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

// ─── Tool definitions ──────────────────────────────────────────────────────────
// Descriptions are intentionally detailed — the LLM uses them to decide
// which tool to call. Vague descriptions lead to wrong tool selection.
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "extract_metrics",
      description:
        "Extract ALL quantitative and qualitative ESG metrics from a document context string. " +
        "Use this tool when the user wants a summary or breakdown of: " +
        "(a) environmental data — GHG emissions (Scope 1/2/3), energy consumption, renewable energy share, " +
        "water withdrawal, waste generated, waste diversion rate; " +
        "(b) social data — total employees, gender diversity percentages, lost-time injury rates, " +
        "training hours, community investment figures; " +
        "(c) governance data — board size, independent director ratio, women on board, " +
        "corruption incidents, anti-corruption policy existence. " +
        "Always call search_document first to retrieve the relevant context, then pass it here.",
      parameters: {
        type: "object",
        properties: {
          context: {
            type: "string",
            description:
              "Concatenated document excerpts containing ESG data. " +
              "Retrieve this via search_document before calling extract_metrics.",
          },
        },
        required: ["context"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_framework_compliance",
      description:
        "Evaluate the sustainability report against a specific disclosure framework checklist " +
        "(GRI, TCFD, or BRSR). For each required disclosure item, classify it as: " +
        "'present' (clearly disclosed with data), 'partial' (mentioned but incomplete or unquantified), " +
        "or 'missing' (no mention found). " +
        "Use this when the user asks about compliance gaps, missing disclosures, framework coverage, " +
        "or wants to see a checklist / dashboard of what the company has and has not reported. " +
        "Always call search_document first to retrieve broad context before running this check.",
      parameters: {
        type: "object",
        properties: {
          context: {
            type: "string",
            description:
              "Broad document excerpts covering the full report. " +
              "Retrieve via search_document using a wide query before calling this tool.",
          },
          framework: {
            type: "string",
            enum: ["GRI", "TCFD", "BRSR"],
            description:
              "The reporting framework to check against. Defaults to GRI if not specified by the user.",
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
      description:
        "Search the uploaded sustainability report for passages most relevant to a query. " +
        "Uses TF-IDF cosine similarity to retrieve the top-k most relevant text chunks. " +
        "Always call this tool FIRST before extract_metrics or check_framework_compliance — " +
        "it provides the grounded context that prevents hallucination. " +
        "Also use this directly when the user asks a specific factual question about the report " +
        "(e.g. 'What did they say about water usage?', 'Are there any net-zero commitments?').",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A focused search query. Use domain terms: e.g. 'Scope 1 GHG emissions tCO2e', " +
              "'board gender diversity independent directors', 'water withdrawal municipal groundwater'.",
          },
          top_k: {
            type: "number",
            description:
              "Number of chunks to retrieve. Use 5-8 for targeted queries, 10-12 for broad compliance scans.",
            default: 6,
          },
        },
        required: ["query"],
      },
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
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
      if (!vectorStore.hasDocument(documentId)) {
        throw new Error(`Document ${documentId} not found. Please re-upload.`);
      }
      const results = vectorStore.search(
        documentId,
        toolInput.query,
        toolInput.top_k || 6,
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

// ─── Agentic loop ──────────────────────────────────────────────────────────────
// Drives multi-turn tool use until the model returns a final text response.
// The model decides which tool to call — we never hardcode the routing.
async function agentLoop(
  messages,
  documentId,
  framework = "GRI",
  maxTurns = 8,
) {
  let turns = 0;

  let response = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: "auto",
    temperature: 0,
  });

  let message = response.choices[0].message;

  while (message.tool_calls && turns < maxTurns) {
    turns++;
    const toolMessages = [];

    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name;
      let toolInput;

      try {
        toolInput = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        toolInput = {};
      }

      let toolResult;
      try {
        toolResult = await executeTool(
          toolName,
          toolInput,
          documentId,
          framework,
        );
      } catch (err) {
        // Return error as a tool result so the model can reason about it
        toolResult = { error: err.message };
      }

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
      tool_choice: "auto",
      temperature: 0,
    });

    message = response.choices[0].message;
  }

  return message.content || "";
}

// ─── Public functions ──────────────────────────────────────────────────────────
// All three go through agentLoop — the LLM decides the tool sequence.

/**
 * Extract structured ESG metrics from an uploaded document.
 * Agent sequence: search_document → extract_metrics → return JSON.
 */
async function extractMetrics(documentId) {
  const messages = [
    {
      role: "system",
      content:
        "You are an ESG data extraction specialist. " +
        "Your job is to extract ALL quantitative ESG metrics from a sustainability report. " +
        "Step 1: call search_document with a broad query covering emissions, energy, water, waste, diversity, governance. " +
        "Step 2: call extract_metrics with the retrieved context. " +
        "Step 3: return ONLY the raw JSON from extract_metrics — no explanation, no markdown.",
    },
    {
      role: "user",
      content:
        "Extract all ESG metrics from this document. " +
        "Search for: emissions energy water waste diversity board governance training safety.",
    },
  ];

  const result = await agentLoop(messages, documentId, "GRI");

  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result };
  }
}

/**
 * Run a GRI/TCFD/BRSR compliance gap analysis on an uploaded document.
 * Agent sequence: search_document (broad) → check_framework_compliance → return array.
 */
async function checkCompliance(documentId, framework = "GRI") {
  const messages = [
    {
      role: "system",
      content:
        `You are an ESG compliance analyst checking a sustainability report against the ${framework} framework. ` +
        "Step 1: call search_document with a broad query to retrieve wide coverage of the document. " +
        `Step 2: call check_framework_compliance with framework="${framework}" and the retrieved context. ` +
        "Step 3: return ONLY the raw JSON array from the compliance check — no explanation, no markdown.",
    },
    {
      role: "user",
      content:
        `Run a full ${framework} compliance gap analysis on this document. ` +
        "Check all disclosure categories: general, economic, environmental, social, governance.",
    },
  ];

  const result = await agentLoop(messages, documentId, framework);

  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return { raw: result };
  }
}

/**
 * Answer a user question grounded in the uploaded document.
 * Agent will: search_document → answer (optionally with extract_metrics or check_framework_compliance).
 * Conversation history is maintained for multi-turn context.
 */
async function chat(documentId, message, history = []) {
  const systemPrompt =
    "You are an ESG analyst assistant helping users understand a sustainability report. " +
    "Rules you must follow: " +
    "1. ALWAYS call search_document before answering any factual question — never rely on memory. " +
    "2. If the user asks for metrics or numbers, call extract_metrics after searching. " +
    "3. If the user asks about compliance, gaps, or missing disclosures, call check_framework_compliance. " +
    "4. Never fabricate statistics, targets, or commitments not found in the document. " +
    "5. If information is not in the document, say so clearly rather than guessing. " +
    "6. Keep answers concise and cite which section of the report the information comes from.";

  const messages = [
    { role: "system", content: systemPrompt },
    // Replay full conversation history for multi-turn context
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  return agentLoop(messages, documentId);
}

export default { extractMetrics, checkCompliance, chat };

import vectorStore from "../services/vectorStore.js";

/**
 * Semantic search over a document's chunks.
 * Used by the agent to retrieve grounding context before answering.
 *
 * @param {string} documentId
 * @param {string} query
 * @param {number} topK
 * @returns {{ results: Array<{ id, text, score }> }}
 */
function run(documentId, query, topK = 5) {
  if (!vectorStore.hasDocument(documentId)) {
    throw new Error(
      `Document ${documentId} not found. Please upload it first.`,
    );
  }
  const results = vectorStore.search(documentId, query, topK);
  return { results };
}

export default { run };

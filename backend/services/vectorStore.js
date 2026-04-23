/**
 * In-memory vector store.
 *
 * Uses TF-IDF term weighting + cosine similarity for retrieval.
 * No external DB required — fits the assignment's "simple in-memory" requirement.
 * To upgrade: replace storeDocument/search with Pinecone/Chroma client calls —
 * the exported interface (store, search, hasDocument, getFullText) stays identical.
 *
 * Store shape: Map<documentId, { chunks: VectorChunk[], idf: Record<string,number> }>
 */

// ─── Stop words ────────────────────────────────────────────────────────────────
// Filtered before indexing and querying — reduces noise in TF-IDF vectors.
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "as",
  "by",
  "from",
  "is",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "be",
  "are",
  "was",
  "were",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "not",
  "no",
  "nor",
  "so",
  "yet",
  "both",
  "either",
  "neither",
  "each",
  "every",
  "all",
  "any",
  "few",
  "more",
  "most",
  "other",
  "such",
  "than",
  "too",
  "very",
  "just",
  "also",
  "well",
  "into",
  "over",
  "after",
  "before",
  "between",
  "through",
  "during",
  "per",
  "about",
  "up",
  "out",
  "if",
  "then",
  "than",
  "when",
  "where",
  "who",
  "which",
  "how",
  "what",
  "there",
]);

const store = new Map();

// ─── TF-IDF helpers ────────────────────────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) tf[token] = (tf[token] || 0) + 1;
  const total = tokens.length || 1;
  for (const token in tf) tf[token] /= total;
  return tf;
}

function buildIdf(chunks) {
  const N = chunks.length;
  const df = {};
  for (const chunk of chunks) {
    const unique = new Set(tokenize(chunk.text));
    for (const term of unique) df[term] = (df[term] || 0) + 1;
  }
  const idf = {};
  for (const term in df) idf[term] = Math.log((N + 1) / (df[term] + 1)) + 1; // smoothed IDF
  return idf;
}

function tfidfVector(tokens, idf) {
  const tf = termFrequency(tokens);
  const vec = {};
  for (const term in tf) {
    if (idf[term]) vec[term] = tf[term] * idf[term];
  }
  return vec;
}

function cosineSimilarity(a, b) {
  const terms = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0,
    magA = 0,
    magB = 0;
  for (const t of terms) {
    const va = a[t] || 0;
    const vb = b[t] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Store and index chunks for a document.
 * @param {string} documentId
 * @param {Array<{ id: number, text: string, start: number }>} chunks
 */
async function storeDocument(documentId, chunks) {
  const idf = buildIdf(chunks);
  const vectors = chunks.map((chunk) => ({
    ...chunk,
    vector: tfidfVector(tokenize(chunk.text), idf),
  }));
  store.set(documentId, { chunks: vectors, idf });
}

/**
 * Retrieve top-k chunks most relevant to a query.
 * @param {string} documentId
 * @param {string} query
 * @param {number} topK
 * @returns {Array<{ id: number, text: string, start: number, score: number }>}
 */
function search(documentId, query, topK = 6) {
  const doc = store.get(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found in store`);

  const { chunks, idf } = doc;
  const queryVec = tfidfVector(tokenize(query), idf);

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVec, chunk.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ id, text, start, score }) => ({ id, text, start, score }));
}

/**
 * Concatenate all chunks into a single string (for full-document prompts).
 * @param {string} documentId
 * @returns {string}
 */
function getFullText(documentId) {
  const doc = store.get(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found in store`);
  return doc.chunks.map((c) => c.text).join(" ");
}

/** @param {string} documentId @returns {boolean} */
function hasDocument(documentId) {
  return store.has(documentId);
}

export default { store: storeDocument, search, getFullText, hasDocument };

/**
 * In-memory vector store.
 *
 * Uses TF-IDF term weighting + cosine similarity for retrieval.
 * No external DB required — fits the assignment's "simple in-memory" requirement.
 * Replace this module with Pinecone / Chroma / Qdrant for production.
 *
 * Store shape:  Map<documentId, { chunks, tfidf }>
 */

const store = new Map();

// ─── TF-IDF helpers ───────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) tf[token] = (tf[token] || 0) + 1;
  const total = tokens.length;
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
  for (const term in df) idf[term] = Math.log(N / df[term]);
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
    const va = a[t] || 0,
      vb = b[t] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Store chunks for a document after ingestion.
 * @param {string} documentId
 * @param {Array<{ id, text, start }>} chunks
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
 * Retrieve top-k most relevant chunks for a query.
 * @param {string} documentId
 * @param {string} query
 * @param {number} topK
 * @returns {Array<{ id, text, start, score }>}
 */
function search(documentId, query, topK = 5) {
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
 * Get the full raw text of a document (for prompts that need it all).
 * @param {string} documentId
 * @returns {string}
 */
function getFullText(documentId) {
  const doc = store.get(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found in store`);
  return doc.chunks.map((c) => c.text).join(" ");
}

function hasDocument(documentId) {
  return store.has(documentId);
}

// export { storeDocument as store, search, getFullText, hasDocument };
export default { store: storeDocument, search, getFullText, hasDocument };

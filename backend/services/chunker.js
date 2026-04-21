/**
 * Splits raw document text into overlapping chunks for retrieval.
 *
 * Strategy:
 *  - Target ~500 tokens per chunk  (~2000 characters at ~4 chars/token)
 *  - 10% overlap between chunks to avoid cutting context at boundaries
 *  - Each chunk stores its index and a character offset for traceability
 */
const CHUNK_SIZE = 2000; // characters
const OVERLAP = 200; // characters of overlap between chunks

/**
 * @param {string} text - Raw document text.
 * @returns {Array<{ id: number, text: string, start: number }>}
 */
function split(text) {
  const chunks = [];
  let start = 0;
  let id = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push({
      id,
      text: text.slice(start, end),
      start,
    });
    start += CHUNK_SIZE - OVERLAP;
    id++;
  }

  return chunks;
}

export { split, CHUNK_SIZE, OVERLAP };
export default { split, CHUNK_SIZE, OVERLAP };

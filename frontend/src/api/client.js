import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  timeout: 120_000, // 2 min — LLM calls can be slow
});

// ─── Upload ──────────────────────────────────────────────────
export async function uploadDocument(file, onProgress) {
  const form = new FormData();
  form.append("document", file);

  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  // console.log("upload-document: ", data);
  return data; // { documentId, fileName, characterCount }
}

// ─── Analyze ─────────────────────────────────────────────────
export async function analyzeDocument(documentId, framework = "GRI") {
  const { data } = await api.post("/analyze", { documentId, framework });
  return data; // { metrics, gapAnalysis }
}

// ─── Chat ────────────────────────────────────────────────────
export async function sendChatMessage(documentId, message, history = []) {
  const { data } = await api.post("/chat", { documentId, message, history });
  return data.reply;
}

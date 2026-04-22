import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, analyzeDocument } from "../api/client.js";

const steps = [
  "Uploading document…",
  "Parsing & chunking text…",
  "Extracting ESG metrics…",
  "Running gap analysis…",
];

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef();
  const navigate = useNavigate();

  function handleFile(f) {
    if (!f) return;
    const valid = ["application/pdf", "text/plain"];
    if (!valid.includes(f.type)) {
      setError("Please upload a PDF or plain text file.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setStepIndex(0);
      const { documentId } = await uploadDocument(file);

      setStepIndex(1);
      await new Promise((r) => setTimeout(r, 400)); // brief pause for UX

      setStepIndex(2);
      const analysis = await analyzeDocument(documentId, "GRI");

      setStepIndex(3);
      // Persist analysis so Dashboard can read it without a second API call
      sessionStorage.setItem(
        `analysis_${documentId}`,
        JSON.stringify(analysis),
      );

      navigate(`/dashboard/${documentId}`);
    } catch (err) {
      setError(
        err?.response?.data?.error || "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "3rem auto" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 8 }}>
        ESG Report Analyzer
      </h1>
      <p style={{ color: "#4b5563", marginBottom: "2rem" }}>
        Upload a company sustainability report. Our AI agent extracts metrics
        and checks GRI framework compliance in seconds.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "#22c55e" : file ? "#16a34a" : "#d1d5db"}`,
          borderRadius: 14,
          background: dragging ? "#f0fdf4" : file ? "#f0fdf4" : "#fff",
          padding: "3rem 2rem",
          textAlign: "center",
          cursor: "pointer",
          transition: "all .2s",
          marginBottom: "1.5rem",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>
          {file ? "✅" : "📄"}
        </div>
        {file ? (
          <>
            <p style={{ fontWeight: 600, color: "#15803d" }}>{file.name}</p>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB — click to change
            </p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 600, color: "#374151" }}>
              Drag & drop your report here
            </p>
            <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: 4 }}>
              PDF or plain text · Max 20 MB
            </p>
          </>
        )}
      </div>

      {/* Loading stepper */}
      {loading && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: i < steps.length - 1 ? 10 : 0,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  background:
                    i < stepIndex
                      ? "#22c55e"
                      : i === stepIndex
                        ? "#16a34a"
                        : "#e5e7eb",
                  color: i <= stepIndex ? "#fff" : "#9ca3af",
                }}
              >
                {i < stepIndex ? "✓" : i + 1}
              </span>
              <span
                style={{
                  fontSize: "0.9rem",
                  color:
                    i === stepIndex
                      ? "#15803d"
                      : i < stepIndex
                        ? "#6b7280"
                        : "#9ca3af",
                  fontWeight: i === stepIndex ? 600 : 400,
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{
          width: "100%",
          padding: "0.85rem",
          borderRadius: 10,
          background: !file || loading ? "#d1d5db" : "#16a34a",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          transition: "background .2s",
          cursor: !file || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? steps[stepIndex] : "Analyze Report"}
      </button>

      {/* Sample data note */}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#9ca3af",
          marginTop: "1rem",
        }}
      >
        No report? Use the{" "}
        <a href="/sample-esg-report.txt" download style={{ color: "#16a34a" }}>
          sample ESG report
        </a>{" "}
        included in the repo.
      </p>
    </div>
  );
}

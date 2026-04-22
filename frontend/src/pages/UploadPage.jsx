import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, analyzeDocument } from "../api/client.js";
import "./UploadPage.css";

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
    <div className="upload-page">
      <h1 className="upload-page__title">ESG Report Analyzer</h1>
      <p className="upload-page__subtitle">
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
        className={`dropzone${dragging ? " is-dragging" : ""}${
          file ? " has-file" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div className="dropzone__icon">{file ? "✅" : "📄"}</div>
        {file ? (
          <>
            <p className="dropzone__filename">{file.name}</p>
            <p className="dropzone__meta">
              {(file.size / 1024).toFixed(1)} KB — click to change
            </p>
          </>
        ) : (
          <>
            <p className="dropzone__hint">Drag & drop your report here</p>
            <p className="dropzone__subhint">PDF or plain text · Max 20 MB</p>
          </>
        )}
      </div>

      {/* Loading stepper */}
      {loading && (
        <div className="stepper">
          {steps.map((s, i) => {
            const isComplete = i < stepIndex;
            const isActive = i === stepIndex;
            const badgeClass = `stepper__badge${
              isComplete ? " is-complete" : ""
            }${isActive ? " is-active" : ""}`;
            const labelClass = `stepper__label${
              isComplete ? " is-complete" : ""
            }${isActive ? " is-active" : ""}`;

            return (
              <div key={s} className="stepper__item">
                <span className={badgeClass}>{isComplete ? "✓" : i + 1}</span>
                <span className={labelClass}>{s}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="submit-button"
      >
        {loading ? steps[stepIndex] : "Analyze Report"}
      </button>

      {/* Sample data note */}
      <p className="sample-note">
        No report? Use the{" "}
        <a href="/sample-esg-report.txt" download>
          sample ESG report
        </a>{" "}
        included in the repo.
      </p>
    </div>
  );
}

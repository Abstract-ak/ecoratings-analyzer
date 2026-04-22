import { useState } from "react";
import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "./GapAnalysisPage.css";

const STATUS_CONFIG = {
  present: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    label: "Present",
  },
  partial: {
    color: "#b45309",
    bg: "#fef9c3",
    border: "#fde68a",
    label: "Partial",
  },
  missing: {
    color: "#b91c1c",
    bg: "#fee2e2",
    border: "#fecaca",
    label: "Missing",
  },
};

export default function GapAnalysisPage() {
  const { documentId } = useParams();
  const [filter, setFilter] = useState("all");

  const storedAnalysis = useMemo(() => {
    const stored = sessionStorage.getItem(`analysis_${documentId}`);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, [documentId]);

  if (!storedAnalysis) {
    return <Navigate to="/" replace />;
  }

  // Guard: handle raw/error responses
  const items = Array.isArray(storedAnalysis.gapAnalysis)
    ? storedAnalysis.gapAnalysis
    : [];

  const counts = {
    present: items.filter((i) => i.status === "present").length,
    partial: items.filter((i) => i.status === "partial").length,
    missing: items.filter((i) => i.status === "missing").length,
  };
  const total = items.length || 1;
  const score = Math.round(
    ((counts.present + counts.partial * 0.5) / total) * 100,
  );

  // Group by category
  const categories = [...new Set(items.map((i) => i.category))];
  const radarData = categories.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const catScore = Math.round(
      ((catItems.filter((i) => i.status === "present").length +
        catItems.filter((i) => i.status === "partial").length * 0.5) /
        (catItems.length || 1)) *
        100,
    );
    return { category: cat, score: catScore };
  });

  const filtered =
    filter === "all" ? items : items.filter((i) => i.status === filter);
  const grouped = categories.reduce((acc, cat) => {
    const catFiltered = filtered.filter((i) => i.category === cat);
    if (catFiltered.length) acc[cat] = catFiltered;
    return acc;
  }, {});

  return (
    <div className="gap-page">
      {/* Header */}
      <div className="gap-header">
        <div>
          <h1 className="gap-title">GRI Gap Analysis</h1>
          <p className="gap-subtitle">
            Framework compliance report · {total} disclosures checked
          </p>
        </div>
        <Link to={`/dashboard/${documentId}`} className="gap-back-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <SummaryCard
          label="Overall Score"
          value={`${score}%`}
          color="#16a34a"
        />
        <SummaryCard label="Present" value={counts.present} color="#16a34a" />
        <SummaryCard label="Partial" value={counts.partial} color="#b45309" />
        <SummaryCard label="Missing" value={counts.missing} color="#b91c1c" />
      </div>

      {/* Overall progress bar */}
      <div className="progress-card">
        <div className="progress-header">
          <span>GRI Compliance Coverage</span>
          <span>{score}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-bar">
            <div
              className="progress-segment is-present"
              style={{ width: `${(counts.present / total) * 100}%` }}
            />
            <div
              className="progress-segment is-partial"
              style={{ width: `${(counts.partial / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="progress-legend">
          <span className="progress-legend-item">
            <Dot color="#22c55e" /> Present
          </span>
          <span className="progress-legend-item">
            <Dot color="#f59e0b" /> Partial
          </span>
          <span className="progress-legend-item">
            <Dot color="#e5e7eb" /> Missing
          </span>
        </div>
      </div>

      {/* Radar chart */}
      {radarData.length > 2 && (
        <div className="radar-card">
          <h2 className="radar-title">Coverage by Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <Radar
                dataKey="score"
                stroke="#16a34a"
                fill="#22c55e"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter pills */}
      <div className="filter-pills">
        {["all", "present", "partial", "missing"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-pill${filter === f ? " is-active" : ""}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && ` (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Checklist grouped by category */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="category-group">
          <h3 className="category-title">{cat}</h3>
          <div className="gap-item-list">
            {catItems.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.missing;
              return (
                <div
                  key={item.id}
                  className="gap-item"
                  style={{
                    "--item-bg": cfg.bg,
                    "--item-border": cfg.border,
                    "--status-bg": cfg.color,
                  }}
                >
                  <StatusBadge status={item.status} />
                  <div className="gap-item-body">
                    <div className="gap-item-header">
                      <span className="gap-item-title">{item.title}</span>
                      <span className="gap-item-id">{item.id}</span>
                    </div>
                    {item.evidence && (
                      <p className="gap-item-evidence">{item.evidence}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="summary-card" style={{ "--summary-color": color }}>
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const symbols = { present: "✓", partial: "~", missing: "✗" };
  return <div className="status-badge">{symbols[status] || "?"}</div>;
}

function Dot({ color }) {
  return <span className="progress-dot" style={{ "--dot-color": color }} />;
}

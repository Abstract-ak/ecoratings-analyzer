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
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            GRI Gap Analysis
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Framework compliance report · {total} disclosures checked
          </p>
        </div>
        <Link
          to={`/dashboard/${documentId}`}
          style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.9rem" }}
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
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
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 4px rgba(0,0,0,.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span>GRI Compliance Coverage</span>
          <span>{score}%</span>
        </div>
        <div
          style={{
            background: "#e5e7eb",
            borderRadius: 99,
            height: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", height: "100%" }}>
            <div
              style={{
                width: `${(counts.present / total) * 100}%`,
                background: "#22c55e",
                transition: "width .6s",
              }}
            />
            <div
              style={{
                width: `${(counts.partial / total) * 100}%`,
                background: "#f59e0b",
                transition: "width .6s",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            fontSize: "0.78rem",
            color: "#6b7280",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Dot color="#22c55e" /> Present
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Dot color="#f59e0b" /> Partial
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Dot color="#e5e7eb" /> Missing
          </span>
        </div>
      </div>

      {/* Radar chart */}
      {radarData.length > 2 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,.07)",
          }}
        >
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              color: "#374151",
            }}
          >
            Coverage by Category
          </h2>
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
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
        {["all", "present", "partial", "missing"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 99,
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              background: filter === f ? "#16a34a" : "#e5e7eb",
              color: filter === f ? "#fff" : "#374151",
              cursor: "pointer",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && ` (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Checklist grouped by category */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#6b7280",
              marginBottom: "0.6rem",
            }}
          >
            {cat}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {catItems.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.missing;
              return (
                <div
                  key={item.id}
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 10,
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <StatusBadge status={item.status} cfg={cfg} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "#111827",
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.id}
                      </span>
                    </div>
                    {item.evidence && (
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: "#4b5563",
                          marginTop: 3,
                        }}
                      >
                        {item.evidence}
                      </p>
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
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "1rem",
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,.07)",
      }}
    >
      <div style={{ fontSize: "1.7rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status, cfg }) {
  const symbols = { present: "✓", partial: "~", missing: "✗" };
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: cfg.color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "0.85rem",
        flexShrink: 0,
      }}
    >
      {symbols[status] || "?"}
    </div>
  );
}

function Dot({ color }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
      }}
    />
  );
}

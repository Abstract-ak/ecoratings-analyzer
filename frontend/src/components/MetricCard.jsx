export default function MetricCard({ label, metric, highlight }) {
  const hasValue = metric?.value !== null && metric?.value !== undefined;

  return (
    <div
      style={{
        background: "#fff",
        border:
          highlight && hasValue ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,.06)",
      }}
    >
      <p
        style={{
          fontSize: "0.78rem",
          color: "#6b7280",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {hasValue ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: highlight ? "#15803d" : "#111827",
            }}
          >
            {typeof metric.value === "number"
              ? metric.value.toLocaleString()
              : metric.value}
          </span>
          {metric.unit && (
            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
              {metric.unit}
            </span>
          )}
        </div>
      ) : (
        <span
          style={{ fontSize: "1rem", color: "#d1d5db", fontStyle: "italic" }}
        >
          Not reported
        </span>
      )}
    </div>
  );
}

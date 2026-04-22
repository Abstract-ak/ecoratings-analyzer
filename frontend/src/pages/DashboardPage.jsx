import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { sendChatMessage } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";
import ChatInterface from "../components/ChatInterface.jsx";

export default function DashboardPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(`analysis_${documentId}`);
    if (!stored) {
      setError("Session expired or document not found. Please re-upload.");
      return;
    }
    setAnalysis(JSON.parse(stored));
  }, [documentId]);

  if (error) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "#16a34a",
            color: "#fff",
            padding: "0.6rem 1.4rem",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!analysis) return <Spinner />;

  const { metrics } = analysis;
  const env = metrics?.environmental || {};
  const soc = metrics?.social || {};
  const gov = metrics?.governance || {};

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>ESG Dashboard</h1>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            {metrics?.companyName || "Company"} ·{" "}
            {metrics?.reportingYear || "—"} ·{" "}
            <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
              {documentId.slice(0, 8)}…
            </span>
          </p>
        </div>
        <Link
          to={`/gap-analysis/${documentId}`}
          style={{
            background: "#16a34a",
            color: "#fff",
            padding: "0.6rem 1.2rem",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          View Gap Analysis →
        </Link>
      </div>

      {/* Environmental metrics */}
      <Section title="Environmental" color="#16a34a">
        <MetricCard label="Scope 1 Emissions" metric={env.scope1Emissions} />
        <MetricCard label="Scope 2 Emissions" metric={env.scope2Emissions} />
        <MetricCard label="Scope 3 Emissions" metric={env.scope3Emissions} />
        <MetricCard
          label="Energy Consumption"
          metric={env.totalEnergyConsumption}
        />
        <MetricCard
          label="Renewable Energy"
          metric={env.renewableEnergyPercent}
          highlight
        />
        <MetricCard label="Water Withdrawal" metric={env.waterWithdrawal} />
        <MetricCard label="Waste Generated" metric={env.wasteGenerated} />
        <MetricCard
          label="Waste Diversion Rate"
          metric={env.wasteDiversionRate}
          highlight
        />
      </Section>

      {/* Social metrics */}
      <Section title="Social" color="#2563eb">
        <MetricCard label="Total Employees" metric={soc.totalEmployees} />
        <MetricCard
          label="Women in Workforce"
          metric={soc.womenPercent}
          highlight
        />
        <MetricCard
          label="Lost Time Injury Rate"
          metric={soc.lostTimeInjuryRate}
        />
        <MetricCard
          label="Training Hours/Employee"
          metric={soc.trainingHoursPerEmployee}
        />
        <MetricCard
          label="Community Investment"
          metric={soc.communityInvestment}
        />
      </Section>

      {/* Governance metrics */}
      <Section title="Governance" color="#7c3aed">
        <MetricCard label="Board Size" metric={gov.boardSize} />
        <MetricCard
          label="Independent Directors"
          metric={gov.independentDirectorsPercent}
          highlight
        />
        <MetricCard
          label="Women on Board"
          metric={gov.womenOnBoardPercent}
          highlight
        />
        <MetricCard
          label="Corruption Incidents"
          metric={gov.corruptionIncidents}
        />
        <MetricCard
          label="Anti-Corruption Policy"
          metric={{
            value:
              gov.antiCorruptionPolicyExists === true
                ? "Yes"
                : gov.antiCorruptionPolicyExists === false
                  ? "No"
                  : null,
            unit: null,
          }}
        />
      </Section>

      {/* Chat */}
      <div style={{ marginTop: "2rem" }}>
        <h2
          style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}
        >
          Ask the Document
        </h2>
        <ChatInterface documentId={documentId} sendMessage={sendChatMessage} />
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.75rem",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", marginTop: "5rem", color: "#6b7280" }}>
      <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
      Loading analysis…
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { sendChatMessage } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";
import ChatInterface from "../components/ChatInterface.jsx";
import "./DashboardPage.css";

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
      <div className="dashboard-error">
        <p className="dashboard-error-text">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="dashboard-error-button"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!analysis) return <Spinner />;
  // console.log("analysis-value", analysis);

  const { metrics } = analysis;
  const env = metrics?.environmental || {};
  const soc = metrics?.social || {};
  const gov = metrics?.governance || {};

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">ESG Dashboard</h1>
          <p className="dashboard-meta">
            {metrics?.companyName || "Company"} ·{" "}
            {metrics?.reportingYear || "—"} ·{" "}
            <span className="dashboard-doc-id">{documentId.slice(0, 8)}…</span>
          </p>
        </div>
        <Link to={`/gap-analysis/${documentId}`} className="dashboard-action">
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
      <div className="chat-section">
        <h2 className="chat-title">Ask the Document</h2>
        <ChatInterface documentId={documentId} sendMessage={sendChatMessage} />
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div className="section">
      <h2 className="section-title" style={{ "--section-color": color }}>
        {title}
      </h2>
      <div className="section-grid">{children}</div>
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

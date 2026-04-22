import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

import UploadPage from "./pages/UploadPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import GapAnalysisPage from "./pages/GapAnalysisPage.jsx";

export default function App() {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Navbar />
      <main
        style={{
          flex: 1,
          padding: "2rem 1rem",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/dashboard/:documentId" element={<DashboardPage />} />
          <Route
            path="/gap-analysis/:documentId"
            element={<GapAnalysisPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

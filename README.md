# EcoRatings — ESG Report Analyzer

An AI-powered web application that parses company sustainability reports, extracts key ESG metrics, and performs automated gap analysis against the GRI framework.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│   React + Vite   →   3 pages: Upload / Dashboard / Gap  │
└───────────────────────────┬─────────────────────────────┘
                            │ REST (axios)
┌───────────────────────────▼────────────────────────────────────┐
│                      BACKEND                                   │
│   Express.js                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ POST /api/upload │  │POST /api/analyze │  │ POST /api/chat│ │
│  └─────────┬────────┘  └─────────┬────────┘  └──────┬────────┘ │
│            │                     │                  │          │
│   ┌────────▼─────────────────────▼──────────────────▼───────┐  │
│   │                 AI Agent (agent.js)                     │  │
│   │   Tool router → decides which tool to call              │  │
│   │                                                         │  │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │  │
│   │  │extract_metric│ │check_complian│ │search_documen│     │  │
│   │  │s             │ │ce            │ │t             │     │  │
│   │  └──────────────┘ └──────────────┘ └──────────────┘     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                │
│   ┌─────────────────┐    ┌──────────────────────────┐          │
│   │  pdfParser.js   │    │     vectorStore.js       │          │
│   │  (pdf-parse)    │    │  TF-IDF + cosine sim     │          │
│   └─────────────────┘    │  (in-memory, no ext DB)  │          │
│                          └──────────────────────────┘          │
└────────────────────────────────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   OpenAI API    │
                   │   gpt-4o-mini   │
                   └─────────────────┘
```

---

## Tech Stack

| Layer            | Technology                           | Reason                                                |
| ---------------- | ------------------------------------ | ----------------------------------------------------- |
| Frontend         | React 18 + Vite                      | Fast DX, HMR, lightweight                             |
| Routing          | React Router v6                      | SPA navigation                                        |
| Charts           | Recharts                             | Radar + progress charts for gap analysis              |
| Backend          | Node.js + Express                    | Same JS stack, great PDF ecosystem                    |
| LLM              | OpenAI gpt-4o-mini                   | Tool use / function calling, strong structured output |
| PDF parsing      | pdf-parse                            | Simple, reliable, no native deps                      |
| RAG              | TF-IDF cosine similarity (in-memory) | Meets brief, zero infra, easy to swap                 |
| Containerisation | Docker + Docker Compose              | One-command local run                                 |

---

## LLM & Retrieval Decisions

**Why OpenAI?**
OpenAI's tool calling is reliable and straightforward for routing between `extract_metrics`, `check_framework_compliance`, and `search_document`, which keeps the agent orchestration simple.

**Model:** `gpt-4o-mini` — cost-effective with strong reasoning and dependable JSON output for structured extraction.

**Why TF-IDF over embeddings?**
The assignment explicitly says "even a simple in-memory approach counts." TF-IDF with cosine similarity:

- Requires zero API calls for embedding
- Is fully deterministic (no rate limits, no cost)
- Works well for keyword-heavy ESG reports where exact terms matter

For production, swap `vectorStore.js` with a Pinecone / Chroma client — the interface (`store`, `search`, `hasDocument`) stays identical.

---

## Running Locally

### Prerequisites

- Node.js 18+
- An OpenAI API key → [platform.openai.com](https://platform.openai.com)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/ecoratings-analyzer.git
cd ecoratings-analyzer

# Backend
cd backend
cp .env.example .env
# Open .env and add your OPENAI_API_KEY
npm install

# Frontend (new terminal)
cd ../frontend
npm install

# Optional: when running locally without Docker, set the API base
# in frontend/.env so the frontend calls the backend directly.
# VITE_API_BASE=http://localhost:3001/api
```

### 2. Start development servers

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Tests

No automated tests are configured yet.

---

## Running with Docker (one command)

```bash
# From project root
cp backend/.env.example backend/.env
# Edit backend/.env and add OPENAI_API_KEY

docker compose up --build
```

- Frontend → [http://localhost:5173](http://localhost:5173)
- Backend → [http://localhost:3001](http://localhost:3001)
- Health → [http://localhost:3001/health](http://localhost:3001/health)

---

## API Reference

### `POST /api/upload`

Upload a PDF or plain-text sustainability report.

**Request:** `multipart/form-data` with field `document`

**Response:**

```json
{
  "documentId": "uuid",
  "fileName": "report.pdf",
  "characterCount": 45230,
  "message": "Document processed successfully"
}
```

---

### `POST /api/analyze`

Run metric extraction + GRI gap analysis on an uploaded document.

**Request:**

```json
{ "documentId": "uuid", "framework": "GRI" }
```

**Response:**

```json
{
  "documentId": "uuid",
  "framework": "GRI",
  "metrics": {
    "environmental": { "scope1Emissions": { "value": 12450, "unit": "tCO2e" }, "..." },
    "social": { "totalEmployees": { "value": 8214, "unit": "persons" }, "..." },
    "governance": { "boardSize": { "value": 11, "unit": "members" }, "..." },
    "companyName": "EcoTest Corporation",
    "reportingYear": "2024"
  },
  "gapAnalysis": [
    { "id": "GRI-305-1", "title": "Scope 1 GHG emissions", "status": "present", "evidence": "Scope 1: 12,450 tCO2e reported", "category": "Environmental" },
    { "id": "GRI-405-2", "title": "Ratio of basic salary women to men", "status": "partial", "evidence": "Ratio mentioned but limited breakdown", "category": "Social" }
  ]
}
```

---

### `POST /api/chat`

Ask a question about the uploaded document (RAG-grounded).

**Request:**

```json
{
  "documentId": "uuid",
  "message": "What are the Scope 3 emissions?",
  "history": []
}
```

**Response:**

```json
{
  "reply": "According to the report, Scope 3 emissions were estimated at 67,800 tCO2e..."
}
```

---

## Project Structure

```
ecoratings-analyzer/
├── README.md
├── docker-compose.yml
│
├── backend/
│   ├── server.js               # Express entry point
│   ├── Dockerfile
│   ├── .env.example
│   ├── routes/
│   │   ├── upload.js           # POST /api/upload
│   │   ├── analyze.js          # POST /api/analyze
│   │   └── chat.js             # POST /api/chat
│   ├── services/
│   │   ├── agent.js            # Agentic loop + tool orchestration
│   │   ├── pdfParser.js        # PDF/text extraction
│   │   ├── chunker.js          # Text splitting with overlap
│   │   └── vectorStore.js      # TF-IDF in-memory RAG
│   ├── tools/
│   │   ├── extractMetrics.js   # ESG metric extraction tool
│   │   ├── checkCompliance.js  # GRI gap analysis tool
│   │   └── searchDocument.js   # Document search tool
│   ├── data/
│   │   └── gri-frameworks.json # 28 GRI disclosure items
│   ├── middleware/
│   │   └── errorHandler.js
│   └── tests/
│       ├── api.test.js
│       ├── chunker.test.js
│       └── vectorStore.test.js
│
├── frontend/
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Router + layout shell
│       ├── index.css
│       ├── api/
│       │   └── client.js       # Axios API wrapper
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── MetricCard.jsx
│       │   └── ChatInterface.jsx
│       └── pages/
│           ├── UploadPage.jsx      # Drag & drop, step progress
│           ├── DashboardPage.jsx   # Metrics grid + chat
│           └── GapAnalysisPage.jsx # Radar chart + checklist
│
└── sample-data/
    └── mock-esg-report.txt     # EcoTest Corp 2024 mock report
```

---

## GRI Framework Assumptions

- Implemented 28 GRI disclosures spanning General, Economic, Environmental, and Social categories.
- Status classification (`present` / `partial` / `missing`) is determined by the LLM based on retrieved document context — it is a best-effort AI assessment, not a certified audit.
- `partial` is scored at 0.5 weight in the compliance percentage calculation.
- TCFD and BRSR stubs are present in `checkCompliance.js` — add their JSON checklists to `backend/data/` to enable them.

---

<!-- ## What I'd Improve With More Time

1. **Persistent vector store** — swap in-memory TF-IDF for Chroma or Qdrant with proper embeddings (`text-embedding-3-small`). Better semantic retrieval for vague queries.
2. **Streaming chat** — use OpenAI streaming and Server-Sent Events so responses appear word-by-word.
3. **Multi-agent orchestration** — separate Extractor Agent and Compliance Agent coordinated by a Router Agent, each with their own system prompt and tool set.
4. **Authentication** — session management so multiple users can have isolated document sessions.
5. **Report history** — persist `documentId` + results in SQLite so users can revisit past analyses.
6. **Chart enhancements** — emissions trend bar chart, year-on-year comparison if multiple reports are uploaded.
7. **PDF page highlights** — show which page in the PDF each evidence quote came from.

--- -->

## AI Assistance Disclosure

This project was scaffolded with AI assistance (OpenAI). Architecture decisions, tool definitions, prompt engineering, and integration logic were designed and reviewed by the developer. All AI-generated code was read, understood, and tested before inclusion.

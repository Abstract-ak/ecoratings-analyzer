import { useState, useRef, useEffect } from "react";

const SUGGESTED = [
  "What are the Scope 1 and Scope 2 emissions?",
  "How does the company address water usage?",
  "What diversity initiatives are mentioned?",
  "Are there any net-zero commitments?",
];

export default function ChatInterface({ documentId, sendMessage }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I've read the sustainability report. Ask me anything about the company's ESG data, commitments, or disclosures.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await sendMessage(documentId, msg, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,.07)",
      }}
    >
      {/* Messages */}
      <div style={{ height: 340, overflowY: "auto", padding: "1rem" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "0.65rem 1rem",
                borderRadius: 12,
                fontSize: "0.88rem",
                lineHeight: 1.55,
                background: m.role === "user" ? "#16a34a" : "#f3f4f6",
                color: m.role === "user" ? "#fff" : "#111827",
                borderBottomRightRadius: m.role === "user" ? 4 : 12,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: "#f3f4f6",
                padding: "0.65rem 1rem",
                borderRadius: 12,
                borderBottomLeftRadius: 4,
              }}
            >
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div
          style={{
            padding: "0 1rem 0.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => submit(q)}
              style={{
                fontSize: "0.78rem",
                padding: "0.35rem 0.75rem",
                borderRadius: 99,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #e5e7eb",
          padding: "0.75rem 1rem",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
          placeholder="Ask about emissions, water, diversity…"
          disabled={loading}
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "0.55rem 0.85rem",
            fontSize: "0.9rem",
            outline: "none",
            background: "#f9fafb",
          }}
        />
        <button
          onClick={() => submit()}
          disabled={!input.trim() || loading}
          style={{
            background: !input.trim() || loading ? "#e5e7eb" : "#16a34a",
            color: "#fff",
            padding: "0.55rem 1rem",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.88rem",
            cursor: !input.trim() || loading ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", height: 18 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#9ca3af",
            animation: "bounce 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { FiUploadCloud } from "react-icons/fi";
import ChatMessage from "./ChatMessage";
import TypingIndicator, { StudyMascot } from "./TypingIndicator";

const PROMPTS = [
  { emoji: "🧠", text: "Teach me the key ideas", q: "Turn my sources into a friendly, simple lesson." },
  { emoji: "🔗", text: "How do the concepts connect?", q: "Explain how the main concepts in my sources connect, with examples." },
  { emoji: "🎲", text: "Quiz me, one at a time", q: "Ask me five questions based on my sources, one at a time, and explain my answers." },
];

const FOLLOW_UPS = ["Explain it like I'm 12", "Give me an example", "Summarize in 3 bullets"];

export default function ChatWindow({
  messages = [],
  loading,
  mood,
  hasSources,
  disabled,
  onAsk,
  onAddSources,
  tools = [],
  generating,
  onGenerate = () => {},
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  if (!messages.length && !loading) {
    return (
      <div className="hero">
        <span className="float-emoji fe1">📚</span>
        <span className="float-emoji fe2">💡</span>
        <span className="float-emoji fe3">✨</span>

        <div className="hero-mascot">
          <StudyMascot mood={mood} />
        </div>
        <h1>What shall we learn today?</h1>
        <p>
          {hasSources
            ? "Pick a study tool below, or ask Lumi anything."
            : "Add a PDF, video or link first. Then pick a tool or ask away."}
        </p>
        {!hasSources && (
          <button type="button" className="btn big" onClick={onAddSources}>
            <FiUploadCloud /> Add your first source
          </button>
        )}

        <div className="study-cards">
          {tools.map((t, i) => (
            <button
              key={t.type}
              type="button"
              className={`study-card ${t.tone} ${generating === t.type ? "busy" : ""}`}
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
              disabled={disabled || Boolean(generating)}
              onClick={() => onGenerate(t.type)}
            >
              <span className="study-emoji">{generating === t.type ? "⏳" : t.emoji}</span>
              <strong>{t.label}</strong>
              <small>{generating === t.type ? t.busy : t.desc}</small>
            </button>
          ))}
        </div>

        <p className="or-ask">or start with a question</p>
        <div className="prompt-row">
          {PROMPTS.map((p, i) => (
            <button
              key={p.text}
              type="button"
              className="prompt-card"
              style={{ animationDelay: `${0.45 + i * 0.08}s` }}
              disabled={disabled || !hasSources}
              onClick={() => onAsk(p.q)}
            >
              <span>{p.emoji}</span>
              {p.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const last = messages[messages.length - 1];
  const showFollowUps = !loading && last && last.sender !== "user" && !last.error;

  return (
    <div className="chat-stream">
      {messages.map((m, i) => (
        <ChatMessage key={m.id || i} sender={m.sender} message={m.message} sources={m.sources} error={m.error} />
      ))}
      {loading && <TypingIndicator />}
      {showFollowUps && (
        <div className="follow-ups">
          {FOLLOW_UPS.map((t) => (
            <button key={t} type="button" className="chip" onClick={() => onAsk(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
import { useState } from "react";
import { FiArrowUp, FiCornerDownLeft, FiPaperclip } from "react-icons/fi";

export default function ChatInput({ onSend, loading, hasSources = false }) {
  const [question, setQuestion] = useState("");
  const handleSubmit = () => { if (!question.trim() || loading) return; onSend(question.trim()); setQuestion(""); };
  return <div className="composer-wrap"><div className="composer-card"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} placeholder="Ask anything about your learning materials…" disabled={loading} rows={1} aria-label="Ask your learning question" /><div className="composer-bottom"><div className="composer-hint"><FiPaperclip /><span>{hasSources ? "Using selected sources" : "Answers grounded in available sources"}</span><span className="hint-divider">·</span><FiCornerDownLeft /><span>Enter to send</span></div><button type="button" className="send-button" onClick={handleSubmit} disabled={loading || !question.trim()} aria-label="Send question">{loading ? <span className="send-spinner" /> : <FiArrowUp />}</button></div></div><p className="composer-disclaimer">Your study companion can make mistakes. Check source references for important details.</p></div>;
}

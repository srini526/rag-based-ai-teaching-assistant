import { useRef, useState } from "react";
import { FiArrowUp, FiCornerDownLeft, FiPaperclip } from "react-icons/fi";

export default function ChatInput({ onSend, loading, hasSources = false }) {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef(null);

  const resizeTextarea = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleChange = (e) => {
    setQuestion(e.target.value);
    resizeTextarea(e.target);
  };

  const handleSubmit = () => {
    if (!question.trim() || loading) return;
    onSend(question.trim());
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="composer-wrap">
      <div className="composer-card">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask Lumi anything about your uploaded notes, lectures, or links…"
          disabled={loading}
          rows={1}
          aria-label="Ask your learning question"
        />
        <div className="composer-bottom">
          <div className="composer-hint">
            <FiPaperclip />
            <span>
              {hasSources
                ? "Focused on your selected sources"
                : "Grounded in all ready library sources"}
            </span>
            <span className="hint-divider">·</span>
            <FiCornerDownLeft />
            <span>Enter to send · Shift+Enter for newline</span>
          </div>
          <button
            type="button"
            className="send-button"
            onClick={handleSubmit}
            disabled={loading || !question.trim()}
            aria-label="Send question"
            title="Send question"
          >
            {loading ? <span className="send-spinner" /> : <FiArrowUp />}
          </button>
        </div>
      </div>
      <p className="composer-disclaimer">
        Lumi grounds every answer in your study materials. Always verify key details in the cited sources.
      </p>
    </div>
  );
}
import { useRef, useState } from "react";
import { FiArrowUp, FiPlus, FiSquare } from "react-icons/fi";

export default function ChatInput({ onSend, loading, disabled, onAttach, onStop }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  const grow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  };

  const submit = () => {
    if (!text.trim() || loading || disabled) return;
    onSend(text.trim());
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className="composer">
      <button type="button" className="icon-btn" onClick={onAttach} title="Add sources" aria-label="Add sources">
        <FiPlus />
      </button>
      <textarea
        ref={ref}
        rows={1}
        value={text}
        disabled={disabled}
        placeholder="Ask anything about your sources…"
        aria-label="Ask a question"
        onChange={(e) => {
          setText(e.target.value);
          grow(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {loading ? (
        <button type="button" className="send stop" onClick={onStop} aria-label="Stop" title="Stop">
          <FiSquare />
        </button>
      ) : (
        <button
          type="button"
          className="send"
          onClick={submit}
          disabled={disabled || !text.trim()}
          aria-label="Send"
          title="Send"
        >
          <FiArrowUp />
        </button>
      )}
    </div>
  );
}

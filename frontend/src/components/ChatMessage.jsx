import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { FiBookOpen, FiCheck, FiChevronDown, FiCopy } from "react-icons/fi";
import SourceCard from "./SourceCard";
import { StudyMascot } from "./TypingIndicator";

export default function ChatMessage({ sender, message, sources, error = false }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  if (sender === "user") {
    return (
      <div className="msg-row user">
        <div className="bubble">{message}</div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const count = sources?.length || 0;

  return (
    <div className="msg-row bot">
      <div className="bot-avatar">
        <StudyMascot mood={error ? "thinking" : "happy"} />
      </div>
      <div className={`bubble ${error ? "error" : ""}`}>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message || ""}
          </ReactMarkdown>
        </div>

        {(count > 0 || message) && (
          <div className="msg-actions">
            {count > 0 && (
              <button
                type="button"
                className={`chip ${showSources ? "on" : ""}`}
                onClick={() => setShowSources((v) => !v)}
              >
                <FiBookOpen /> {count} source{count === 1 ? "" : "s"}
                <FiChevronDown className="chev" />
              </button>
            )}
            {message && (
              <button type="button" className="chip" onClick={copy}>
                {copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        )}

        {showSources && (
          <div className="sources-grid pop">
            {sources.map((s, i) => (
              <SourceCard key={s.id || `${s.source_name || s.name || "src"}-${i}`} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

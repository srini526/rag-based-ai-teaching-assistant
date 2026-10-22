import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { FiCheck, FiCopy, FiExternalLink } from "react-icons/fi";
import SourceCard from "./SourceCard";
import { StudyMascot } from "./TypingIndicator";

export default function ChatMessage({ sender, message, sources, error = false }) {
  const isUser = sender === "user";
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard may be unavailable in restricted contexts. */
    }
  };

  if (isUser) {
    return (
      <div className="user-message-row">
        <div className="user-message">
          <p>{message}</p>
        </div>
        <div className="user-avatar">You</div>
      </div>
    );
  }

  return (
    <article className={`assistant-message-row ${error ? "message-error" : ""}`}>
      <div className="assistant-avatar">
        <StudyMascot mood={error ? "thinking" : "happy"} />
      </div>
      <div className="assistant-message-content">
        <div className="assistant-message-meta">
          <strong>Lumi · StudyVerse</strong>
          <span>AI Study Companion</span>
        </div>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message || ""}
          </ReactMarkdown>
        </div>
        {sources?.length > 0 && (
          <div className="sources-block">
            <div className="sources-heading">
              <span>Grounded Sources</span>
              <span>
                {sources.length} reference{sources.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="sources-grid">
              {sources.map((source, index) => (
                <SourceCard
                  key={source.id || `${source.source_name || source.name || "source"}-${index}`}
                  source={source}
                />
              ))}
            </div>
          </div>
        )}
        {Boolean(message) && (
          <div className="message-actions">
            <button type="button" onClick={copyMessage}>
              {copied ? <FiCheck /> : <FiCopy />}
              {copied ? "Copied!" : "Copy answer"}
            </button>
            {sources?.some((source) => source.url) && (
              <span>
                <FiExternalLink /> Direct source links attached
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
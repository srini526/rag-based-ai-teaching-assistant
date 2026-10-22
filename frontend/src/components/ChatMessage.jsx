import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { FiCopy, FiExternalLink, FiStar } from "react-icons/fi";
import SourceCard from "./SourceCard";

export default function ChatMessage({ sender, message, sources, error = false }) {
  const isUser = sender === "user";
  const copyMessage = async () => { try { await navigator.clipboard.writeText(message || ""); } catch { /* Clipboard may be unavailable. */ } };
  if (isUser) return <div className="user-message-row"><div className="user-message"><p>{message}</p></div><div className="user-avatar">You</div></div>;
  return <article className={`assistant-message-row ${error ? "message-error" : ""}`}><div className="assistant-avatar"><FiStar /></div><div className="assistant-message-content"><div className="assistant-message-meta"><strong>StudyVerse</strong><span>AI study companion</span></div><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{message || ""}</ReactMarkdown></div>{sources?.length > 0 && <div className="sources-block"><div className="sources-heading"><span>Sources used</span><span>{sources.length} reference{sources.length === 1 ? "" : "s"}</span></div><div className="sources-grid">{sources.map((source, index) => <SourceCard key={source.id || `${source.source_name || source.name || "source"}-${index}`} source={source} />)}</div></div>}{Boolean(message) && <div className="message-actions"><button type="button" onClick={copyMessage}><FiCopy /> Copy answer</button>{sources?.some((source) => source.url) && <span><FiExternalLink /> Source links available</span>}</div>}</div></article>;
}

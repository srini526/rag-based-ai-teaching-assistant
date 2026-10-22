import { useEffect, useRef } from "react";
import { FiBookOpen, FiFileText, FiGrid, FiStar } from "react-icons/fi";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

const FOLLOW_UPS = ["Give me a short summary", "Explain with an example", "What should I remember?"];
export default function ChatWindow({ messages = [], loading, onSuggestion = () => {} }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);
  if (!messages.length && !loading) return <div className="empty-chat-space"><div className="empty-chat-decoration decoration-one" /><div className="empty-chat-decoration decoration-two" /><div className="empty-chat-icon"><FiStar /></div><p>Ready when you are</p><span>Add a source or try one of the ideas above to start learning.</span></div>;
  return <div className="chat-stream"><div className="chat-stream-inner">{messages.map((msg, index) => <div key={msg.id || index} className="message-entry"><ChatMessage sender={msg.sender} message={msg.message} sources={msg.sources} error={msg.error} /></div>)}{loading && <TypingIndicator />}<div ref={bottomRef} /></div>{!loading && messages.length > 0 && <div className="follow-up-row"><span><FiStar /> Keep exploring</span>{FOLLOW_UPS.map((text, index) => <button key={text} type="button" onClick={() => onSuggestion(text)}>{index === 0 ? <FiFileText /> : index === 1 ? <FiBookOpen /> : <FiGrid />}{text}</button>)}</div>}</div>;
}

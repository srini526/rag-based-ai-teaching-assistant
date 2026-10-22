import { useEffect, useRef } from "react";
import { FiBookOpen, FiFileText, FiGrid, FiStar, FiZap } from "react-icons/fi";
import ChatMessage from "./ChatMessage";
import TypingIndicator, { StudyMascot } from "./TypingIndicator";

const FOLLOW_UPS = [
  { text: "Give me a short summary", icon: FiFileText },
  { text: "Explain with a real-world analogy", icon: FiBookOpen },
  { text: "What are the top 3 exam takeaways?", icon: FiGrid },
  { text: "Test me with one quick question", icon: FiZap },
];

export default function ChatWindow({ messages = [], loading, onSuggestion = () => {} }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  if (!messages.length && !loading) {
    return (
      <div className="empty-chat-space">
        <div className="empty-chat-icon">
          <StudyMascot mood="happy" />
        </div>
        <p>Ready when you are!</p>
        <span>Add a source on the right or pick a prompt card to begin.</span>
      </div>
    );
  }

  return (
    <div className="chat-stream">
      <div className="chat-stream-inner">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className="message-entry">
            <ChatMessage
              sender={msg.sender}
              message={msg.message}
              sources={msg.sources}
              error={msg.error}
            />
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
      {!loading && messages.length > 0 && (
        <div className="follow-up-row">
          <span>
            <FiStar /> Keep the streak going:
          </span>
          {FOLLOW_UPS.map(({ text, icon: Icon }) => (
            <button key={text} type="button" onClick={() => onSuggestion(text)}>
              <Icon />
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
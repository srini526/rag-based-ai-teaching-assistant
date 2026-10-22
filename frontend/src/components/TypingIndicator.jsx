import { FiStar } from "react-icons/fi";
export default function TypingIndicator() {
  return <div className="assistant-message-row typing-row"><div className="assistant-avatar"><FiStar /></div><div className="typing-card"><div className="typing-label">Putting the pieces together<span className="typing-dots"><i /><i /><i /></span></div><div className="typing-progress"><span /></div></div></div>;
}

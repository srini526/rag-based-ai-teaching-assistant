import { useState } from "react";
import { FiAward, FiClock, FiFolder, FiMoon, FiPlus, FiSun, FiTrash2 } from "react-icons/fi";
import { StudyMascot } from "./TypingIndicator";

export default function Header({
  theme,
  onThemeToggle,
  xp,
  sourceCount,
  onOpenLibrary,
  onNewChat,
  chatHistory = [],
  currentChatId,
  onSelectChat,
  onDeleteChat,
  mood,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mascot">
          <StudyMascot mood={mood} />
        </span>
        <b>StudyVerse</b>
      </div>

      <div className="topbar-right">
        <span className="xp-pill" key={xp} title="XP grows as you ask, quiz and learn">
          <FiAward /> {xp} XP
        </span>

        <div className="menu-wrap">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label="Chat history"
            title="Chat history"
          >
            <FiClock />
          </button>
          {historyOpen && (
            <>
              <div className="menu-scrim" onClick={() => setHistoryOpen(false)} />
              <div className="menu pop">
                {chatHistory.length === 0 ? (
                  <p className="menu-empty">No chats yet</p>
                ) : (
                  chatHistory.map((c) => (
                    <div key={c.id} className={`menu-row ${c.id === currentChatId ? "active" : ""}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectChat(c.id);
                          setHistoryOpen(false);
                        }}
                      >
                        {c.title || "New chat"}
                      </button>
                      {onDeleteChat && (
                        <button
                          type="button"
                          className="icon-btn sm"
                          onClick={() => onDeleteChat(c.id)}
                          aria-label="Delete chat"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <button type="button" className="icon-btn" onClick={onNewChat} title="New chat" aria-label="New chat">
          <FiPlus />
        </button>

        <button type="button" className="btn ghost sm" onClick={onOpenLibrary}>
          <FiFolder /> Sources
          {sourceCount > 0 && <span className="badge">{sourceCount}</span>}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onThemeToggle}
          aria-label="Toggle theme"
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
        </button>
      </div>
    </header>
  );
}

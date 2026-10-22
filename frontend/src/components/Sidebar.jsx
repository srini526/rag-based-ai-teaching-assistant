import {
  FiBookOpen,
  FiChevronLeft,
  FiClock,
  FiGrid,
  FiMessageCircle,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { StudyMascot } from "./TypingIndicator";

export default function Sidebar({
  chatHistory = [],
  currentChatId,
  setCurrentChatId,
  newChat,
  deleteChat,
  mobileOpen = false,
  onCloseMobile = () => {},
  onOpenLibrary = () => {},
  onOpenCanvas,
  collapsed = false,
  onToggleCollapse,
  mascotMood = "happy",
}) {
  return (
    <>
      <button
        type="button"
        className={`mobile-nav-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={onCloseMobile}
        aria-label="Close navigation"
      />
      <aside
        className={`app-sidebar ${mobileOpen ? "mobile-open" : ""} ${
          collapsed ? "collapsed-desktop" : ""
        }`.trim()}
      >
        <div className="sidebar-brand-row">
          <div className="sidebar-mini-mark">
            S<span>✦</span>
          </div>
          <div className="sidebar-brand-copy">
            <strong>StudyVerse</strong>
            <small>BENTO STUDY SPACE</small>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className="drawer-collapse-btn"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <FiChevronLeft />
            </button>
          )}
          <button
            type="button"
            className="mobile-close-button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <FiX />
          </button>
        </div>

        <button type="button" className="new-session-button" onClick={newChat}>
          <span>
            <FiPlus />
          </span>
          New study session
          <kbd>↵</kbd>
        </button>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="sidebar-section-label">YOUR BENTO TOOLS</p>
          <button type="button" className="sidebar-nav-item" onClick={onOpenLibrary}>
            <FiBookOpen />
            <span>Learning library</span>
          </button>
          {onOpenCanvas && (
            <button type="button" className="sidebar-nav-item" onClick={onOpenCanvas}>
              <FiGrid />
              <span>Source canvas</span>
              <span className="sidebar-nav-badge">Interactive</span>
            </button>
          )}

          <div className="sidebar-section-heading">
            <p className="sidebar-section-label">
              <FiClock /> RECENT CHATS
            </p>
            <span>{chatHistory.length}</span>
          </div>

          <div className="chat-history-list">
            {chatHistory.length === 0 ? (
              <div className="empty-history">
                <span className="empty-history-icon">
                  <FiMessageCircle />
                </span>
                <p>No chats just yet</p>
                <small>Ask a question or pick a prompt card to start.</small>
              </div>
            ) : (
              chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`history-row ${chat.id === currentChatId ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="history-select"
                    onClick={() => setCurrentChatId(chat.id)}
                  >
                    <FiMessageCircle />
                    <span>{chat.title || "New study session"}</span>
                  </button>
                  {deleteChat && (
                    <button
                      type="button"
                      className="history-delete"
                      onClick={() => deleteChat(chat.id)}
                      title="Delete conversation"
                      aria-label={`Delete ${chat.title || "conversation"}`}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </nav>

        <div className="sidebar-bottom">
          <div className="companion-mini-card">
            <div className="mini-companion-avatar">
              <StudyMascot mood={mascotMood} />
            </div>
            <div>
              <strong>Lumi is cheering for you!</strong>
              <p>Every question, summary, or flashcard builds your study streak.</p>
            </div>
            <span className="mini-star">✦</span>
          </div>
          <div className="sidebar-version">
            <span>
              <span className="sidebar-status-dot" /> Session ready
            </span>
            <span>v2.0 Bento</span>
          </div>
        </div>
      </aside>
    </>
  );
}
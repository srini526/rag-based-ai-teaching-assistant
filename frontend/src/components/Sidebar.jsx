import { FiBookOpen, FiChevronLeft, FiClock, FiMessageCircle, FiPlus, FiX, FiTrash2 } from "react-icons/fi";

export default function Sidebar({ chatHistory = [], currentChatId, setCurrentChatId, newChat, deleteChat, mobileOpen = false, onCloseMobile = () => {}, onOpenLibrary = () => {} }) {
  return <>
    <button type="button" className={`mobile-nav-backdrop ${mobileOpen ? "visible" : ""}`} onClick={onCloseMobile} aria-label="Close navigation" />
    <aside className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-brand-row"><div className="sidebar-mini-mark">S<span>✦</span></div><div className="sidebar-brand-copy"><strong>StudyVerse</strong><small>YOUR LEARNING SPACE</small></div><button type="button" className="mobile-close-button" onClick={onCloseMobile} aria-label="Close navigation"><FiX /></button></div>
      <button type="button" className="new-session-button" onClick={newChat}><span><FiPlus /></span> New study session <kbd>↵</kbd></button>
      <nav className="sidebar-nav" aria-label="Main navigation"><p className="sidebar-section-label">YOUR SPACE</p><button type="button" className="sidebar-nav-item" onClick={onOpenLibrary}><FiBookOpen /><span>Learning library</span></button><div className="sidebar-section-heading"><p className="sidebar-section-label"><FiClock /> RECENT CHATS</p><span>{chatHistory.length}</span></div>
        <div className="chat-history-list">{chatHistory.length === 0 ? <div className="empty-history"><span className="empty-history-icon"><FiMessageCircle /></span><p>No chats just yet.</p><small>Your study sessions will show up here.</small></div> : chatHistory.map((chat) => <div key={chat.id} className={`history-row ${chat.id === currentChatId ? "active" : ""}`}><button type="button" className="history-select" onClick={() => setCurrentChatId(chat.id)}><FiMessageCircle /><span>{chat.title || "New study session"}</span></button>{deleteChat && <button type="button" className="history-delete" onClick={() => deleteChat(chat.id)} title="Delete conversation" aria-label={`Delete ${chat.title || "conversation"}`}><FiTrash2 /></button>}</div>)}</div>
      </nav>
      <div className="sidebar-bottom"><div className="companion-mini-card"><div className="mini-companion-face">:)</div><div><strong>One step at a time.</strong><p>Small study sessions add up.</p></div><span className="mini-star">✦</span></div><div className="sidebar-version"><span className="sidebar-status-dot" /> Ready when you are</div></div>
    </aside>
  </>;
}

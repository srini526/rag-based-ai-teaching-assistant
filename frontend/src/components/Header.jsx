import {
  FiAward,
  FiBookOpen,
  FiHome,
  FiLayers,
  FiMenu,
  FiMoon,
  FiSidebar,
  FiSun,
} from "react-icons/fi";

export default function Header({
  theme,
  onThemeToggle,
  onMenu,
  sidebarOpen = true,
  onToggleSidebar,
  showLibrary = true,
  onToggleLibrary,
  onShowWelcome,
  xp = 120,
}) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <FiMenu />
        </button>

        {onToggleSidebar && (
          <button
            type="button"
            className={`drawer-toggle-pill desktop-only ${sidebarOpen ? "active" : ""}`}
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Collapse sidebar drawer" : "Expand sidebar drawer"}
            aria-label={sidebarOpen ? "Collapse sidebar drawer" : "Expand sidebar drawer"}
          >
            <FiSidebar />
            <span>{sidebarOpen ? "Hide Menu" : "Menu"}</span>
          </button>
        )}

        <a
          className="brand-lockup"
          href="#top"
          onClick={(e) => {
            if (onShowWelcome) {
              e.preventDefault();
              onShowWelcome();
            }
          }}
          title="Back to welcome screen"
        >
          <span className="brand-mark">
            <FiBookOpen />
          </span>
          <span>
            <b>
              Study<span>Verse</span>
            </b>
            <small>GAMIFIED AI STUDY COMPANION</small>
          </span>
        </a>
      </div>

      <div className="header-right">
        <span className="xp-pill" title="Your study XP grows as you ask questions and complete quizzes">
          <FiAward /> {xp} XP
        </span>

        <span className="online-pill desktop-only">
          <i /> Lumi Online
        </span>

        {onToggleLibrary && (
          <button
            type="button"
            className={`drawer-toggle-pill ${showLibrary ? "active" : ""}`}
            onClick={onToggleLibrary}
            title={showLibrary ? "Hide learning library" : "Open learning library"}
          >
            <FiLayers />
            <span>{showLibrary ? "Hide Library" : "Library"}</span>
          </button>
        )}

        {onShowWelcome && (
          <button
            type="button"
            className="header-icon"
            onClick={onShowWelcome}
            aria-label="Welcome screen"
            title="Welcome screen"
          >
            <FiHome />
          </button>
        )}

        <button
          type="button"
          className="header-icon"
          onClick={onThemeToggle}
          aria-label="Toggle theme"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
        </button>
      </div>
    </header>
  );
}
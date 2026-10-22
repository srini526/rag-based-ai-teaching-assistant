import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLayers, FiFileText, FiZap } from "react-icons/fi";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import DocumentLibrary from "./components/DocumentLibrary";
import StudyKit from "./components/StudyKit";
import useChat from "./hooks/useChat";
import { makeQuiz, makeSummary } from "./services/api";

const TOOLS = [
  { type: "summary", label: "Summary", emoji: "📝", desc: "The key ideas on one page", icon: FiFileText, tone: "blue", busy: "Writing your summary…" },
  { type: "quiz", label: "Quiz", emoji: "🎯", desc: "6 questions, instant feedback", icon: FiZap, tone: "mint", busy: "Cooking up questions…" },
  { type: "flashcards", label: "Flashcards", emoji: "🃏", desc: "Flip, test, remember", icon: FiLayers, tone: "sky", busy: "Shuffling your cards…" },
];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        x: `${(Math.random() - 0.5) * 520}px`,
        y: `${-120 - Math.random() * 260}px`,
        r: `${Math.random() * 720 - 360}deg`,
        c: ["#2F80ED", "#14B8A6", "#38BDF8", "#5EEAD4", "#FFC93C"][Math.floor(Math.random() * 5)],
        d: `${Math.random() * 0.15}s`,
      })),
    []
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ "--x": p.x, "--y": p.y, "--r": p.r, background: p.c, animationDelay: p.d }} />
      ))}
    </div>
  );
}

export default function App() {
  const {
    chatHistory,
    currentChat,
    currentChatId,
    setCurrentChatId,
    newChat,
    deleteChat,
    sendMessage,
    loading,
    stopGeneration,
    sessionId,
    sessionError,
  } = useChat();

  const [selectedIds, setSelectedIds] = useState([]);
  const [docs, setDocs] = useState([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [kit, setKit] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem("studyverse.theme") || "light");
  const [xp, setXp] = useState(() => {
    const saved = Number(localStorage.getItem("studyverse.xp") || "0");
    return Number.isFinite(saved) ? saved : 0;
  });

  const messages = currentChat?.messages || [];
  const readyCount = docs.filter((d) => d.status === "ready").length;
  const hasSources = readyCount > 0;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("studyverse.theme", theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("studyverse.xp", String(xp));
    } catch {
      /* ignore */
    }
  }, [xp]);

  const celebrate = useCallback((gain = 10) => {
    setXp((v) => v + gain);
    setBurst((b) => b + 1);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(0), 1400);
    return () => clearTimeout(t);
  }, [burst]);

  const ask = (q) => {
    setXp((v) => v + 5);
    sendMessage(q, selectedIds);
  };

  const generate = async (type) => {
    if (!hasSources) {
      setLibraryOpen(true);
      return;
    }
    if (!sessionId || generating) return;
    setGenerating(type);
    setError("");
    try {
      if (type === "summary") {
        const res = await makeSummary(sessionId, selectedIds);
        setKit({ type, content: typeof res === "string" ? res : res?.summary || "No summary came back." });
      } else {
        const res = await makeQuiz(sessionId, selectedIds, 6);
        setKit({ type, content: Array.isArray(res?.questions) ? res.questions : [] });
      }
      celebrate(15);
    } catch (e) {
      setError(e.message || "Couldn't generate that. Check that a source is ready, then try again.");
    } finally {
      setGenerating(null);
    }
  };

  const closeKit = useCallback(() => setKit(null), []);
  const mood = burst ? "celebrating" : loading || generating ? "thinking" : "happy";
  const busyTool = TOOLS.find((t) => t.type === generating);

  return (
    <div className="app">
      <div className="blob b1" />
      <div className="blob b2" />

      <Header
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        xp={xp}
        sourceCount={readyCount}
        onOpenLibrary={() => setLibraryOpen(true)}
        onNewChat={newChat}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onDeleteChat={deleteChat}
        mood="happy"
      />

      <main className="stage">
        <ChatWindow
          messages={messages}
          loading={loading}
          mood={mood}
          hasSources={hasSources}
          disabled={!sessionId}
          onAsk={ask}
          onAddSources={() => setLibraryOpen(true)}
          tools={TOOLS}
          generating={generating}
          onGenerate={generate}
        />
      </main>

      <footer className="dock">
        {sessionError && <p className="inline-error">Session unavailable: {sessionError}</p>}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {busyTool && (
          <div className="making pop">
            <span className="typing-dots">
              <i />
              <i />
              <i />
            </span>
            {busyTool.busy}
          </div>
        )}

        {messages.length > 0 && (
        <div className="tools">
          <span>Then make a</span>
          {TOOLS.map(({ type, label, icon: Icon, tone }) => (
            <button
              key={type}
              type="button"
              className={`tool ${tone}`}
              disabled={Boolean(generating) || !sessionId}
              onClick={() => generate(type)}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>
        )}

        <ChatInput
          onSend={ask}
          loading={loading}
          disabled={!sessionId}
          onAttach={() => setLibraryOpen(true)}
          onStop={stopGeneration}
        />
      </footer>

      <DocumentLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        sessionId={sessionId}
        selectedIds={selectedIds}
        onSelectDocuments={setSelectedIds}
        onDocsChange={setDocs}
      />

      {kit && <StudyKit kit={kit} onClose={closeKit} onSwitch={(type) => setKit((k) => ({ ...k, type }))} onCelebrate={celebrate} />}
      {burst > 0 && <Confetti key={burst} />}
    </div>
  );
}
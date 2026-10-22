import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiCompass,
  FiCopy,
  FiDownload,
  FiFileText,
  FiGrid,
  FiLayers,
  FiMoon,
  FiRefreshCw,
  FiRotateCw,
  FiSun,
  FiX,
  FiXCircle,
  FiZap,
} from "react-icons/fi";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import DocumentLibrary from "./components/DocumentLibrary";
import { StudyMascot } from "./components/TypingIndicator";
import useChat from "./hooks/useChat";
import { makeQuiz, makeSummary } from "./services/api";

const IDEAS = [
  {
    icon: FiBookOpen,
    title: "Teach the key ideas",
    subtitle: "Break down my notes into a friendly, step-by-step lesson.",
    prompt: "Turn my selected sources into a friendly, simple lesson.",
  },
  {
    icon: FiCompass,
    title: "Map the connections",
    subtitle: "Show how core concepts link together with clear examples.",
    prompt: "Explain how the main concepts in my selected sources connect, with examples.",
  },
  {
    icon: FiZap,
    title: "Interactive Socratic quiz",
    subtitle: "Test my recall one question at a time with instant coaching.",
    prompt: "Ask me five questions based on my selected sources, one at a time, and explain my answers.",
  },
];

const LAUNCH_HIGHLIGHTS = [
  {
    icon: FiBookOpen,
    tone: "violet",
    title: "Grounded AI Tutor",
    desc: "Answers cite exact pages, slides, or video timestamps.",
  },
  {
    icon: FiFileText,
    tone: "mint",
    title: "Smart Summaries",
    desc: "Instant Markdown study guides with key definitions.",
  },
  {
    icon: FiZap,
    tone: "sunny",
    title: "Graded Quizzes",
    desc: "Multiple-choice checks with explanations & XP streaks.",
  },
  {
    icon: FiLayers,
    tone: "peach",
    title: "3D Flip Flashcards",
    desc: "Interactive perspective cards + visual Source Canvas.",
  },
];

const save = (name, value) => {
  const blob = new Blob([value], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

function getLevelInfo(xp) {
  if (xp >= 350) return { level: 5, title: "Study Sage" };
  if (xp >= 250) return { level: 4, title: "Quiz Champion" };
  if (xp >= 170) return { level: 3, title: "Concept Crafter" };
  if (xp >= 100) return { level: 2, title: "Note Explorer" };
  return { level: 1, title: "Curious Sprout" };
}

export default function App() {
  const chat = useChat();
  const {
    chatHistory,
    currentChat,
    currentChatId,
    setCurrentChatId,
    newChat,
    deleteChat,
    clearHistory,
    sendMessage,
    loading,
    stopGeneration,
    sessionId,
    sessionError,
  } = chat;

  const [selectedIds, setSelectedIds] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showCanvas, setShowCanvas] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("studyverse.theme") || "light"
  );
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [notice, setNotice] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [bonusXp, setBonusXp] = useState(() => {
    const saved = Number(localStorage.getItem("studyverse.xp") || "60");
    return Number.isFinite(saved) ? saved : 60;
  });
  const [started, setStarted] = useState(
    () => sessionStorage.getItem("studyverse.started") === "yes"
  );
  const [exitingLaunch, setExitingLaunch] = useState(false);

  const messages = currentChat?.messages || [];

  const progress = useMemo(
    () =>
      Math.min(
        100,
        Math.round(
          selectedIds.length * 25 +
            (messages.length ? 38 : 0) +
            (result ? 22 : 0)
        )
      ),
    [selectedIds.length, messages.length, result]
  );

  const totalXp = useMemo(
    () => bonusXp + selectedIds.length * 15 + messages.length * 10 + (result ? 25 : 0),
    [bonusXp, selectedIds.length, messages.length, result]
  );

  const levelInfo = useMemo(() => getLevelInfo(totalXp), [totalXp]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("studyverse.theme", theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("studyverse.xp", String(bonusXp));
    } catch {
      /* Ignore storage quota errors */
    }
  }, [bonusXp]);

  const triggerCelebration = (xpGain = 15) => {
    setBonusXp((v) => v + xpGain);
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 1800);
  };

  const begin = () => {
    setExitingLaunch(true);
    setTimeout(() => {
      sessionStorage.setItem("studyverse.started", "yes");
      setStarted(true);
      setExitingLaunch(false);
    }, 280);
  };

  const showWelcome = () => {
    sessionStorage.removeItem("studyverse.started");
    setStarted(false);
  };

  const ask = (prompt) => {
    if (!started) {
      sessionStorage.setItem("studyverse.started", "yes");
      setStarted(true);
    }
    sendMessage(prompt, selectedIds);
  };

  const study = async (type) => {
    if (!sessionId || busy) return;
    setBusy(true);
    setBusyLabel(type);
    setNotice("");
    try {
      if (type === "summary") {
        const res = await makeSummary(sessionId, selectedIds);
        const summaryContent =
          typeof res === "string"
            ? res
            : res?.summary || "No summary text returned.";
        setResult({ type: "summary", content: summaryContent });
        triggerCelebration(20);
      } else {
        const res = await makeQuiz(sessionId, selectedIds, 6);
        const questions = Array.isArray(res?.questions) ? res.questions : [];
        setResult({
          type: type === "flashcards" ? "flashcards" : "quiz",
          content: questions,
        });
        triggerCelebration(25);
      }
    } catch (e) {
      setNotice(e.message || "Could not generate study kit. Make sure at least one source is ready.");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const mascotMood = celebrating
    ? "celebrating"
    : loading || busy
      ? "thinking"
      : "happy";

  if (!started) {
    return (
      <main className={`launch-screen ${exitingLaunch ? "exiting" : ""}`}>
        <div className="launch-ambient-orb orb-1" />
        <div className="launch-ambient-orb orb-2" />
        <div className="launch-ambient-orb orb-3" />

        <button
          type="button"
          className="theme-float"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
          title="Toggle light/dark theme"
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
        </button>

        <section className="launch-bento-stage">
          <div className="launch-card">
            <div className="launch-mascot-wrap">
              <StudyMascot mood="happy" />
            </div>

            <div className="launch-speech-pill">
              <span>✦ Hi! I’m Lumi, your AI Study Companion</span>
            </div>

            <p className="overline">FLOATING BENTO STUDY WORKSPACE</p>
            <h1>
              Let’s make learning
              <br />
              <em>playful & effortless.</em>
            </h1>
            <p className="launch-subtitle">
              Drop in your lecture PDFs, slides, recordings, or links. Lumi turns them into grounded answers, Markdown summaries, graded quizzes, and 3D flashcards.
            </p>

            <button type="button" className="primary-button" onClick={begin}>
              Enter StudyVerse Workspace <span>→</span>
            </button>

            <div className="launch-feature-bento">
              {LAUNCH_HIGHLIGHTS.map(({ icon: Icon, tone, title, desc }) => (
                <article key={title} className="launch-mini-card">
                  <span className={`launch-mini-icon ${tone}`}>
                    <Icon />
                  </span>
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </article>
              ))}
            </div>

            <div className="launch-notes">
              <span>✦ Ask anything</span>
              <span>✦ Interactive Source Canvas</span>
              <span>✦ 3D Flip Flashcards</span>
              <span>✦ Earn XP as you learn</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        setCurrentChatId={(id) => {
          setCurrentChatId(id);
          setMobileNav(false);
        }}
        newChat={() => {
          newChat();
          setMobileNav(false);
        }}
        deleteChat={deleteChat}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
        onOpenLibrary={() => {
          setShowLibrary(true);
          setShowCanvas(false);
          setMobileNav(false);
        }}
        onOpenCanvas={() => {
          setShowLibrary(true);
          setShowCanvas(true);
          setMobileNav(false);
        }}
        collapsed={!sidebarOpen}
        onToggleCollapse={() => setSidebarOpen((v) => !v)}
        mascotMood={mascotMood}
      />

      <main className="main-shell">
        <Header
          theme={theme}
          onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
          onMenu={() => setMobileNav(true)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          showLibrary={showLibrary}
          onToggleLibrary={() => setShowLibrary((v) => !v)}
          onShowWelcome={showWelcome}
          xp={totalXp}
        />

        <section className="workspace">
          <div className="chat-column">
            <div className="workspace-toolbar">
              <div className="workspace-toolbar-left">
                <div className="toolbar-mascot-badge">
                  <StudyMascot mood={mascotMood} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="overline">ACTIVE STUDY SESSION</p>
                  <h1>{currentChat?.title || "A fresh page for curious ideas."}</h1>
                  <p>
                    {selectedIds.length
                      ? `${selectedIds.length} selected source${
                          selectedIds.length > 1 ? "s" : ""
                        } actively guiding Lumi`
                      : "All ready sources in your library are connected — or select specific nodes."}
                  </p>
                </div>
              </div>

              <div className="toolbar-actions">
                <button
                  type="button"
                  className={`bento-btn ${showLibrary && showCanvas ? "violet" : ""}`}
                  onClick={() => {
                    if (!showLibrary) {
                      setShowLibrary(true);
                      setShowCanvas(true);
                    } else {
                      setShowCanvas((v) => !v);
                    }
                  }}
                >
                  <FiGrid /> {showLibrary && showCanvas ? "List View" : "Source Canvas"}
                </button>
                <button
                  type="button"
                  className="bento-btn"
                  onClick={() =>
                    save(
                      "study-session.md",
                      messages
                        .map(
                          (m) =>
                            `## ${m.sender === "user" ? "You" : "Lumi (StudyVerse)"}\n\n${
                              m.message
                            }`
                        )
                        .join("\n\n")
                    )
                  }
                  disabled={!messages.length}
                >
                  <FiDownload /> Export Chat
                </button>
              </div>
            </div>

            <div className="study-strip">
              <div className="progress-ring" title={`Session momentum: ${progress}%`}>
                <svg viewBox="0 0 36 36">
                  <path
                    className="ring-base"
                    d="M18 2.1a15.9 15.9 0 1 1 0 31.8a15.9 15.9 0 1 1 0-31.8"
                  />
                  <path
                    className="ring-fill"
                    strokeDasharray={`${progress},100`}
                    d="M18 2.1a15.9 15.9 0 1 1 0 31.8a15.9 15.9 0 1 1 0-31.8"
                  />
                </svg>
                <b>{progress}%</b>
              </div>

              <div className="study-rhythm-copy">
                <strong>
                  Study Rhythm
                  <span className="level-tag">
                    Lv.{levelInfo.level} {levelInfo.title}
                  </span>
                </strong>
                <span>
                  {busy
                    ? `Lumi is crafting your ${busyLabel}…`
                    : messages.length
                      ? "Momentum is building — try a summary, quiz, or 3D flashcards!"
                      : "Upload a source and pick a tool to earn study XP."}
                </span>
              </div>

              <div className="study-kit-actions">
                <button
                  type="button"
                  className="bento-btn violet"
                  onClick={() => study("summary")}
                  disabled={!sessionId || busy}
                >
                  <FiFileText />{" "}
                  {busy && busyLabel === "summary" ? "Summarizing…" : "Make Summary"}
                </button>
                <button
                  type="button"
                  className="bento-btn mint"
                  onClick={() => study("quiz")}
                  disabled={!sessionId || busy}
                >
                  <FiZap /> {busy && busyLabel === "quiz" ? "Building…" : "Build Quiz"}
                </button>
                <button
                  type="button"
                  className="bento-btn sunny"
                  onClick={() => study("flashcards")}
                  disabled={!sessionId || busy}
                >
                  <FiLayers />{" "}
                  {busy && busyLabel === "flashcards" ? "Flipping…" : "3D Flashcards"}
                </button>
              </div>
            </div>

            {sessionError && (
              <div className="notice error">
                <span>Session unavailable: {sessionError}</span>
              </div>
            )}
            {notice && (
              <div className="notice error">
                <span>{notice}</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notice"
                >
                  <FiX />
                </button>
              </div>
            )}

            {!messages.length ? (
              <div className="welcome-panel">
                <div className="welcome-mascot-stage">
                  <StudyMascot mood={mascotMood} />
                </div>
                <p className="overline">WHAT SHALL WE EXPLORE TODAY?</p>
                <h2>Hi, curious mind!</h2>
                <p>
                  Pick an interactive study prompt below, generate a Study Kit above, or ask your own question.
                </p>
                <div className="suggestion-grid">
                  {IDEAS.map(({ icon: Icon, title, subtitle, prompt }, idx) => (
                    <button
                      key={title}
                      type="button"
                      className={`suggestion-card card-${idx}`}
                      onClick={() => ask(prompt)}
                      disabled={!sessionId || loading}
                    >
                      <span>
                        <Icon />
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <small>{subtitle}</small>
                      </div>
                      <i>→</i>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatWindow messages={messages} loading={loading} onSuggestion={ask} />
            )}

            {result && (
              <StudyResult
                result={result}
                onSwitchMode={(newType) =>
                  setResult((prev) => (prev ? { ...prev, type: newType } : null))
                }
                onCelebrate={() => triggerCelebration(15)}
                onClose={() => setResult(null)}
              />
            )}

            <div className="composer-area">
              {loading && (
                <button
                  type="button"
                  className="stop-button"
                  onClick={stopGeneration}
                >
                  <FiXCircle /> Stop generating
                </button>
              )}
              <ChatInput
                onSend={ask}
                loading={loading || !sessionId}
                hasSources={Boolean(selectedIds.length)}
              />
            </div>
          </div>

          {showLibrary && (
            <DocumentLibrary
              sessionId={sessionId}
              selectedIds={selectedIds}
              onSelectDocuments={setSelectedIds}
              showCanvas={showCanvas}
              onCanvasToggle={setShowCanvas}
            />
          )}
        </section>

        <footer className="app-footer">
          <span>
            <i /> Your sources remain connected to this study session ·{" "}
            {selectedIds.length
              ? `${selectedIds.length} source(s) filtered`
              : "All ready sources active"}
          </span>
          <button
            type="button"
            className="bento-btn"
            onClick={() => {
              clearHistory();
              setResult(null);
            }}
          >
            Clear chat history
          </button>
        </footer>
      </main>
    </div>
  );
}

function StudyResult({ result, onSwitchMode, onCelebrate, onClose }) {
  const [answered, setAnswered] = useState({});
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState({});
  const [copiedSummary, setCopiedSummary] = useState(false);

  const isSummary = result.type === "summary";
  const isQuiz = result.type === "quiz";
  const isFlashcards = result.type === "flashcards";

  const questions = Array.isArray(result.content) ? result.content : [];
  const summaryMarkdown =
    typeof result.content === "string"
      ? result.content
      : result.content?.summary || JSON.stringify(result.content, null, 2);

  useEffect(() => {
    setAnswered({});
    setCardIndex(0);
    setFlipped(false);
    setMastered({});
  }, [result.content]);

  const getCorrectIndex = (q) => {
    if (typeof q.answer_index === "number") return q.answer_index;
    if (typeof q.correct_index === "number") return q.correct_index;
    if (typeof q.answer === "number") return q.answer;
    return 0;
  };

  const getFlashcardBack = (q) => {
    const opts = Array.isArray(q?.options) ? q.options : [];
    const idx = getCorrectIndex(q);
    return opts[idx] || q?.answer || "See explanation below";
  };

  const answeredCount = Object.keys(answered).length;
  const correctCount = questions.reduce((acc, q, idx) => {
    if (answered[idx] === undefined) return acc;
    return acc + (answered[idx] === getCorrectIndex(q) ? 1 : 0);
  }, 0);

  const handleSelectOption = (qIndex, optIndex, q) => {
    if (answered[qIndex] !== undefined) return;
    setAnswered((prev) => ({ ...prev, [qIndex]: optIndex }));
    if (optIndex === getCorrectIndex(q) && onCelebrate) {
      onCelebrate();
    }
  };

  const exportText = isSummary
    ? summaryMarkdown
    : questions
        .map((q, i) => {
          const opts = (q.options || [])
            .map((o, j) => `   - ${String.fromCharCode(65 + j)}. ${o}`)
            .join("\n");
          const ansIdx = getCorrectIndex(q);
          const ansLetter = String.fromCharCode(65 + ansIdx);
          return `### ${i + 1}. ${q.question || q.prompt || "Question"}\n${opts}\n\n**Answer:** ${ansLetter} (${
            (q.options || [])[ansIdx] || ""
          })\n${q.explanation ? `**Explanation:** ${q.explanation}\n` : ""}`;
        })
        .join("\n\n");

  const copySummaryText = async () => {
    try {
      await navigator.clipboard.writeText(summaryMarkdown);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      /* Ignore clipboard errors */
    }
  };

  const activeCard = questions[cardIndex] || null;
  const masteredCount = Object.values(mastered).filter(Boolean).length;

  return (
    <section className="study-result" aria-label="Study Kit Result">
      <div className="result-heading">
        <div>
          <p className="overline">INTERACTIVE STUDY KIT</p>
          <h2>
            {isSummary
              ? "Your Focused Summary"
              : isFlashcards
                ? "3D Flip Flashcards"
                : "Interactive Knowledge Check"}
          </h2>
        </div>

        <div className="result-header-controls">
          {!isSummary && questions.length > 0 && (
            <div className="mode-switch-pills" role="tablist">
              <button
                type="button"
                className={isQuiz ? "active" : ""}
                onClick={() => onSwitchMode("quiz")}
              >
                <FiZap /> Quiz Mode
              </button>
              <button
                type="button"
                className={isFlashcards ? "active" : ""}
                onClick={() => onSwitchMode("flashcards")}
              >
                <FiLayers /> 3D Flashcards
              </button>
            </div>
          )}
          <button type="button" className="bento-btn" onClick={onClose}>
            <FiX /> Close
          </button>
        </div>
      </div>

      {isSummary ? (
        <div className="summary-text markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {summaryMarkdown}
          </ReactMarkdown>
        </div>
      ) : questions.length === 0 ? (
        <p className="summary-text">
          No questions were generated. Try selecting another document in your library.
        </p>
      ) : isFlashcards && activeCard ? (
        <div className="flashcard-stage">
          <div className="quiz-score-banner" style={{ width: "100%", maxWidth: 580 }}>
            <div>
              <strong>
                Card {cardIndex + 1} of {questions.length}
              </strong>
              <span style={{ display: "block" }}>
                Click card to flip 3D · {masteredCount} of {questions.length} mastered
              </span>
            </div>
            {activeCard.source && (
              <span className="quiz-source-pill">{activeCard.source}</span>
            )}
          </div>

          <div
            className={`flashcard-scene ${flipped ? "is-flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-label="Flip flashcard"
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setFlipped((f) => !f);
              } else if (e.key === "ArrowRight") {
                setFlipped(false);
                setCardIndex((i) => (i + 1) % questions.length);
              } else if (e.key === "ArrowLeft") {
                setFlipped(false);
                setCardIndex((i) => (i - 1 + questions.length) % questions.length);
              }
            }}
          >
            <div className="flashcard-inner">
              <div className="flashcard-face flashcard-front">
                <span className="overline">QUESTION PROMPT</span>
                <div className="flashcard-face-body">
                  <h3>{activeCard.question || activeCard.prompt || "Question"}</h3>
                </div>
                <span className="flashcard-hint">
                  <FiRotateCw /> Click or press Space to flip answer
                </span>
              </div>

              <div className="flashcard-face flashcard-back">
                <span className="overline" style={{ color: "var(--mint)" }}>
                  VERIFIED ANSWER
                </span>
                <div className="flashcard-face-body">
                  <h3>{getFlashcardBack(activeCard)}</h3>
                  {activeCard.explanation && <p>{activeCard.explanation}</p>}
                </div>
                <span className="flashcard-hint">
                  <FiRotateCw /> Click to flip back to question
                </span>
              </div>
            </div>
          </div>

          <div className="flashcard-dots">
            {questions.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`flashcard-dot ${idx === cardIndex ? "active" : ""} ${
                  mastered[idx] ? "mastered" : ""
                }`}
                onClick={() => {
                  setFlipped(false);
                  setCardIndex(idx);
                }}
                aria-label={`Go to card ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flashcard-controls">
            <button
              type="button"
              className="bento-btn"
              onClick={() => {
                setFlipped(false);
                setCardIndex((i) => (i - 1 + questions.length) % questions.length);
              }}
            >
              <FiArrowLeft /> Previous
            </button>
            <button
              type="button"
              className="bento-btn violet"
              onClick={() => setFlipped((f) => !f)}
            >
              <FiRotateCw /> Flip Card
            </button>
            <button
              type="button"
              className={`bento-btn ${mastered[cardIndex] ? "mint" : "sunny"}`}
              onClick={() => {
                const nextState = !mastered[cardIndex];
                setMastered((prev) => ({ ...prev, [cardIndex]: nextState }));
                if (nextState && onCelebrate) onCelebrate();
              }}
            >
              <FiAward /> {mastered[cardIndex] ? "Mastered! ✓" : "Got it! (+15 XP)"}
            </button>
            <button
              type="button"
              className="bento-btn"
              onClick={() => {
                setFlipped(false);
                setCardIndex((i) => (i + 1) % questions.length);
              }}
            >
              Next <FiArrowRight />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="quiz-score-banner">
            <div>
              <strong>
                Score: {correctCount} / {questions.length} correct
              </strong>
              <span style={{ display: "block" }}>
                {answeredCount === questions.length
                  ? "Quiz complete! Great job reviewing your sources."
                  : `${answeredCount} of ${questions.length} answered — pick an option below`}
              </span>
            </div>
            {answeredCount > 0 && (
              <button
                type="button"
                className="bento-btn"
                onClick={() => setAnswered({})}
              >
                <FiRefreshCw /> Reset Quiz
              </button>
            )}
          </div>

          <div className="quiz-list">
            {questions.map((q, i) => {
              const userChoice = answered[i];
              const hasAnswered = userChoice !== undefined;
              const correctIdx = getCorrectIndex(q);

              return (
                <article className="quiz-card" key={i}>
                  <div className="quiz-card-top">
                    <strong>
                      {i + 1}. {q.question || q.prompt || "Question"}
                    </strong>
                    {q.source && <span className="quiz-source-pill">{q.source}</span>}
                  </div>

                  <div className="quiz-options-grid">
                    {(q.options || []).map((o, j) => {
                      let statusClass = "";
                      if (hasAnswered) {
                        if (j === correctIdx) statusClass = "correct";
                        else if (j === userChoice) statusClass = "wrong";
                      }
                      return (
                        <button
                          key={j}
                          type="button"
                          className={`quiz-option-btn ${statusClass}`}
                          onClick={() => handleSelectOption(i, j, q)}
                          disabled={hasAnswered}
                        >
                          <span>
                            {String.fromCharCode(65 + j)}. {o}
                          </span>
                          {hasAnswered && j === correctIdx && <FiCheckCircle />}
                          {hasAnswered &&
                            j === userChoice &&
                            j !== correctIdx && <FiXCircle />}
                        </button>
                      );
                    })}
                  </div>

                  {hasAnswered && q.explanation && (
                    <div className="quiz-explanation">
                      <strong>
                        {userChoice === correctIdx ? "Spot on! " : "Good try! "}
                      </strong>
                      {q.explanation}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      <div className="result-footer-actions">
        {isSummary && (
          <button type="button" className="bento-btn" onClick={copySummaryText}>
            {copiedSummary ? <FiCheck /> : <FiCopy />}
            {copiedSummary ? "Copied Summary!" : "Copy Summary"}
          </button>
        )}
        <button
          type="button"
          className="bento-btn violet"
          onClick={() =>
            save(
              isSummary
                ? "study-summary.md"
                : isFlashcards
                  ? "study-flashcards.md"
                  : "study-quiz.md",
              exportText
            )
          }
        >
          <FiDownload /> Download Markdown
        </button>
      </div>
    </section>
  );
}
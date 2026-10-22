import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiCheck, FiCopy, FiDownload, FiLayers, FiRefreshCw, FiRotateCw, FiX, FiZap } from "react-icons/fi";
import { StudyMascot } from "./TypingIndicator";

const correctOf = (q) => [q.answer_index, q.correct_index, q.answer].find((v) => typeof v === "number") ?? 0;
const textOf = (q) => q.question || q.prompt || "Question";
const answerOf = (q) => (q.options || [])[correctOf(q)] || (typeof q.answer === "string" ? q.answer : "See explanation");

const save = (name, text) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

const toMarkdown = (qs) =>
  qs
    .map((q, i) => `### ${i + 1}. ${textOf(q)}\n${(q.options || []).map((o, j) => `- ${String.fromCharCode(65 + j)}. ${o}`).join("\n")}\n\n**Answer:** ${answerOf(q)}\n${q.explanation ? `\n${q.explanation}\n` : ""}`)
    .join("\n");

export default function StudyKit({ kit, onClose, onSwitch, onCelebrate }) {
  const isSummary = kit.type === "summary";
  const qs = Array.isArray(kit.content) ? kit.content : [];

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="kit-scrim" onClick={onClose}>
      <section className="kit pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="kit-head">
          {isSummary ? (
            <strong>📝 Your summary</strong>
          ) : (
            <div className="seg">
              <button type="button" className={kit.type === "quiz" ? "on" : ""} onClick={() => onSwitch("quiz")}>
                <FiZap /> Quiz
              </button>
              <button type="button" className={kit.type === "flashcards" ? "on" : ""} onClick={() => onSwitch("flashcards")}>
                <FiLayers /> Flashcards
              </button>
            </div>
          )}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </header>

        {isSummary ? (
          <Summary text={typeof kit.content === "string" ? kit.content : JSON.stringify(kit.content)} />
        ) : qs.length === 0 ? (
          <p className="doc-empty">No questions came back. Try picking different sources.</p>
        ) : kit.type === "quiz" ? (
          <Quiz qs={qs} onCelebrate={onCelebrate} onFlip={() => onSwitch("flashcards")} />
        ) : (
          <Flashcards qs={qs} onCelebrate={onCelebrate} onQuiz={() => onSwitch("quiz")} />
        )}
      </section>
    </div>
  );
}

function Summary({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="kit-body">
      <div className="markdown-content summary">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="btn" onClick={() => save("study-summary.md", text)}>
          <FiDownload /> Download
        </button>
      </div>
    </div>
  );
}

function Quiz({ qs, onCelebrate, onFlip }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const done = i >= qs.length;

  useEffect(() => {
    if (done && score / qs.length >= 0.8) onCelebrate(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    return (
      <div className="kit-body result">
        <div className="result-mascot">
          <StudyMascot mood="celebrating" />
        </div>
        <h2>{pct >= 80 ? "Brilliant!" : pct >= 50 ? "Nice work!" : "Good start!"}</h2>
        <div className="stars">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? "on" : ""} style={{ animationDelay: `${n * 0.18}s` }}>
              ★
            </span>
          ))}
        </div>
        <p>
          You got <b>{score}</b> of <b>{qs.length}</b> right.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setI(0);
              setPicked(null);
              setScore(0);
            }}
          >
            <FiRefreshCw /> Try again
          </button>
          <button type="button" className="btn sun" onClick={onFlip}>
            <FiLayers /> Flashcards
          </button>
        </div>
        <button type="button" className="link-btn" onClick={() => save("study-quiz.md", toMarkdown(qs))}>
          <FiDownload /> Download quiz
        </button>
      </div>
    );
  }

  const q = qs[i];
  const right = correctOf(q);
  const answered = picked !== null;
  const ok = picked === right;

  const pick = (j) => {
    if (answered) return;
    setPicked(j);
    if (j === right) {
      setScore((s) => s + 1);
      onCelebrate(10);
    }
  };

  return (
    <div className="kit-body quiz" key={i}>
      <div className="progress">
        <i style={{ width: `${((i + (answered ? 1 : 0)) / qs.length) * 100}%` }} />
      </div>
      <small className="count">
        Question {i + 1} of {qs.length}
      </small>
      <h2 className="q-text">{textOf(q)}</h2>

      <div className="options">
        {(q.options || []).map((o, j) => {
          const state = !answered ? "" : j === right ? "correct" : j === picked ? "wrong" : "dim";
          return (
            <button key={j} type="button" className={`opt ${state}`} disabled={answered} onClick={() => pick(j)}>
              <b>{String.fromCharCode(65 + j)}</b>
              <span>{o}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`feedback ${ok ? "good" : "bad"}`}>
          <div>
            <strong>{ok ? "Spot on! 🎉" : "Not quite 🤔"}</strong>
            {!ok && <p>Answer: {answerOf(q)}</p>}
            {q.explanation && <p>{q.explanation}</p>}
          </div>
          <button
            type="button"
            className={`btn ${ok ? "mint" : "coral"}`}
            onClick={() => {
              setPicked(null);
              setI((n) => n + 1);
            }}
          >
            {i + 1 === qs.length ? "Finish" : "Continue"}
          </button>
        </div>
      )}
    </div>
  );
}

function Flashcards({ qs, onCelebrate, onQuiz }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const done = i >= qs.length;

  if (done) {
    return (
      <div className="kit-body result">
        <div className="result-mascot">
          <StudyMascot mood="celebrating" />
        </div>
        <h2>Deck complete!</h2>
        <p>
          You knew <b>{known}</b> of <b>{qs.length}</b> cards.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setI(0);
              setKnown(0);
              setFlipped(false);
            }}
          >
            <FiRefreshCw /> Go again
          </button>
          <button type="button" className="btn" onClick={onQuiz}>
            <FiZap /> Take the quiz
          </button>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const next = (gotIt) => {
    if (gotIt) {
      setKnown((k) => k + 1);
      onCelebrate(5);
    }
    setFlipped(false);
    setI((n) => n + 1);
  };

  return (
    <div className="kit-body cards" key={i}>
      <div className="progress">
        <i style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>
      <small className="count">
        Card {i + 1} of {qs.length}
      </small>

      <button type="button" className={`fc-scene ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
        <span className="fc-inner">
          <span className="fc-face front">
            <h3>{textOf(q)}</h3>
            <small>
              <FiRotateCw /> Tap to flip
            </small>
          </span>
          <span className="fc-face back">
            <h3>{answerOf(q)}</h3>
            {q.explanation && <p>{q.explanation}</p>}
          </span>
        </span>
      </button>

      <div className="row">
        <button type="button" className="btn coral" onClick={() => next(false)}>
          Still learning
        </button>
        <button type="button" className="btn mint" onClick={() => next(true)}>
          <FiCheck /> Got it
        </button>
      </div>
    </div>
  );
}

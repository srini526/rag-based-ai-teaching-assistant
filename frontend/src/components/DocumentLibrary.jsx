import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiLoader,
  FiMaximize2,
  FiMinimize2,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
  FiZap,
} from "react-icons/fi";
import { addUrl, deleteDocument, listDocuments, uploadFiles } from "../services/api";

const ACCEPT =
  ".pdf,.docx,.txt,.md,.pptx,.mp3,.wav,.m4a,.mp4,.mov,.webm,.mpeg,.mpga,.flac,.ogg,.opus";

function iconFor(doc) {
  const name = `${doc.name || ""} ${doc.source_type || ""}`.toLowerCase();
  if (/youtube|video|mp4|mov|webm|audio|mp3|wav|m4a/.test(name)) return <FiVideo />;
  if (/web|url|http/.test(name)) return <FiGlobe />;
  return <FiFileText />;
}

function statusLabel(doc) {
  if (doc.status === "ready") return `${doc.chunk_count ?? 0} chunks · Ready`;
  if (doc.status === "failed") return doc.error || "Processing failed";
  return `${doc.status || "processing"}…`;
}

export default function DocumentLibrary({
  sessionId,
  onSelectDocuments,
  selectedIds = [],
  showCanvas,
  onCanvasToggle,
}) {
  const [documents, setDocuments] = useState([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [internalCanvas, setInternalCanvas] = useState(false);
  const [expandedCanvas, setExpandedCanvas] = useState(false);
  const inputRef = useRef(null);

  const isCanvas = typeof showCanvas === "boolean" ? showCanvas : internalCanvas;
  const handleToggleCanvas = (targetMode) => {
    const next = typeof targetMode === "boolean" ? targetMode : !isCanvas;
    if (onCanvasToggle) onCanvasToggle(next);
    setInternalCanvas(next);
  };

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await listDocuments(sessionId);
      const next = result.documents || [];
      setDocuments(next);
      const valid = new Set(
        next.filter((doc) => doc.status === "ready").map((doc) => doc.id)
      );
      onSelectDocuments((current) => current.filter((id) => valid.has(id)));
    } catch (e) {
      setError(e.message);
    }
  }, [sessionId, onSelectDocuments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, [sessionId, refresh]);

  const upload = async (files) => {
    if (!files?.length || !sessionId) return;
    setBusy(true);
    setError("");
    try {
      await uploadFiles(sessionId, Array.from(files));
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const submitUrl = async (e) => {
    e.preventDefault();
    if (!url.trim() || !sessionId) return;
    setBusy(true);
    setError("");
    try {
      await addUrl(sessionId, url.trim());
      setUrl("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteDocument(sessionId, id);
      onSelectDocuments(selectedIds.filter((x) => x !== id));
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = (id) =>
    onSelectDocuments(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );

  const readyDocs = documents.filter((doc) => doc.status === "ready");
  const readyCount = readyDocs.length;
  const allReadySelected =
    readyCount > 0 && readyDocs.every((doc) => selectedIds.includes(doc.id));

  const toggleAllReady = () => {
    if (allReadySelected) {
      onSelectDocuments([]);
    } else {
      onSelectDocuments(readyDocs.map((doc) => doc.id));
    }
  };

  return (
    <aside
      className={`library-panel ${
        isCanvas && expandedCanvas ? "canvas-expanded" : ""
      }`.trim()}
    >
      <div className="library-panel-heading">
        <div>
          <p className="eyebrow">YOUR KNOWLEDGE BASE</p>
          <h2>Learning library</h2>
          <p>Pick which sources guide Lumi’s answers & quizzes.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isCanvas && (
            <button
              type="button"
              className="icon-button"
              onClick={() => setExpandedCanvas((v) => !v)}
              title={expandedCanvas ? "Compact canvas" : "Expand canvas board"}
              aria-label={expandedCanvas ? "Compact canvas" : "Expand canvas board"}
            >
              {expandedCanvas ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
          )}
          <span className="doc-count">{documents.length}</span>
        </div>
      </div>

      <div className="library-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!isCanvas}
          className={!isCanvas ? "active" : ""}
          onClick={() => handleToggleCanvas(false)}
        >
          <FiLayers /> Library List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isCanvas}
          className={isCanvas ? "active" : ""}
          onClick={() => handleToggleCanvas(true)}
        >
          <FiGrid /> Source Canvas
        </button>
      </div>

      {!isCanvas && (
        <>
          <label
            className={`upload-zone ${dragging ? "dragging" : ""} ${
              busy ? "uploading" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              disabled={!sessionId || busy}
              onChange={(e) => upload(e.target.files)}
            />
            <span className="upload-illustration">
              {busy ? <FiLoader className="spin" /> : <FiUploadCloud />}
            </span>
            <strong>
              {busy
                ? "Indexing your materials…"
                : dragging
                  ? "Drop to add to your library!"
                  : "Drop your study files here"}
            </strong>
            <span>
              or <b>browse files</b> from your device
            </span>
            <small>PDF, Word, slides, notes, audio & video</small>
          </label>

          <div className="url-divider">
            <span>OR ADD A WEB / YOUTUBE LINK</span>
          </div>

          <form className="url-form" onSubmit={submitUrl}>
            <div className="url-input-wrap">
              <FiGlobe />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste article or YouTube URL…"
                disabled={!sessionId || busy}
                aria-label="Webpage or YouTube URL"
              />
            </div>
            <button
              disabled={!sessionId || busy || !url.trim()}
              type="submit"
              aria-label="Add URL"
              title="Add URL"
            >
              <FiPlus />
            </button>
          </form>
        </>
      )}

      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}

      <div className="library-list-heading">
        <span>
          {isCanvas ? "INTERACTIVE SOURCE CANVAS" : "YOUR SOURCES"} ({readyCount} READY)
        </span>
        {readyCount > 0 && (
          <button
            type="button"
            className="library-quick-select"
            onClick={toggleAllReady}
          >
            {allReadySelected ? "Clear all" : "Select all"}
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="empty-library">
          <div className="empty-library-icon">
            <FiLayers />
          </div>
          <strong>Your study canvas is empty</strong>
          <p>
            Upload a PDF, lecture recording, or link above to see your interactive knowledge nodes!
          </p>
        </div>
      ) : isCanvas ? (
        <div
          className="source-canvas"
          aria-label="Interactive canvas of available learning sources"
        >
          <div className="canvas-hub-pill">
            <FiZap />
            <span>
              Lumi Knowledge Core ·{" "}
              {selectedIds.length
                ? `${selectedIds.length} active`
                : `Using all ${readyCount} ready`}
            </span>
          </div>

          <div className="canvas-nodes-grid">
            {documents.map((doc, index) => {
              const isSelected = selectedIds.includes(doc.id);
              const isReady = doc.status === "ready";
              return (
                <article
                  key={doc.id}
                  className={`canvas-source-node node-${index % 4} ${doc.status} ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => isReady && toggle(doc.id)}
                  role={isReady ? "button" : undefined}
                  tabIndex={isReady ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isReady && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      toggle(doc.id);
                    }
                  }}
                >
                  <div className="canvas-node-top">
                    <span className="canvas-node-icon">{iconFor(doc)}</span>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(doc.id);
                      }}
                      aria-label={`Remove ${doc.name}`}
                      title="Remove source"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  <strong title={doc.name}>{doc.name}</strong>
                  <span className={`canvas-node-status ${doc.status}`}>
                    {statusLabel(doc)}
                  </span>
                  {doc.status !== "ready" && doc.status !== "failed" && (
                    <span className="processing-mini-track">
                      <i />
                    </span>
                  )}
                  {isReady && (
                    <span className="canvas-select-badge">
                      {isSelected ? "✓ Active in Study Kit" : "+ Click to connect"}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="document-list">
          {documents.map((doc) => (
            <article
              className={`document-row ${
                selectedIds.includes(doc.id) ? "selected" : ""
              }`}
              key={doc.id}
            >
              <label className="document-select">
                <input
                  aria-label={`Use ${doc.name} in chat`}
                  type="checkbox"
                  checked={selectedIds.includes(doc.id)}
                  disabled={doc.status !== "ready"}
                  onChange={() => toggle(doc.id)}
                />
                <span className="custom-check">
                  <FiCheck />
                </span>
              </label>
              <span className={`document-type-icon ${doc.status}`}>
                {iconFor(doc)}
              </span>
              <div className="document-info">
                <strong title={doc.name}>{doc.name}</strong>
                <span>{statusLabel(doc)}</span>
                {doc.status !== "ready" && doc.status !== "failed" && (
                  <span className="processing-mini-track">
                    <i />
                  </span>
                )}
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => remove(doc.id)}
                aria-label={`Remove ${doc.name}`}
                title="Remove source"
              >
                <FiTrash2 />
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="library-bottom-note">
        <span className="privacy-shield">✓</span>
        <p>
          <strong>Private session space</strong>
          <br />
          Uploaded files belong only to this temporary session. Chat history stays in your browser.
        </p>
      </div>
    </aside>
  );
}
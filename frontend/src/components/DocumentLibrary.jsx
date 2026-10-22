import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiFileText, FiGlobe, FiLoader, FiPlus, FiTrash2, FiUploadCloud, FiVideo, FiX } from "react-icons/fi";
import { addUrl, deleteDocument, listDocuments, uploadFiles } from "../services/api";

const ACCEPT = ".pdf,.docx,.txt,.md,.pptx,.mp3,.wav,.m4a,.mp4,.mov,.webm,.mpeg,.mpga,.flac,.ogg,.opus";

const iconFor = (doc) => {
  const t = `${doc.name || ""} ${doc.source_type || ""}`.toLowerCase();
  if (/youtube|video|mp4|mov|webm|audio|mp3|wav|m4a/.test(t)) return <FiVideo />;
  if (/web|url|http/.test(t)) return <FiGlobe />;
  return <FiFileText />;
};

const statusText = (doc) => {
  if (doc.status === "ready") return "Ready";
  if (doc.status === "failed") return doc.error || "Failed";
  return `${doc.status || "processing"}…`;
};

export default function DocumentLibrary({ open, onClose, sessionId, selectedIds, onSelectDocuments, onDocsChange }) {
  const [docs, setDocs] = useState([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await listDocuments(sessionId);
      const next = res.documents || [];
      setDocs(next);
      onDocsChange?.(next);
      const valid = new Set(next.filter((d) => d.status === "ready").map((d) => d.id));
      onSelectDocuments((cur) => cur.filter((id) => valid.has(id)));
    } catch (e) {
      setError(e.message);
    }
  }, [sessionId, onSelectDocuments, onDocsChange]);

  const hasPending = docs.some((d) => d.status !== "ready" && d.status !== "failed");

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!sessionId || !(open || hasPending)) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [sessionId, open, hasPending, refresh]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = (files) => {
    if (!files?.length || !sessionId) return;
    run(() => uploadFiles(sessionId, Array.from(files))).finally(() => {
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const submitUrl = (e) => {
    e.preventDefault();
    if (!url.trim() || !sessionId) return;
    run(async () => {
      await addUrl(sessionId, url.trim());
      setUrl("");
    });
  };

  const remove = async (id) => {
    try {
      await deleteDocument(sessionId, id);
      onSelectDocuments((cur) => cur.filter((x) => x !== id));
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = (id) =>
    onSelectDocuments((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Your sources</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>

        <label
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
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
          <span className="drop-icon">{busy ? <FiLoader className="spin" /> : <FiUploadCloud />}</span>
          <strong>{busy ? "Adding…" : dragging ? "Drop it!" : "Drop files or tap to browse"}</strong>
          <small>PDF, Word, slides, notes, audio, video</small>
        </label>

        <form className="url-form" onSubmit={submitUrl}>
          <FiGlobe />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a web or YouTube link"
            disabled={!sessionId || busy}
            aria-label="Web or YouTube link"
          />
          <button type="submit" className="icon-btn go" disabled={!sessionId || busy || !url.trim()} aria-label="Add link">
            <FiPlus />
          </button>
        </form>

        {error && <p className="inline-error">{error}</p>}

        <div className="doc-list">
          {docs.length === 0 ? (
            <p className="doc-empty">Nothing here yet. Add something above ☝️</p>
          ) : (
            docs.map((d) => {
              const ready = d.status === "ready";
              const on = selectedIds.includes(d.id);
              return (
                <div key={d.id} className={`doc ${on ? "on" : ""} ${d.status}`}>
                  <button type="button" className="doc-main" disabled={!ready} onClick={() => toggle(d.id)}>
                    <span className="doc-icon">{iconFor(d)}</span>
                    <span className="doc-text">
                      <strong title={d.name}>{d.name}</strong>
                      <small>{statusText(d)}</small>
                      {!ready && d.status !== "failed" && <i className="bar" />}
                    </span>
                    {ready && <span className="tick">{on && <FiCheck />}</span>}
                  </button>
                  <button type="button" className="icon-btn sm" onClick={() => remove(d.id)} aria-label={`Remove ${d.name}`}>
                    <FiTrash2 />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {docs.length > 0 && (
          <p className="drawer-note">
            {selectedIds.length
              ? `Lumi is using ${selectedIds.length} selected source${selectedIds.length > 1 ? "s" : ""}.`
              : "Nothing selected, so Lumi uses everything that's ready."}
          </p>
        )}
      </aside>
    </>
  );
}

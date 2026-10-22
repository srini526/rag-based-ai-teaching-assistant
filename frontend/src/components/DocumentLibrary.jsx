import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiFileText, FiGlobe, FiLayers, FiLoader, FiPlus, FiTrash2, FiUploadCloud, FiVideo } from "react-icons/fi";
import { addUrl, deleteDocument, listDocuments, uploadFiles } from "../services/api";

const ACCEPT = ".pdf,.docx,.txt,.md,.pptx,.mp3,.wav,.m4a,.mp4,.mov,.webm,.mpeg,.mpga,.flac,.ogg,.opus";
function iconFor(doc) { const name = `${doc.name || ""} ${doc.source_type || ""}`.toLowerCase(); if (/youtube|video|mp4|mov|webm|audio|mp3|wav|m4a/.test(name)) return <FiVideo />; if (/web|url|http/.test(name)) return <FiGlobe />; return <FiFileText />; }
function statusLabel(doc) { if (doc.status === "ready") return `${doc.chunk_count ?? 0} chunks · Ready`; if (doc.status === "failed") return doc.error || "Processing failed"; return `${doc.status || "processing"}…`; }
export default function DocumentLibrary({ sessionId, onSelectDocuments, selectedIds = [], showCanvas = false, onCanvasToggle = () => {} }) {
  const [documents, setDocuments] = useState([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const refresh = useCallback(async () => { if (!sessionId) return; try { const result = await listDocuments(sessionId); const next = result.documents || []; setDocuments(next); const valid = new Set(next.filter((doc) => doc.status === "ready").map((doc) => doc.id)); onSelectDocuments((current) => current.filter((id) => valid.has(id))); } catch (e) { setError(e.message); } }, [sessionId, onSelectDocuments]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!sessionId) return; const timer = setInterval(refresh, 2500); return () => clearInterval(timer); }, [sessionId, refresh]);
  const upload = async (files) => {
    if (!files?.length || !sessionId) return;
    setBusy(true); setError("");
    try { await uploadFiles(sessionId, Array.from(files)); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  const submitUrl = async (e) => { e.preventDefault(); if (!url.trim() || !sessionId) return; setBusy(true); setError(""); try { await addUrl(sessionId, url.trim()); setUrl(""); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const remove = async (id) => { try { await deleteDocument(sessionId, id); onSelectDocuments(selectedIds.filter((x) => x !== id)); await refresh(); } catch (e) { setError(e.message); } };
  const toggle = (id) => onSelectDocuments(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const readyCount = documents.filter((doc) => doc.status === "ready").length;
  return <aside className="library-panel">
    <div className="library-panel-heading"><div><p className="eyebrow">YOUR KNOWLEDGE BASE</p><h2>Learning library</h2><p>Pick what your companion should use.</p></div><span className="doc-count">{documents.length}</span></div>
    <div className="library-tabs"><button type="button" className={!showCanvas ? "active" : ""} onClick={() => showCanvas && onCanvasToggle()}><FiLayers /> Library</button><button type="button" className={showCanvas ? "active" : ""} onClick={() => !showCanvas && onCanvasToggle()}><FiGridIcon /> Canvas</button></div>
    {!showCanvas && <>
      <label className={`upload-zone ${dragging ? "dragging" : ""} ${busy ? "uploading" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }} onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} disabled={!sessionId || busy} onChange={(e) => upload(e.target.files)} />
        <span className="upload-illustration">{busy ? <FiLoader className="spin" /> : <FiUploadCloud />}</span><strong>{busy ? "Adding your materials…" : dragging ? "Drop to add to your library" : "Drop your files here"}</strong><span>or <b>browse files</b> to upload</span><small>PDF, Word, slides, audio & video · up to your server's limits</small>
      </label>
      <div className="url-divider"><span>OR ADD A LINK</span></div>
      <form className="url-form" onSubmit={submitUrl}><div className="url-input-wrap"><FiGlobe /><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Webpage or YouTube URL" disabled={!sessionId || busy} aria-label="Webpage or YouTube URL" /></div><button disabled={!sessionId || busy || !url.trim()} type="submit" aria-label="Add URL"><FiPlus /></button></form>
    </>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="library-list-heading"><span>{showCanvas ? "SOURCE CANVAS" : "YOUR SOURCES"}</span><span>{readyCount} ready</span></div>
    {documents.length === 0 ? <div className="empty-library"><div className="empty-library-icon"><FiLayers /></div><strong>Your library starts here</strong><p>Add a lecture or document and it will show up here.</p></div> : showCanvas ? <div className="source-canvas" aria-label="Canvas of available learning sources"><div className="canvas-grid-decoration" />{documents.map((doc, index) => <article key={doc.id} className={`canvas-source-node node-${index % 4} ${doc.status}`}><span className="canvas-node-icon">{iconFor(doc)}</span><strong title={doc.name}>{doc.name}</strong><span className={`canvas-node-status ${doc.status}`}>{doc.status === "ready" ? "Ready to explore" : statusLabel(doc)}</span>{doc.status === "ready" && <label className="canvas-select"><input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggle(doc.id)} /><span>{selectedIds.includes(doc.id) ? "Selected" : "Use this source"}</span></label>}</article>)}</div> : <div className="document-list">{documents.map((doc) => <article className={`document-row ${selectedIds.includes(doc.id) ? "selected" : ""}`} key={doc.id}><label className="document-select"><input aria-label={`Use ${doc.name} in chat`} type="checkbox" checked={selectedIds.includes(doc.id)} disabled={doc.status !== "ready"} onChange={() => toggle(doc.id)} /><span className="custom-check"><FiCheck /></span></label><span className={`document-type-icon ${doc.status}`}>{iconFor(doc)}</span><div className="document-info"><strong title={doc.name}>{doc.name}</strong><span>{statusLabel(doc)}</span>{doc.status !== "ready" && doc.status !== "failed" && <span className="processing-mini-track"><i /></span>}</div><button className="icon-button" type="button" onClick={() => remove(doc.id)} aria-label={`Remove ${doc.name}`} title="Remove source"><FiTrash2 /></button></article>)}</div>}
    <div className="library-bottom-note"><span className="privacy-shield">✓</span><p><strong>Private study space</strong><br />Files are scoped to this temporary session. Chat history stays in this browser.</p></div>
  </aside>;
}
function FiGridIcon() { return <span className="tab-grid-icon" aria-hidden="true">⠿</span>; }

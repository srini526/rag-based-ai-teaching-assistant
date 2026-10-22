"""Production-oriented Flask API with temporary sessions and bounded background jobs."""
from __future__ import annotations
import os, io, json, uuid, time, threading, logging, secrets
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify, Response, stream_with_context
from werkzeug.exceptions import HTTPException
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import (ALLOWED_ORIGINS, MAX_UPLOAD_MB, MAX_FILES_PER_UPLOAD, MAX_SESSIONS, SESSION_TTL_SECONDS,
                    MAX_SESSION_SECONDS, MAX_CONCURRENT_JOBS, MAX_ACTIVE_JOBS_PER_SESSION, CHUNK_SIZE, CHUNK_OVERLAP)
from ingestion import extract_file, extract_url, IngestionError
from embedding import create_embedding
from rag import answer, answer_stream, study_prompt

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("rag-assistant")
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024 * MAX_FILES_PER_UPLOAD + 1024 * 1024

allowed_origins = ALLOWED_ORIGINS

if isinstance(allowed_origins, str):
    allowed_origins = [
        origin.strip()
        for origin in allowed_origins.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = list(allowed_origins or [])

frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

CORS(app, resources={
    r"/api/*": {"origins": allowed_origins},
    r"/health": {"origins": allowed_origins}
})
SESSIONS = {}
JOBS = {}
LOCK = threading.RLock()
EXECUTOR = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS, thread_name_prefix="ingestion")

class ApiError(Exception):
    def __init__(self, code, message, status=400): self.code, self.message, self.status = code, message, status

def now(): return time.time()
def utc(): return datetime.now(timezone.utc).isoformat()
def public_error(code, message, status): return jsonify({"error":{"code":code,"message":message}}), status

def cleanup_expired():
    current = now()
    with LOCK:
        expired = [sid for sid,s in SESSIONS.items() if current-s["last_active"] > SESSION_TTL_SECONDS or current-s["created_at"] > MAX_SESSION_SECONDS]
        for sid in expired: SESSIONS.pop(sid, None)
        for jid,j in list(JOBS.items()):
            if current-j["created_at"] > MAX_SESSION_SECONDS * 2: JOBS.pop(jid, None)

def get_session(sid):
    cleanup_expired()
    with LOCK:
        s = SESSIONS.get(sid)
        if not s: raise ApiError("SESSION_NOT_FOUND", "This session has expired. Create a new learning session.", 404)
        s["last_active"] = now()
        return s

def split_chunks(text):
    text = text.strip()
    chunks, start = [], 0
    while start < len(text):
        end = min(len(text), start + CHUNK_SIZE)
        if end < len(text):
            boundary = max(text.rfind("\n", start, end), text.rfind(". ", start, end), text.rfind(" ", start, end))
            if boundary > start + CHUNK_SIZE // 2: end = boundary + 1
        piece = text[start:end].strip()
        if piece: chunks.append(piece)
        if end >= len(text): break
        start = max(start + 1, end - CHUNK_OVERLAP)
    return chunks

def index_document(session_id, doc_id, extract_fn):
    try:
        with LOCK:
            session = SESSIONS.get(session_id)
            if not session: return
            doc = session["documents"].get(doc_id)
            if not doc: return
            doc["status"] = "processing"
            doc["updated_at"] = utc()
        text, source_type, extra = extract_fn()
        pieces = split_chunks(text)
        vectors = create_embedding(pieces)
        chunks = []
        for i,(piece,vector) in enumerate(zip(pieces, vectors)):
            location = None
            # Keep parser-provided page/slide/timestamp tags as provenance in chunk text and metadata.
            import re
            match = re.search(r"\[(Page|Slide|Timestamp) ([^\]]+)\]", piece)
            if match:
                kind, value = match.group(1).lower(), match.group(2)
                location = f"{kind.title()} {value}"
            chunks.append({"id":str(uuid.uuid4()),"document_id":doc_id,"source_name":extra.get("title") or doc["name"],"source_type":source_type,"text":piece,"chunk_index":i,"embedding":vector,"location":location, **extra})
        with LOCK:
            session = SESSIONS.get(session_id)
            if not session or doc_id not in session["documents"]: return
            session["documents"][doc_id].update({"status":"ready","source_type":source_type,"url":extra.get("url", session["documents"][doc_id].get("url")),"name":extra.get("title", session["documents"][doc_id].get("name")),"chunks":chunks,"chunk_count":len(chunks),"updated_at":utc(),"error":None})
            JOBS[doc["job_id"]].update({"status":"completed","progress":100,"message":"Document indexed successfully.","updated_at":utc()})
    except Exception as exc:
        safe_message = str(exc) if isinstance(exc, IngestionError) else "Processing failed. Check provider configuration, file validity, and server logs."
        logger.warning("Ingestion failed for document %s: %s", doc_id, type(exc).__name__)
        with LOCK:
            session = SESSIONS.get(session_id)
            if session and doc_id in session["documents"]:
                session["documents"][doc_id].update({"status":"failed","error":safe_message,"updated_at":utc()})
            job_id = None
            if session and doc_id in session["documents"]: job_id = session["documents"][doc_id].get("job_id")
            if job_id and job_id in JOBS: JOBS[job_id].update({"status":"failed","progress":100,"message":safe_message,"updated_at":utc()})

def enqueue(session_id, name, source_type, extract_fn, url=None):
    session = get_session(session_id)
    with LOCK:
        active = [d for d in session["documents"].values() if d.get("status") in {"queued","processing"}]
        global_active = [j for j in JOBS.values() if j.get("status") in {"queued","processing"}]
        if len(active) >= MAX_ACTIVE_JOBS_PER_SESSION: raise ApiError("SESSION_JOB_LIMIT", "This session has reached its ingestion job limit. Wait for processing to finish.", 429)
        if len(global_active) >= MAX_CONCURRENT_JOBS * 3: raise ApiError("JOB_CAPACITY", "The ingestion queue is full. Try again after current jobs finish.", 429)
        doc_id, job_id = str(uuid.uuid4()), str(uuid.uuid4())
        doc = {"id":doc_id,"name":name,"source_type":source_type,"url":url,"status":"queued","created_at":utc(),"updated_at":utc(),"chunks":[],"chunk_count":0,"error":None,"job_id":job_id}
        session["documents"][doc_id] = doc
        JOBS[job_id] = {"id":job_id,"session_id":session_id,"document_id":doc_id,"status":"queued","progress":0,"message":"Waiting for an ingestion worker.","created_at":now(),"updated_at":utc()}
    def runner():
        with LOCK:
            if job_id in JOBS: JOBS[job_id].update({"status":"processing","progress":5,"message":"Extracting content.","updated_at":utc()})
        index_document(session_id, doc_id, extract_fn)
    EXECUTOR.submit(runner)
    return {"document_id":doc_id,"job_id":job_id,"status":"queued"}

def doc_public(d):
    return {k:d.get(k) for k in ("id","name","source_type","url","status","created_at","updated_at","chunk_count","error")}

@app.errorhandler(ApiError)
def handle_api_error(exc): return public_error(exc.code, exc.message, exc.status)
@app.errorhandler(413)
def too_large(_): return public_error("PAYLOAD_TOO_LARGE", f"Upload request exceeds the configured limit ({MAX_UPLOAD_MB} MB per file; bounded total request).", 413)
@app.errorhandler(Exception)
def unexpected(exc):
    if isinstance(exc, HTTPException):
        return public_error(f"HTTP_{exc.code}", exc.description or "Request failed.", exc.code or 500)
    if isinstance(exc, (KeyboardInterrupt, SystemExit)): raise exc
    logger.exception("Unhandled API exception")
    return public_error("INTERNAL_ERROR", "The request failed unexpectedly. Try again or check service configuration.", 500)

@app.get("/")
def home(): return jsonify({"service":"RAG AI Teaching Assistant API","status":"running","api_version":"v1"})
@app.get("/health")
def health(): return jsonify({"status":"ok","time":utc()})
@app.get("/api/v1/health/ready")
def readiness():
    from config import GROQ_API_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
    missing = [name for name,value in (("GROQ_API_KEY",GROQ_API_KEY),("CLOUDFLARE_ACCOUNT_ID",CLOUDFLARE_ACCOUNT_ID),("CLOUDFLARE_API_TOKEN",CLOUDFLARE_API_TOKEN)) if not value]
    return jsonify({"ready":not missing,"missing_configuration":missing}), (503 if missing else 200)

@app.post("/api/v1/sessions")
def create_session():
    cleanup_expired()
    with LOCK:
        if len(SESSIONS) >= MAX_SESSIONS: raise ApiError("SESSION_CAPACITY", "The service is at temporary session capacity. Try again later.", 429)
        sid = secrets.token_urlsafe(32)
        SESSIONS[sid] = {"id":sid,"created_at":now(),"last_active":now(),"documents":{}}
    return jsonify({"session_id":sid,"expires_in_seconds":SESSION_TTL_SECONDS}), 201

@app.post("/api/v1/sessions/<sid>/documents")
def upload_documents(sid):
    get_session(sid)
    files = request.files.getlist("files") or ([request.files["file"]] if "file" in request.files else [])
    if not files: raise ApiError("NO_FILES", "Attach at least one file using the files field.")
    if len(files) > MAX_FILES_PER_UPLOAD: raise ApiError("TOO_MANY_FILES", f"Upload at most {MAX_FILES_PER_UPLOAD} files per request.")
    accepted=[]
    for f in files:
        name=secure_filename(f.filename or "")
        if not name: raise ApiError("INVALID_FILENAME", "Every file must have a valid filename.")
        data=f.read(MAX_UPLOAD_MB*1024*1024+1)
        if len(data)>MAX_UPLOAD_MB*1024*1024: raise ApiError("FILE_TOO_LARGE", f"{name} exceeds the {MAX_UPLOAD_MB} MB limit.", 413)
        # Bytes remain in closure until the background job extracts the file.
        accepted.append(enqueue(sid,name,"file",lambda data=data,name=name: (*extract_file(data,name), {})))
    return jsonify({"documents":accepted}), 202

@app.post("/api/v1/sessions/<sid>/urls")
def add_url(sid):
    body=request.get_json(silent=True) or {}; url=str(body.get("url","")).strip()
    if not url: raise ApiError("URL_REQUIRED", "Provide a public URL.")
    from urllib.parse import urlparse
    hostname=urlparse(url).hostname or "web-page"
    # URL is fetched only inside the worker; title metadata is returned from extraction.
    def extract():
        text,title,final_url=extract_url(url)
        return text,"web",{"url":final_url,"title":title}
    result=enqueue(sid,hostname,"web",extract,url=url)
    return jsonify(result),202

@app.get("/api/v1/sessions/<sid>/documents")
def list_documents(sid):
    session=get_session(sid)
    return jsonify({"documents":[doc_public(d) for d in session["documents"].values()]})

@app.get("/api/v1/sessions/<sid>/jobs/<job_id>")
def job_status(sid,job_id):
    get_session(sid)
    with LOCK: job=JOBS.get(job_id)
    if not job or job["session_id"] != sid: raise ApiError("JOB_NOT_FOUND", "Job not found for this session.",404)
    return jsonify({k:v for k,v in job.items() if k != "session_id" and k != "created_at"} | {"created_at":datetime.fromtimestamp(job["created_at"],timezone.utc).isoformat()})

@app.delete("/api/v1/sessions/<sid>/documents/<doc_id>")
def delete_document(sid,doc_id):
    session=get_session(sid)
    with LOCK:
        if doc_id not in session["documents"]: raise ApiError("DOCUMENT_NOT_FOUND", "Document not found.",404)
        doc=session["documents"].pop(doc_id)
        if doc.get("job_id"): JOBS.pop(doc["job_id"],None)
    return jsonify({"deleted":True,"document_id":doc_id})

@app.post("/api/v1/sessions/<sid>/chat/stream")
def chat_stream(sid):
    session=get_session(sid); body=request.get_json(silent=True) or {}
    question=body.get("question")
    if not isinstance(question,str) or not question.strip() or len(question)>4000: raise ApiError("INVALID_QUESTION", "Question must contain 1–4000 characters.")
    history=body.get("history",[])
    if not isinstance(history,list): raise ApiError("INVALID_HISTORY", "History must be a list.")
    history=[{"role":m.get("role"),"content":str(m.get("content",""))[:2000]} for m in history[-8:] if isinstance(m,dict) and m.get("role") in {"user","assistant"}]
    ids=body.get("document_ids")
    if ids is not None and (not isinstance(ids,list) or any(not isinstance(x,str) for x in ids)): raise ApiError("INVALID_DOCUMENT_IDS", "document_ids must be a list of document IDs.")
    if ids and any(x not in session["documents"] for x in ids): raise ApiError("DOCUMENT_SCOPE_ERROR", "A selected document does not belong to this session.",403)
    stream,sources=answer_stream(question.strip(),session,history,ids)
    def generate_events():
        try:
            for token in stream: yield "data: "+json.dumps({"type":"token","text":token})+"\n\n"
            yield "data: "+json.dumps({"type":"sources","sources":sources})+"\n\n"
            yield "data: "+json.dumps({"type":"done"})+"\n\n"
        except Exception:
            logger.exception("Streaming generation failed")
            yield "data: "+json.dumps({"type":"error","code":"GENERATION_FAILED","message":"Answer generation failed. Check provider configuration and try again."})+"\n\n"
    return Response(stream_with_context(generate_events()),mimetype="text/event-stream",headers={"Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"})

@app.post("/api/v1/sessions/<sid>/summaries")
def summary(sid):
    session=get_session(sid); body=request.get_json(silent=True) or {}
    ids=body.get("document_ids")
    if ids and any(x not in session["documents"] for x in ids): raise ApiError("DOCUMENT_SCOPE_ERROR", "A selected document does not belong to this session.",403)
    return jsonify({"summary":study_prompt("summary",session,ids)})

@app.post("/api/v1/sessions/<sid>/quizzes")
def quiz(sid):
    session=get_session(sid); body=request.get_json(silent=True) or {}; ids=body.get("document_ids")
    try: count=max(1,min(20,int(body.get("count",8))))
    except (ValueError,TypeError): count=8
    if ids and any(x not in session["documents"] for x in ids): raise ApiError("DOCUMENT_SCOPE_ERROR", "A selected document does not belong to this session.",403)
    raw=study_prompt("quiz",session,ids,count)
    try:
        start=raw.find("["); end=raw.rfind("]")
        questions=json.loads(raw[start:end+1])
        if not isinstance(questions,list): raise ValueError()
        questions=questions[:count]
    except Exception: raise ApiError("INVALID_QUIZ_RESPONSE", "The model did not return a valid quiz. Please retry.",502)
    return jsonify({"questions":questions})

@app.delete("/api/v1/sessions/<sid>")
def delete_session(sid):
    with LOCK:
        if sid not in SESSIONS: raise ApiError("SESSION_NOT_FOUND", "This session has expired.",404)
        SESSIONS.pop(sid,None)
        for jid,job in list(JOBS.items()):
            if job.get("session_id")==sid: JOBS.pop(jid,None)
    return jsonify({"deleted":True})

# Compatibility endpoints for the original UI. They require an existing temporary session for the new ingestion workflow.
@app.post("/chat")
def legacy_chat():
    body=request.get_json(silent=True) or {}; question=str(body.get("question","")).strip()
    if not question: raise ApiError("INVALID_QUESTION", "Question cannot be empty.")
    return jsonify({"question":question,"answer":"The legacy fixed-index endpoint is disabled in production. Create a session and upload learning material first.","sources":[]}),410

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=int(os.getenv("PORT","5000")),debug=False,threaded=True)

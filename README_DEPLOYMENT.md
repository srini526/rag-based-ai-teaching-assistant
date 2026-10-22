# RAG-Based AI Teaching Assistant — upgraded deployment

## What changed
- React UI now includes a document library, public URL ingestion, session-scoped source selection, summaries, quizzes, and Markdown export.
- Flask API supports temporary sessions, bounded in-process background ingestion jobs, status polling, document deletion, streaming answers, and session cleanup.
- Input formats: PDF, DOCX, TXT, MD, PPTX, MP3, WAV, M4A, MP4, MOV, WEBM, MPEG/MPGA, and public HTML URLs.
- Embeddings use Cloudflare Workers AI (`@cf/baai/bge-m3`); answer generation and Whisper transcription both use Groq. Media is sent to Groq Whisper; no local Whisper model or PyTorch download is required.
- No database or persistent disk is used in v1. Server memory and temporary files are ephemeral.

## Local setup
1. Install FFmpeg (including `ffprobe`) if audio/video uploads are needed. **Whisper runs through Groq's API; Whisper/PyTorch are not installed or run locally.**
   - Windows: install FFmpeg and add its `bin` directory to `PATH`.
   - macOS: `brew install ffmpeg`.
   - Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y ffmpeg`.
2. Create a virtual environment and install `Backend/requirements.txt`.
3. Copy `Backend/.env.example` to `Backend/.env` and set a real `GROQ_API_KEY`. This key alone is sufficient for the standalone transcription smoke test. Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` before running the full RAG app. Do not commit `.env`.
4. From `Backend`, test transcription independently before starting the app: `python test_transcription.py path/to/short-audio.mp3`. Use a supported audio/video file up to 25 MB for the initial smoke test.
5. Run the API from `Backend`: `python app.py`.
6. In `frontend`, run `npm ci`, create `.env.local` with `VITE_API_BASE_URL=http://127.0.0.1:5000`, then `npm run dev`.
7. Open the Vite URL shown in the terminal, upload a short audio/video file, wait for its background job to finish, and ask a question about its transcript.

## Render deployment
This repository includes `render.yaml`. Create the services from the Blueprint, then set these values in the Render dashboard:
- Backend: `GROQ_API_KEY` (used for both Groq LLM generation and Groq Whisper transcription), `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
- Backend: `FRONTEND_ORIGIN` and `ALLOWED_ORIGINS` to the exact HTTPS URL of the deployed frontend (no trailing slash). `ALLOWED_ORIGINS` can be comma-separated.
- Frontend: `VITE_API_BASE_URL` to the backend's HTTPS base URL, e.g. `https://your-api.onrender.com`.

Keep one Gunicorn worker because active sessions and indexes are process-local. The bounded thread pool uses in-process memory and is not durable: a restart clears active sessions and can interrupt queued jobs. A free Render instance may sleep, restart, or be resource-constrained; media transcription depends on Groq API availability and local FFmpeg for duration checks/video audio extraction.

## API flow
1. `POST /api/v1/sessions` → `{session_id}`.
2. `POST /api/v1/sessions/{session_id}/documents` with multipart `files` field, or `POST /api/v1/sessions/{session_id}/urls` with `{"url":"https://..."}`.
3. Poll `GET /api/v1/sessions/{session_id}/documents` and `GET /api/v1/sessions/{session_id}/jobs/{job_id}` until status is `ready` or `failed`.
4. `POST /api/v1/sessions/{session_id}/chat/stream` with `question`, optional `history`, and optional `document_ids`.
5. Use `POST .../summaries`, `POST .../quizzes`, document DELETE, or session DELETE as needed.

## Limits and known limitations
- Defaults: 25 MB/file, up to 5 files/request, media duration up to 15 minutes, 200,000 extracted characters/document, 5 retrieved chunks, 60-minute inactivity expiry, 4-hour maximum session age.
- OCR for scanned PDFs is not enabled.
- Web ingestion accepts public HTML only and intentionally does not follow redirects. Dynamic pages, login-gated pages, and video-platform URL extraction are not supported.
- There is no durable job queue, database, account system, or cross-device history. Browser history is stored in `localStorage` and should not be used for sensitive content on shared devices.
- In-process session IDs are unguessable but are not a substitute for authentication. This is a portfolio/demo deployment, not a multi-tenant production service without further access-control and persistence work.
- Validate Cloudflare model availability and account limits before deployment. Provider calls require internet access and valid credentials. Groq Whisper accepts supported audio/video formats; this project limits uploads to 25 MB and does not implement chunking for larger media.

## Verification
Run `python -m compileall Backend` for Python syntax checks and `npm ci && npm run build` in `frontend` before deploying. Configure secrets in Render; never commit actual credentials.

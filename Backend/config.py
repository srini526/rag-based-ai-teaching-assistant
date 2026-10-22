"""Central configuration for the RAG Teaching Assistant."""
import os
from dotenv import load_dotenv

load_dotenv()

def _int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.getenv(name, str(default))))
    except (TypeError, ValueError):
        return default

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "@cf/baai/bge-m3")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
MAX_UPLOAD_MB = _int("MAX_UPLOAD_MB", 25)
MAX_FILES_PER_UPLOAD = _int("MAX_FILES_PER_UPLOAD", 5)
MAX_MEDIA_SECONDS = _int("MAX_MEDIA_SECONDS", 900)
MAX_EXTRACTED_CHARS = _int("MAX_EXTRACTED_CHARS", 200_000)
SESSION_TTL_SECONDS = _int("SESSION_TTL_SECONDS", 3600)
MAX_SESSION_SECONDS = _int("MAX_SESSION_SECONDS", 14400)
MAX_SESSIONS = _int("MAX_SESSIONS", 30)
MAX_CONCURRENT_JOBS = _int("MAX_CONCURRENT_JOBS", 2)
MAX_ACTIVE_JOBS_PER_SESSION = _int("MAX_ACTIVE_JOBS_PER_SESSION", 5)
TOP_K = _int("TOP_K", 5)
CHUNK_SIZE = _int("CHUNK_SIZE", 3200)  # characters, approx. 800 tokens
CHUNK_OVERLAP = _int("CHUNK_OVERLAP", 480)
ALLOWED_ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", FRONTEND_ORIGIN).split(",") if x.strip()]

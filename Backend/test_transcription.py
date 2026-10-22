"""Local smoke test for Groq-hosted Whisper transcription.

Usage (from Backend):
    python test_transcription.py path/to/audio.mp3
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from groq import APIStatusError

load_dotenv(Path(__file__).resolve().parent / ".env")

SUPPORTED = {".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm"}


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python test_transcription.py <path-to-audio-or-video-file>")
        return 2
    path = Path(sys.argv[1]).expanduser().resolve()
    if not path.is_file():
        print(f"File not found: {path}")
        return 2
    if path.suffix.lower() not in SUPPORTED:
        print(f"Unsupported Groq transcription format: {path.suffix}")
        return 2
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > 25:
        print(f"File is {size_mb:.1f} MB; keep this local smoke test at or below 25 MB.")
        return 2
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or api_key == "replace-me":
        print("GROQ_API_KEY is missing. Add your real key to Backend/.env.")
        return 2

    from groq import Groq
    model = os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")
    print(f"Transcribing {path.name} ({size_mb:.1f} MB) with {model}...")
    try:
        client = Groq(api_key=api_key, timeout=90.0, max_retries=2)
        with path.open("rb") as media:
            result = client.audio.transcriptions.create(
                file=(path.name, media.read()),
                model=model,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                temperature=0.0,
            )
        print("\n--- Transcript ---")
        segments = getattr(result, "segments", None) or []
        if segments:
            for segment in segments:
                start = float(getattr(segment, "start", 0) or 0)
                end = float(getattr(segment, "end", 0) or 0)
                text = str(getattr(segment, "text", "") or "").strip()
                if text:
                    print(f"[{start:06.2f}s - {end:06.2f}s] {text}")
        else:
            print(getattr(result, "text", "") or "(No transcript text returned)")
        print("\nGroq Whisper smoke test completed.")
        return 0
    # except Exception as exc:
    #     print(f"Transcription failed ({type(exc).__name__}). Check the API key, model, account limits, network, and file format.")
    #     return 1
    except APIStatusError as e:
        print(f"HTTP status: {e.status_code}")
        print(f"API error: {e.message}")
        raise
    except Exception as e:
        print(f"Error type: {type(e).__name__}")
        print(f"Error details: {e}")
        raise
    


if __name__ == "__main__":
    raise SystemExit(main())

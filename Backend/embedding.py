"""Cloudflare Workers AI embedding client (BGE-M3)."""
import time
import requests
from config import CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, EMBEDDING_MODEL

class EmbeddingError(RuntimeError):
    pass

def create_embedding(text_list):
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise EmbeddingError("Embeddings are not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.")
    if not text_list:
        return []
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{EMBEDDING_MODEL}"
    headers = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}", "Content-Type": "application/json"}
    results = []
    # Keep batches bounded to avoid provider payload limits.
    for offset in range(0, len(text_list), 16):
        batch = text_list[offset:offset + 16]
        last_error = None
        for attempt in range(3):
            try:
                response = requests.post(url, headers=headers, json={"text": batch}, timeout=(10, 60))
                if response.status_code == 429 or response.status_code >= 500:
                    response.raise_for_status()
                response.raise_for_status()
                payload = response.json()
                data = payload.get("result", {})
                vectors = data.get("data") or data.get("embeddings")
                if vectors and isinstance(vectors[0], dict):
                    vectors = [v.get("embedding") for v in vectors]
                if not vectors or len(vectors) != len(batch):
                    raise EmbeddingError("Cloudflare returned an unexpected embedding response.")
                results.extend(vectors)
                last_error = None
                break
            except (requests.RequestException, ValueError, EmbeddingError) as exc:
                last_error = exc
                if attempt < 2:
                    time.sleep(0.5 * (attempt + 1))
        if last_error:
            raise EmbeddingError("Embedding provider request failed. Check Cloudflare credentials, model availability, and rate limits.") from last_error
    return results

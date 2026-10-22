export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Request failed (${response.status}).`);
  return payload;
}

export const createSession = () => request("/api/v1/sessions", { method: "POST" });
export const listDocuments = (sid) => request(`/api/v1/sessions/${encodeURIComponent(sid)}/documents`);
export const deleteDocument = (sid, id) => request(`/api/v1/sessions/${encodeURIComponent(sid)}/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
export const deleteSession = (sid) => request(`/api/v1/sessions/${encodeURIComponent(sid)}`, { method: "DELETE" });
export const addUrl = (sid, url) => request(`/api/v1/sessions/${encodeURIComponent(sid)}/urls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });

export async function uploadFiles(sid, files) {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return request(`/api/v1/sessions/${encodeURIComponent(sid)}/documents`, { method: "POST", body: form });
}

export async function getJob(sid, id) {
  return request(`/api/v1/sessions/${encodeURIComponent(sid)}/jobs/${encodeURIComponent(id)}`);
}

export async function streamChat(sid, body, onToken, onSources, onError, signal) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sid)}/chat/stream`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error?.message || `Chat request failed (${response.status}).`);
    }
    if (!response.body) throw new Error("Streaming is not supported by this response.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const eventData = JSON.parse(dataLine.slice(5).trim());
        if (eventData.type === "token") onToken(eventData.text || "");
        else if (eventData.type === "sources") onSources(eventData.sources || []);
        else if (eventData.type === "error") throw new Error(eventData.message || "Generation failed.");
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") onError(error);
    else onError(new Error("Generation stopped."));
  }
}

export async function makeSummary(sid, documentIds = []) {
  return request(`/api/v1/sessions/${encodeURIComponent(sid)}/summaries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_ids: documentIds }) });
}
export async function makeQuiz(sid, documentIds = [], count = 8) {
  return request(`/api/v1/sessions/${encodeURIComponent(sid)}/quizzes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_ids: documentIds, count }) });
}

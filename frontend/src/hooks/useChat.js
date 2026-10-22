import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSession, streamChat } from "../services/api";

const HISTORY_KEY = "ragTeachingAssistant.chats.v2";
function safeLoad() {
  try { const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(value) ? value.slice(0, 30) : []; }
  catch { return []; }
}

export default function useChat() {
  const [chatHistory, setChatHistory] = useState(safeLoad);
  const [currentChatId, setCurrentChatId] = useState(() => safeLoad()[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionError, setSessionError] = useState("");
  const controllerRef = useRef(null);
  const currentChat = useMemo(() => chatHistory.find((chat) => chat.id === currentChatId) || null, [chatHistory, currentChatId]);

  useEffect(() => {
    let active = true;
    createSession().then((result) => { if (active) setSessionId(result.session_id); })
      .catch((error) => { if (active) setSessionError(error.message || "Could not create a learning session."); });
    return () => { active = false; controllerRef.current?.abort(); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory.slice(0, 30))); } catch { /* Storage can be disabled or full. */ }
  }, [chatHistory]);

  const newChat = useCallback(() => {
    const id = crypto.randomUUID();
    setChatHistory((prev) => [{ id, title: "New chat", messages: [], createdAt: Date.now() }, ...prev].slice(0, 30));
    setCurrentChatId(id);
  }, []);
  const deleteChat = useCallback((id) => {
    setChatHistory((prev) => prev.filter((chat) => chat.id !== id));
    setCurrentChatId((current) => current === id ? (chatHistory.find((chat) => chat.id !== id)?.id || null) : current);
  }, [chatHistory]);
  const clearHistory = useCallback(() => { setChatHistory([]); setCurrentChatId(null); }, []);

  const sendMessage = useCallback(async (question, documentIds = []) => {
    if (!question.trim() || loading || !sessionId) return;
    let chatId = currentChatId;
    if (!chatId) {
      chatId = crypto.randomUUID();
      setCurrentChatId(chatId);
      setChatHistory((prev) => [{ id: chatId, title: question.slice(0, 48), messages: [], createdAt: Date.now() }, ...prev].slice(0, 30));
    }
    const previous = chatHistory.find((chat) => chat.id === chatId)?.messages || [];
    const userMessage = { id: crypto.randomUUID(), sender: "user", message: question, createdAt: Date.now() };
    const assistantMessage = { id: crypto.randomUUID(), sender: "bot", message: "", sources: [], createdAt: Date.now() };
    setChatHistory((prev) => {
      const found = prev.some((chat) => chat.id === chatId);
      const base = found ? prev : [{ id: chatId, title: question.slice(0, 48), messages: [], createdAt: Date.now() }, ...prev];
      return base.map((chat) => chat.id === chatId ? { ...chat, title: chat.title === "New chat" ? question.slice(0, 48) : chat.title, messages: [...chat.messages, userMessage, assistantMessage] } : chat);
    });
    setLoading(true);
    const history = [...previous, userMessage].slice(-8).map((msg) => ({ role: msg.sender === "user" ? "user" : "assistant", content: msg.message }));
    let streamedText = "";
    const updateAssistant = (patch) => setChatHistory((prev) => prev.map((chat) => chat.id === chatId ? { ...chat, messages: chat.messages.map((msg) => msg.id === assistantMessage.id ? { ...msg, message: streamedText, ...patch } : msg) } : chat));
    const controller = new AbortController(); controllerRef.current = controller;
    await streamChat(sessionId, { question, history, document_ids: documentIds },
      (token) => { streamedText += token; updateAssistant({}); },
      (sources) => updateAssistant({ sources }),
      (error) => { updateAssistant({ message: streamedText || `Unable to answer: ${error.message}`, error: true }); setLoading(false); },
      controller.signal,
    );
    setLoading(false);
  }, [chatHistory, currentChatId, loading, sessionId]);

  const stopGeneration = useCallback(() => controllerRef.current?.abort(), []);
  return { chatHistory, currentChat, currentChatId, setCurrentChatId, newChat, deleteChat, clearHistory, sendMessage, loading, stopGeneration, sessionId, sessionError };
}

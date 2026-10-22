# RAG-Based AI Teaching Assistant

This project has been upgraded from a fixed video-transcript retriever to a session-based, multi-format RAG application.

**Stack:** React + Vite, Flask, Groq, Cloudflare Workers AI BGE-M3, optional LangChain-compatible document processing, and a bounded in-process ingestion worker pool.

For local setup, Render deployment instructions, API endpoints, limitations, and verification steps, see [README_DEPLOYMENT.md](README_DEPLOYMENT.md).

> Important: v1 uses ephemeral server memory and browser-local chat history. Active files, indexes, and jobs may be lost on service restart. This is a deployable portfolio/demo baseline, not yet a durable multi-tenant production system.

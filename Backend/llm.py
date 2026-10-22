"""Groq client with explicit configuration and provider error handling."""
from groq import Groq
from config import GROQ_API_KEY, LLM_MODEL

class LLMConfigurationError(RuntimeError): pass

def _client():
    if not GROQ_API_KEY: raise LLMConfigurationError("LLM is not configured. Set GROQ_API_KEY in the backend environment.")
    return Groq(api_key=GROQ_API_KEY, timeout=90, max_retries=1)

def generate(prompt):
    response = _client().chat.completions.create(model=LLM_MODEL, messages=[{"role":"user","content":prompt}], temperature=0.2)
    return response.choices[0].message.content or "I could not generate an answer from the available material."

def generate_stream(prompt):
    stream = _client().chat.completions.create(model=LLM_MODEL, messages=[{"role":"user","content":prompt}], temperature=0.2, stream=True)
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content

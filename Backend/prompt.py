def format_time(seconds):
    """
    Convert seconds to MM:SS or HH:MM:SS format.
    """
    seconds = int(seconds)

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours:02}:{minutes:02}:{secs:02}"

    return f"{minutes:02}:{secs:02}"


def build_prompt(question, retrieved_chunks, history=None):
    """
    Build a prompt using:
    1. Previous conversation
    2. Retrieved RAG context
    3. Current user question
    """

    if history is None:
        history = []

    # ==========================
    # Conversation History
    # ==========================
    conversation = ""

    if history:
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            conversation += f"{role}: {msg['content']}\n"

    else:
        conversation = "No previous conversation.\n"

    # ==========================
    # Retrieved Context
    # ==========================
    context = ""

    for _, row in retrieved_chunks.iterrows():
        context += f"""
Video Number : {row['number']}
Video Title  : {row['title']}
Timestamp    : {format_time(row['start'])} - {format_time(row['end'])}

Transcript:
{row['text']}

------------------------------------------------------------
"""

    # ==========================
    # Final Prompt
    # ==========================
    prompt = f"""
You are an expert AI Teaching Assistant.

Your job is to help students understand concepts clearly using ONLY the learning material provided below.

===========================================================
PREVIOUS CONVERSATION
===========================================================

{conversation}

===========================================================
LEARNING MATERIAL
===========================================================

{context}

===========================================================
CURRENT QUESTION
===========================================================

{question}

===========================================================
INSTRUCTIONS
===========================================================

1. Continue the conversation naturally.
2. Use previous conversation to understand follow-up questions.
3. If the student says:
   - "another example"
   - "explain again"
   - "why?"
   - "how?"
   - "compare them"
   - "what about this?"
   infer what they are referring to using the conversation history.

4. Answer ONLY using the learning material.
5. Explain concepts in simple language.
6. Do NOT copy the transcript word-for-word.
7. Combine information from multiple retrieved chunks whenever appropriate.
8. Recommend the most relevant video and timestamp.
9. NEVER invent timestamps or videos.
10. If the answer is not available in the learning material, politely say so.
11. Never mention "retrieved context", "provided context", or "conversation history".

===========================================================
RESPONSE FORMAT
===========================================================

Answer:
<Your explanation>

Recommended Video:
<Video Number> - <Video Title>

Timestamp:
<Start Time> - <End Time>

"""

    return prompt
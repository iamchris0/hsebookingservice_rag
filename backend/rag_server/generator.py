"""
Calls Ollama /api/chat to generate an answer given retrieved context.
"""

import httpx
from config import settings

SYSTEM_PROMPT = """Ты — помощник для студентов и преподавателей НИУ ВШЭ.
Отвечай ТОЛЬКО на основе предоставленных фрагментов документов.
Если ответа в документах нет — честно скажи об этом.
Пиши грамотно, на русском языке, без орфографических ошибок.
Не придумывай информацию, которой нет в источниках.
Форматируй ответ в Markdown: используй заголовки, списки и выделение там, где это уместно.
Никогда не оборачивай весь ответ в блок ```markdown``` или ``` — пиши Markdown напрямую."""


async def generate_answer(
    question: str,
    context_chunks: list[str],
    history: list[dict],
) -> str:
    context_text = "\n\n---\n\n".join(context_chunks)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # Include the last few turns of conversation history for context
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": (
            f"Фрагменты документов:\n\n{context_text}\n\n"
            f"Вопрос: {question}"
        ),
    })

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "stream": False,
                "options": {
                    "num_predict": settings.ollama_num_predict,
                    "temperature": 0.2,
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"].strip()

FROM python:3.11-slim
WORKDIR /app

COPY rag_server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY rag_server/ .
COPY knowledge_base/ ./knowledge_base/

ENV KNOWLEDGE_BASE_DIR=/app/knowledge_base

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]

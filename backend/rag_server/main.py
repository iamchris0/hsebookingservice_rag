import asyncio
import asyncpg
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from config import settings
from loader import load_chunks
from index import VectorIndex
from generator import generate_answer


# ── Shared state ──────────────────────────────────────────────────────────────

vector_index = VectorIndex(settings.embedding_model)
db_pool: asyncpg.Pool | None = None


# ── Startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool

    # 1. Load and index knowledge base
    chunks = load_chunks(settings.knowledge_base_dir)
    if not chunks:
        raise RuntimeError(f"No chunks loaded from {settings.knowledge_base_dir}")
    print(f"[startup] Loaded {len(chunks)} chunks from knowledge base")
    await asyncio.get_event_loop().run_in_executor(None, vector_index.build, chunks)

    # 2. Connect to PostgreSQL
    db_pool = await asyncpg.create_pool(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        database=settings.db_name,
        min_size=2,
        max_size=10,
    )
    print("[startup] PostgreSQL pool ready")

    yield

    await db_pool.close()
    print("[shutdown] PostgreSQL pool closed")


app = FastAPI(title="RAG Server", lifespan=lifespan)


# ── Schemas ───────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    conversation_id: str          # UUID stored in PostgreSQL


class QueryResponse(BaseModel):
    answer: str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")

    # 1. Retrieve relevant chunks
    hits = vector_index.query(req.question, top_k=settings.retrieval_top_k)
    context_chunks = [chunk.text for chunk, _score in hits]

    # 2. Load recent conversation history from DB (last 10 messages)
    history: list[dict] = []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content
            FROM dc_new.chat_messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            LIMIT 10
            """,
            req.conversation_id,
        )
        history = [{"role": r["role"], "content": r["content"]} for r in rows]

    # 3. Generate answer via Ollama
    answer = await generate_answer(req.question, context_chunks, history)

    return QueryResponse(answer=answer)


@app.get("/health")
async def health():
    return {"ok": True, "chunks": len(vector_index._chunks)}

"""
In-memory vector index built at startup.
Uses sentence-transformers to embed all chunks once,
then does cosine similarity search at query time.
"""

import numpy as np
from sentence_transformers import SentenceTransformer

from loader import Chunk


class VectorIndex:
    def __init__(self, model_name: str):
        print(f"[index] Loading embedding model: {model_name}")
        self._model = SentenceTransformer(model_name)
        self._chunks: list[Chunk] = []
        self._matrix: np.ndarray | None = None  # shape (N, D), float32, L2-normalised

    def build(self, chunks: list[Chunk]) -> None:
        print(f"[index] Embedding {len(chunks)} chunks...")
        self._chunks = chunks
        texts = [c.text for c in chunks]
        embeddings = self._model.encode(texts, batch_size=32, show_progress_bar=True,
                                         normalize_embeddings=True)
        self._matrix = embeddings.astype(np.float32)
        print(f"[index] Index ready. Shape: {self._matrix.shape}")

    def query(self, question: str, top_k: int = 5) -> list[tuple[Chunk, float]]:
        if self._matrix is None:
            raise RuntimeError("Index not built yet")
        q_vec = self._model.encode([question], normalize_embeddings=True).astype(np.float32)
        scores = (self._matrix @ q_vec.T).squeeze()          # cosine similarity
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [(self._chunks[i], float(scores[i])) for i in top_indices]

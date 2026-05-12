from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    db_host: str
    db_port: int = 25432
    db_user: str
    db_password: str
    db_name: str

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    embedding_model: str = "paraphrase-multilingual-mpnet-base-v2"

    knowledge_base_dir: Path = Path(__file__).parent.parent / "knowledge_base"

    # How many chunks to pass to the LLM as context
    retrieval_top_k: int = 5

    # Max tokens Ollama generates
    ollama_num_predict: int = 1024

    rag_server_port: int = 8001
    rag_server_host: str = "0.0.0.0"

    class Config:
        env_file = Path(__file__).parent / ".env"
        env_file_encoding = "utf-8"


settings = Settings()

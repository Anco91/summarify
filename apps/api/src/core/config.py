from functools import lru_cache

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Chargees depuis .env automatiquement
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    # Virgule-séparé : "https://app.vercel.app,http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    WHISPER_MODEL: str = "base"
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_CONCURRENT_TRANSCRIPTIONS: int = 1

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def llm_backend(self) -> str:
        if self.OPENAI_API_KEY:
            return "openai"
        if self.GROQ_API_KEY:
            return "groq"
        return "none"

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")


# lru_cache : l'objet Settings n'est cree qu'une seule fois
@lru_cache
def get_settings() -> Settings:
    return Settings()

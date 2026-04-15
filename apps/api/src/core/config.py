from functools import lru_cache
from typing import Any

from pydantic import ConfigDict
from pydantic_settings import (
    BaseSettings,
    EnvSettingsSource,
    PydanticBaseSettingsSource,
)


class _FlexEnvSource(EnvSettingsSource):
    """Accepts plain strings or comma-separated values for list[str] fields.

    pydantic-settings calls decode_complex_value (which does json.loads) before
    any model validator runs, so we must intercept here.
    """

    def decode_complex_value(self, field_name: str, field: Any, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped and not stripped.startswith(("[", "{")):
                return [item.strip() for item in stripped.split(",") if item.strip()]
        return super().decode_complex_value(field_name, field, value)


class Settings(BaseSettings):
    # Chargees depuis .env automatiquement
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    WHISPER_MODEL: str = "base"
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_CONCURRENT_TRANSCRIPTIONS: int = 1

    @property
    def llm_backend(self) -> str:
        if self.OPENAI_API_KEY:
            return "openai"
        if self.GROQ_API_KEY:
            return "groq"
        return "none"

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        **kwargs: Any,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            _FlexEnvSource(settings_cls),
            *kwargs.values(),
        )


# lru_cache : l'objet Settings n'est cree qu'une seule fois
@lru_cache
def get_settings() -> Settings:
    return Settings()

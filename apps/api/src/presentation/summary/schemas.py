from pydantic import BaseModel, Field


class SummarizeRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=10,
        max_length=50_000,
        description="Texte complet à résumer",
    )


class SummarizeResponse(BaseModel):
    summary: str
    model: str  # indique quel LLM a été utilisé

from pydantic import BaseModel


class UploadResponse(BaseModel):
    session_id: str


class ErrorResponse(BaseModel):
    detail: str

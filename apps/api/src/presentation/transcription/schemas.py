from pydantic import BaseModel


class UploadResponse(BaseModel):
    job_id: str


class ErrorResponse(BaseModel):
    detail: str

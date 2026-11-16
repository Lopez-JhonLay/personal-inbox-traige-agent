from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal[
    "Work", "Personal", "Finance", "Meetings", "Notifications", "Promotions", "Newsletters", "Other"
]
Priority = Literal["High", "Medium", "Low"]
AnalysisStatus = Literal["pending", "processing", "completed", "failed"]


class EmailQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    priority: Priority | None = None
    category: Category | None = None
    analysis_status: AnalysisStatus | None = None


class PageQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    force: bool = False


class SyncResult(BaseModel):
    imported: int = 0
    existing: int = 0
    failed: int = 0
    deferred: int = 0
    pending_email_ids: list[str] = Field(default_factory=list)
    errors: list[dict[str, str]] = Field(default_factory=list)

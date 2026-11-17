import re
from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.schemas.email_schema import PageQuery

ActionStatus = Literal["pending", "in_progress", "completed", "dismissed"]


class CreateActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email_id: UUID
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
    ]
    due_date: date | None = None

    @field_validator("due_date", mode="before")
    @classmethod
    def date_only(cls, value: object) -> object:
        if value is None or type(value) is date:
            return value
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("Use a date in YYYY-MM-DD format.")
        return value


class UpdateActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ActionStatus


class ActionQuery(PageQuery):
    status: ActionStatus | None = None
    email_id: UUID | None = None

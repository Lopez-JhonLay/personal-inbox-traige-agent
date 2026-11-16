from datetime import date
from typing import Annotated, Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

ShortText = Annotated[str, Field(min_length=1, max_length=2000)]


class EmailInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    subject: str = Field(max_length=500)
    sender: str | None = Field(default=None, max_length=320)
    body: str = Field(min_length=1, max_length=20_000)
    received_at: AwareDatetime
    timezone: str = Field(min_length=1, max_length=100)

    @field_validator("body")
    @classmethod
    def require_body(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Email body cannot be blank.")
        return value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Use a valid IANA timezone.") from error
        return value


class EmailAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    summary: Annotated[str, Field(min_length=1, max_length=500)]
    category: Literal[
        "Work",
        "Personal",
        "Finance",
        "Meetings",
        "Notifications",
        "Promotions",
        "Newsletters",
        "Other",
    ]
    priority: Literal["High", "Medium", "Low"]
    deadline: date | None
    deadline_text: Annotated[str, Field(min_length=1, max_length=500)] | None
    requested_action: ShortText | None
    suggested_action: ShortText | None
    reply_needed: bool
    draft_reply: Annotated[str, Field(min_length=1, max_length=4000)] | None

    @field_validator(
        "summary", "deadline_text", "requested_action", "suggested_action", "draft_reply"
    )
    @classmethod
    def reject_blank_text(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Use null instead of blank text.")
        return value

    @model_validator(mode="after")
    def check_relationships(self) -> Self:
        if not self.reply_needed and self.draft_reply is not None:
            raise ValueError("A message that needs no reply must not have a draft.")
        if self.deadline is not None and self.deadline_text is None:
            raise ValueError("An extracted date requires source deadline text.")
        return self

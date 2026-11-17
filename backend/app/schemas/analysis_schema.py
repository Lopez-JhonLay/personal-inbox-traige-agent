import re
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


class AnalysisFields(BaseModel):
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

    @field_validator("summary", "deadline_text", "requested_action", "suggested_action")
    @classmethod
    def reject_blank_text(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Use null instead of blank text.")
        return value

    @model_validator(mode="after")
    def require_deadline_source(self) -> Self:
        if self.deadline is not None and self.deadline_text is None:
            raise ValueError("An extracted date requires source deadline text.")
        return self


class ReplyDraft(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    greeting: str = Field(
        min_length=1, max_length=200, description="Greeting only, e.g. Hello Maya,"
    )
    body: str = Field(min_length=1, max_length=3500, description="Only the contextual reply body.")
    closing: Literal["Best regards,", "Kind regards,", "Regards,", "Sincerely,"]

    @field_validator("greeting", "body")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.replace("\r\n", "\n").strip()
        if not value:
            raise ValueError("Reply sections cannot be blank.")
        return value

    @field_validator("greeting")
    @classmethod
    def require_greeting(cls, value: str) -> str:
        if not re.fullmatch(r"(?:Hello|Hi|Dear)(?: [^,\n\[\]]+)?,", value, re.I):
            raise ValueError("Use a greeting without placeholders or a signature.")
        return value

    def as_text(self) -> str:
        return f"{self.greeting}\n\n{self.body}\n\n{self.closing}"


class ProviderEmailAnalysis(AnalysisFields):
    draft_reply: ReplyDraft | None


class EmailAnalysis(AnalysisFields):
    # Public API and persistence retain the existing plain-text representation.
    draft_reply: Annotated[str, Field(min_length=1, max_length=4000)] | None

    @field_validator("draft_reply")
    @classmethod
    def require_complete_reply(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.replace("\r\n", "\n").strip()
        if not value:
            raise ValueError("Use null instead of blank text.")
        lines = value.splitlines()
        greeting = re.fullmatch(r"(?:Hello|Hi|Dear)(?: [^,\n\[\]]+)?,", lines[0].strip(), re.I)
        closing = lines[-1].strip().casefold().rstrip(",")
        body = "\n".join(lines[1:-1]).strip()
        if (
            len(lines) < 3
            or not greeting
            or closing not in {"best regards", "kind regards", "regards", "sincerely"}
            or not body
        ):
            raise ValueError("A reply requires a greeting, body, and professional closing.")
        # Provider whitespace varies; format existing content without inventing any text.
        return f"{lines[0].strip()}\n\n{body}\n\n{lines[-1].strip()}"

    @model_validator(mode="after")
    def check_relationships(self) -> Self:
        if not self.reply_needed and self.draft_reply is not None:
            raise ValueError("A message that needs no reply must not have a draft.")
        return self

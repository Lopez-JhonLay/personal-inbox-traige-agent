from dataclasses import dataclass


@dataclass
class IntegrationError(Exception):
    code: str
    message: str
    status: int = 503

    def __str__(self) -> str:
        return self.code

import time

from app.services.integration_errors import IntegrationError


def remaining_time(deadline: float | None, maximum: float = 15) -> float:
    if deadline is None:
        return maximum
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise IntegrationError(
            "SYNC_TIME_BUDGET", "Sync paused. Run Sync Inbox again to continue.", 409
        )
    return min(remaining, maximum)

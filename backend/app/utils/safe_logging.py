import logging
import re


class OAuthLogFilter(logging.Filter):
    """Strip sensitive OAuth callback queries before Werkzeug handlers format them."""

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        if "/auth/google/callback" in message:
            record.msg = re.sub(r"(/(?:api/)?auth/google/callback)\?[^\s\"]*", r"\1", message)
            record.args = ()
        return True


def install_oauth_log_filter() -> None:
    logger = logging.getLogger("werkzeug")
    if not any(isinstance(item, OAuthLogFilter) for item in logger.filters):
        logger.addFilter(OAuthLogFilter())

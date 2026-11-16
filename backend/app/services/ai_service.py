from openai import OpenAI

from app.config import Settings


def create_openrouter_client(settings: Settings) -> OpenAI:
    if not settings.openrouter_api_key:
        raise ValueError("Set OPENROUTER_API_KEY before creating the OpenRouter client.")
    return OpenAI(
        api_key=settings.openrouter_api_key.get_secret_value(),
        base_url=settings.openrouter_base_url,
        timeout=30.0,
        max_retries=2,
    )

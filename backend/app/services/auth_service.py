from google_auth_oauthlib.flow import Flow

from app.config import Settings

GMAIL_SCOPES = ("https://www.googleapis.com/auth/gmail.readonly",)


def create_google_oauth_flow(settings: Settings) -> Flow:
    if not settings.google_client_id or not settings.google_client_secret:
        raise ValueError(
            "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before creating OAuth flow."
        )
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret.get_secret_value(),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=GMAIL_SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )

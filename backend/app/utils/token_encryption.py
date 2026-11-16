from cryptography.fernet import Fernet, InvalidToken

from app.config import Settings
from app.services.integration_errors import IntegrationError


def token_cipher(settings: Settings) -> Fernet:
    try:
        if not settings.token_encryption_key:
            raise ValueError()
        return Fernet(settings.token_encryption_key.get_secret_value())
    except ValueError, TypeError:
        raise IntegrationError(
            "AUTH_NOT_CONFIGURED", "Gmail connection is not configured."
        ) from None


def encrypt_token(settings: Settings, token: str) -> str:
    return token_cipher(settings).encrypt(token.encode()).decode()


def decrypt_token(settings: Settings, ciphertext: str) -> str:
    try:
        return token_cipher(settings).decrypt(ciphertext.encode()).decode()
    except InvalidToken, UnicodeError:
        raise IntegrationError(
            "CREDENTIALS_UNREADABLE", "Stored credentials could not be read. Reconnect Gmail.", 409
        ) from None

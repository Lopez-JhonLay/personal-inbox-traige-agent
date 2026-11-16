"""Explicit live Gmail read check. Never writes messages or sends them to AI."""

import argparse
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings  # noqa: E402
from app.database import create_database  # noqa: E402
from app.services.auth_service import auth_configured, credentials_for_user  # noqa: E402
from app.services.gmail_service import create_gmail_client, get_message, list_message_ids  # noqa: E402
from app.services.integration_errors import IntegrationError  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user-id", type=UUID, required=True, help="ID from /api/auth/status")
    args = parser.parse_args()
    settings = Settings()
    if not auth_configured(settings):
        print("Configure Google OAuth, database, session, and token encryption settings first.")
        return 1
    database = create_database(settings.database_url.get_secret_value())
    try:
        credentials = credentials_for_user(settings, database, args.user_id)
        client = create_gmail_client(credentials)
        try:
            ids = list_message_ids(client, limit=1)
            message = get_message(client, ids[0]) if ids else None
            print(
                {
                    "success": True,
                    "messages_read": len(ids),
                    "body_characters": len(message.body) if message else 0,
                }
            )
        finally:
            client.close()
    except IntegrationError as error:
        print({"success": False, "error": error.code})
        return 1
    except Exception:
        print({"success": False, "error": "CHECK_FAILED"})
        return 1
    finally:
        database.engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

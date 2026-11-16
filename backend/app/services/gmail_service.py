from google.oauth2.credentials import Credentials
from googleapiclient.discovery import Resource, build


def create_gmail_client(credentials: Credentials) -> Resource:
    # Bundled discovery avoids a network call while constructing the client.
    return build(
        "gmail", "v1", credentials=credentials, cache_discovery=False, static_discovery=True
    )

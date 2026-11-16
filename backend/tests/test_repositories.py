from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import ActionItem, Email, EmailAnalysisRecord, GmailConnection, User
from app.repositories import action_repository as actions
from app.repositories import analysis_repository as analyses
from app.repositories import email_repository as emails
from app.repositories import gmail_connection_repository as connections
from app.repositories import user_repository as users
from app.schemas.analysis_schema import EmailAnalysis

pytestmark = pytest.mark.database

type Sample = tuple[User, GmailConnection, Email]


@pytest.fixture
def sample(db_session: Session) -> Sample:
    user = users.create_user(db_session, email=f"phase3-{uuid4()}@example.invalid")
    connection = connections.save_connection(
        db_session, user.id, gmail_address=user.email, scopes=["gmail.readonly"], status="connected"
    )
    email = emails.save_email(
        db_session,
        user.id,
        gmail_connection_id=connection.id,
        gmail_message_id="synthetic-message",
        gmail_thread_id="synthetic-thread",
        subject="Synthetic test",
        body="Please review the fictional document.",
        received_at=datetime.now(UTC),
    )
    return user, connection, email


def test_profiles_connections_and_duplicate_messages(db_session: Session, sample: Sample) -> None:
    user, connection, email = sample
    assert users.get_user_by_email(db_session, user.email.upper()).id == user.id
    users.update_profile(db_session, user.id, display_name="Synthetic", timezone="UTC")
    assert users.get_user(db_session, user.id).timezone == "UTC"
    duplicate = emails.save_email(
        db_session,
        user.id,
        gmail_connection_id=connection.id,
        gmail_message_id=email.gmail_message_id,
        gmail_thread_id=email.gmail_thread_id,
        body="This must not overwrite the original.",
    )
    assert duplicate.id == email.id
    assert duplicate.body == email.body
    assert emails.list_emails(db_session, user.id) == [email]
    assert emails.list_emails(db_session, user.id, offset=1) == []
    connections.save_connection(
        db_session,
        user.id,
        gmail_address=user.email,
        scopes=[],
        status="connected",
        encrypted_refresh_token="synthetic-ciphertext",
    )
    assert connections.get_connection(db_session, user.id).id == connection.id
    connections.disconnect_connection(db_session, user.id)
    assert connection.encrypted_refresh_token is None
    assert connection.status == "disconnected"
    assert emails.get_email(db_session, user.id, email.id) is email


def test_cross_user_reads_and_writes_are_rejected(db_session: Session, sample: Sample) -> None:
    user, connection, email = sample
    other = users.create_user(db_session, email=f"phase3-{uuid4()}@example.invalid")
    analysis = analyses.create_analysis(db_session, user.id, email.id, model_identifier="synthetic")
    action = actions.create_action(db_session, user.id, email.id, description="Review sample")
    assert emails.get_email(db_session, other.id, email.id) is None
    assert emails.list_emails(db_session, other.id) == []
    assert analyses.get_analysis(db_session, other.id, analysis.id) is None
    assert analyses.latest_completed_analysis(db_session, other.id, email.id) is None
    assert actions.list_actions(db_session, other.id) == []
    assert actions.update_action_status(db_session, other.id, action.id, status="completed") is None
    assert analyses.update_analysis(db_session, other.id, analysis.id, status="processing") is None
    with pytest.raises(LookupError):
        actions.create_action(db_session, other.id, email.id, description="Forbidden")
    with pytest.raises(LookupError):
        analyses.create_analysis(db_session, other.id, email.id, model_identifier="synthetic")
    with pytest.raises(LookupError):
        emails.save_email(
            db_session,
            other.id,
            gmail_connection_id=connection.id,
            gmail_message_id="forbidden",
            gmail_thread_id="forbidden",
        )


def test_analysis_history_and_latest_success(db_session: Session, sample: Sample) -> None:
    user, _, email = sample
    result = EmailAnalysis(
        summary="Review the sample document.",
        category="Work",
        priority="Low",
        deadline=None,
        deadline_text=None,
        requested_action="Review the document.",
        suggested_action=None,
        reply_needed=False,
        draft_reply=None,
    )
    records = []
    for index, status in enumerate(("completed", "completed", "failed", "processing")):
        record = analyses.create_analysis(
            db_session, user.id, email.id, model_identifier="synthetic"
        )
        record.created_at = datetime.now(UTC) + timedelta(seconds=index)
        analyses.update_analysis(
            db_session,
            user.id,
            record.id,
            status=status,
            result=result if status == "completed" else None,
            error_code="SYNTHETIC_FAILURE" if status == "failed" else None,
        )
        records.append(record)
    latest = analyses.latest_completed_analysis(db_session, user.id, email.id)
    assert latest.id == records[1].id
    assert latest.summary == result.summary
    assert len(email.analyses) == 4
    with pytest.raises(ValueError):
        analyses.update_analysis(db_session, user.id, latest.id, status="processing")


def test_action_status_and_validation(db_session: Session, sample: Sample) -> None:
    user, _, email = sample
    action = actions.create_action(db_session, user.id, email.id, description="Review sample")
    assert action.status == "pending"
    assert actions.list_actions(db_session, user.id, status="pending") == [action]
    for status in ("in_progress", "completed", "dismissed"):
        assert actions.update_action_status(db_session, user.id, action.id, status=status) is action
        assert action.status == status
    with pytest.raises(ValueError):
        actions.update_action_status(db_session, user.id, action.id, status="invalid")
    with pytest.raises(ValueError):
        analyses.update_analysis(db_session, user.id, uuid4(), status="completed")
    with pytest.raises(ValueError):
        actions.create_action(db_session, user.id, email.id, description=" ")
    with pytest.raises(ValueError):
        emails.list_emails(db_session, user.id, limit=0)


def test_unique_constraints_and_savepoint_rollback(db_session: Session, sample: Sample) -> None:
    user, connection, email = sample
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(User(email=user.email))
        db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(
            GmailConnection(
                user_id=user.id, gmail_address=user.email, scopes=[], status="connected"
            )
        )
        db_session.flush()
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.add(
            Email(
                gmail_connection_id=connection.id,
                gmail_message_id=email.gmail_message_id,
                gmail_thread_id="duplicate",
            )
        )
        db_session.flush()
    address = f"phase3-rollback-{uuid4()}@example.invalid"
    with pytest.raises(RuntimeError), db_session.begin_nested():
        users.create_user(db_session, email=address)
        raise RuntimeError("Simulated service failure")
    assert users.get_user_by_email(db_session, address) is None
    # A service commit releases only a savepoint inside the fixture's outer transaction.
    db_session.commit()
    assert users.get_user(db_session, user.id) is not None


def test_delete_cascades(db_session: Session, sample: Sample) -> None:
    user, connection, email = sample
    record = analyses.create_analysis(db_session, user.id, email.id, model_identifier="synthetic")
    action = actions.create_action(db_session, user.id, email.id, description="Synthetic")
    ids = user.id, connection.id, email.id, record.id, action.id
    db_session.delete(user)
    db_session.flush()
    db_session.expire_all()
    for model, record_id in zip(
        (User, GmailConnection, Email, EmailAnalysisRecord, ActionItem), ids, strict=True
    ):
        assert db_session.scalar(select(model).where(model.id == record_id)) is None


def test_credential_updates_cannot_restore_disconnected_account(
    db_session: Session, sample: Sample
) -> None:
    user, _, email = sample
    connections.save_connection(
        db_session,
        user.id,
        gmail_address=user.email,
        scopes=[],
        status="connected",
        encrypted_refresh_token="synthetic-old-ciphertext",
    )
    assert connections.update_credentials_if_current(
        db_session,
        user.id,
        previous_ciphertext="synthetic-old-ciphertext",
        status="connected",
        encrypted_refresh_token="synthetic-new-ciphertext",
    )
    assert not connections.update_credentials_if_current(
        db_session,
        user.id,
        previous_ciphertext="synthetic-old-ciphertext",
        status="connected",
        encrypted_refresh_token="stale-write",
    )
    connections.disconnect_connection(db_session, user.id)
    assert not connections.update_credentials_if_current(
        db_session,
        user.id,
        previous_ciphertext="synthetic-new-ciphertext",
        status="connected",
        encrypted_refresh_token="late-write",
    )
    connection = connections.get_connection(db_session, user.id)
    assert connection.status == "disconnected"
    assert connection.encrypted_refresh_token is None
    assert emails.get_email(db_session, user.id, email.id) is not None

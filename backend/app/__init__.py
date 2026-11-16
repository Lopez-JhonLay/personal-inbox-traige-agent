from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from app.config import Settings
from app.database import create_database
from app.errors import handle_http_error
from app.routes.analysis import analysis_bp
from app.routes.health import health_bp


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings if settings is not None else Settings()
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=settings.secret_key.get_secret_value() if settings.secret_key else None,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=settings.session_cookie_secure,
    )
    app.extensions["settings"] = settings
    app.extensions["database"] = (
        create_database(settings.database_url.get_secret_value()) if settings.database_url else None
    )
    CORS(
        app, resources={r"/api/*": {"origins": [settings.frontend_url]}}, supports_credentials=True
    )
    app.register_blueprint(health_bp, url_prefix="/api")
    if settings.enable_dev_analysis:
        app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_error_handler(HTTPException, handle_http_error)
    return app

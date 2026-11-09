"""Flask Payments Microservice - FinancEZ Delivery 2"""

import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_babel import Babel
from flask_cors import CORS

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
babel = Babel()


def create_app():
    """Application factory."""
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    # Configuration
    app.config.from_object(config)

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    babel.init_app(app)

    # Register blueprints
    register_public_routes(app)

    return app


# Configuration class
class config:
    """Configuration read from environment variables."""

    SECRET_KEY = os.getenv('SECRET_KEY', 'change-this-to-a-secret-key')

    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://payments_user:payments_pass@payments-db:5432/payments')
    SQLALCHEMY_DATABASE_URI = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://')

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-this-to-a-super-secret-jwt-key')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    INTERNAL_SERVICE_TOKEN = os.getenv('INTERNAL_SERVICE_TOKEN', 'change-this-to-internal-token')

    # Premium pricing
    PREMIUM_PRICE = float(os.getenv('PREMIUM_PRICE', '9.99'))
    PREMIUM_PERIOD_DAYS = int(os.getenv('PREMIUM_PERIOD_DAYS', '30'))

    # i18n
    BABEL_DEFAULT_LOCALE = 'es'
    LANGUAGES = {'es': 'Spanish', 'en': 'English'}


# Register public routes
def register_public_routes(app):
    """Register public routes (no auth prefix)."""

    @app.route('/api/v1/public/health', methods=['GET'])
    def public_health():
        """Public health check endpoint."""
        return jsonify({'status': 'ok', 'service': 'payments'})

    @app.route('/health', methods=['GET'])
    def health():
        """Health check endpoint (used by compose)."""
        return jsonify({'status': 'healthy', 'service': 'payments'})
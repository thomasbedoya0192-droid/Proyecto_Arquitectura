from datetime import timedelta

from flask_babel import Babel, _ngettext, _l
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
babel = Babel()


def init_app(app):
    """Initialize extensions with application context."""
    db.init_app(app)
    migrate.init_app(app, db)
    babel.init_app(app)
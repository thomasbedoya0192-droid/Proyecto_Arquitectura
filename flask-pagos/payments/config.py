import os


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
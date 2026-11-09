from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Entitlement(db.Model):
    """User entitlement/subscription status."""
    __tablename__ = 'entitlements'

    user_id = db.Column(db.String, primary_key=True)
    plan = db.Column(db.String, nullable=False, default='free')
    valid_until = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String, nullable=False, default='active')
    updated_at = db.Column(db.DateTime, default=db.func.now())

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'plan': self.plan,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'status': self.status
        }


class Subscription(db.Model):
    """Subscription plan model."""
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, nullable=False)
    plan_type = db.Column(db.String, nullable=False, default='free')
    status = db.Column(db.String, nullable=False, default='active')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    canceled_at = db.Column(db.DateTime, nullable=True)
    payment_id = db.Column(db.String, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan_type': self.plan_type,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'canceled_at': self.canceled_at.isoformat() if self.canceled_at else None,
            'payment_id': self.payment_id,
        }


class Payment(db.Model):
    """Payment record model."""
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String, default='USD')
    status = db.Column(db.String, nullable=False, default='pending')
    payment_method = db.Column(db.String, nullable=True)
    transaction_id = db.Column(db.String, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status,
            'payment_method': self.payment_method,
            'transaction_id': self.transaction_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
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
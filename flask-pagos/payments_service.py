"""
Flask Payments Service - Microservice for handling payments, webhooks, and entitlements.
This service is extracted from the Django monolith using the Strangler Pattern.

Endpoints:
- GET /health: Health check
- POST /api/payments/checkout: Create checkout session
- POST /api/payments/webhook: Handle payment webhooks
- GET /api/payments/subscription/<user_id>: Check subscription status
- GET /api/v1/public/stats: System statistics (public endpoint)
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token
from dotenv import load_dotenv

load_dotenv()

# Initialize app
app = Flask(__name__)
CORS(app, supports_credentials=True)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'change-this-to-a-secret-key')
app.config['SQLALCHEMY_DATABASE_URL'] = os.getenv(
    'payments_dATABASE_URL',
    'postgresql://payments_user:payments_pass@payments-db:5432/payments'
)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'change-this-to-a-super-secret-jwt-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_IN', '1200'))

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)


# Models
class Entitlement(db.Model):
    """User entitlement/subscription status."""
    __tablename__ = 'entitlements'
    
    user_id = db.Column(db.String, primary_key=True)
    plan = db.Column(db.String, nullable=False, default='free')
    valid_until = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String, nullable=False, default='active')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'plan': self.plan,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'status': self.status
        }


class ProcessedWebhook(db.Model):
    """Track processed webhooks for idempotency."""
    __tablename__ = 'processed_webhooks'
    
    event_id = db.Column(db.String, primary_key=True)
    event_type = db.Column(db.String, nullable=False)
    processed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'event_id': self.event_id,
            'event_type': self.event_type,
            'processed_at': self.processed_at.isoformat()
        }


# Routes

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'payments'})


@app.route('/api/payments/checkout', methods=['POST'])
@jwt_required()
def checkout():
    """Create checkout session for payment."""
    user_id = get_jwt_identity()
    
    data = request.get_json()
    plan = data.get('plan', 'monthly')
    amount = Decimal(data.get('amount', '10.00'))
    
    # Check existing entitlement
    entitlement = Entitlement.query.filter_by(user_id=user_id).first()
    
    return jsonify({
        'user_id': user_id,
        'plan': plan,
        'amount': float(amount),
        'checkout_url': f'https://checkout.example.com/session?user={user_id}&plan={plan}',
        'expires_at': (datetime.utcnow() + timedelta(hours=24)).isoformat()
    })


@app.route('/api/payments/webhook', methods=['POST'])
def webhook():
    """Handle payment webhooks with idempotency verification."""
    data = request.get_json()
    event_id = data.get('event_id')
    event_type = data.get('event_type')
    
    # Idempotency check: don't process if already handled
    existing = ProcessedWebhook.query.filter_by(event_id=event_id).first()
    if existing:
        return jsonify({'status': 'already_processed', 'event_id': event_id}), 200
    
    # Process the webhook based on event type
    if event_type == 'payment_confirmed':
        # Activate entitlement for the user
        user_id = data.get('user_id')
        valid_until = datetime.utcnow() + timedelta(days=30)
        
        entitlement, created = Entitlement.get_or_create(
            user_id=user_id,
            defaults={
                'plan': 'monthly',
                'valid_until': valid_until,
                'status': 'active'
            }
        )
        if not created:
            entitlement.plan = 'monthly'
            entitlement.valid_until = valid_until
            entitlement.status = 'active'
            entitlement.updated_at = datetime.utcnow()
        
        db.session.add(entitlement)
    
    elif event_type == 'subscription_cancelled':
        # Deactivate entitlement
        user_id = data.get('user_id')
        entitlement = Entitlement.query.filter_by(user_id=user_id).first()
        if entitlement:
            entitlement.status = 'cancelled'
            entitlement.updated_at = datetime.utcnow()
            db.session.add(entitlement)
    
    # Record that we processed this webhook
    processed = ProcessedWebhook(
        event_id=event_id,
        event_type=event_type
    )
    db.session.add(processed)
    db.session.commit()
    
    return jsonify({'status': 'processed', 'event_id': event_id}), 200


@app.route('/api/payments/subscription/<user_id>', methods=['GET'])
@jwt_required()
def subscription_status(user_id):
    """Check user's subscription/entitlement status."""
    entitlement = Entitlement.query.filter_by(user_id=user_id).first()
    
    if entitlement:
        return jsonify({
            'user_id': user_id,
            'plan': entitlement.plan,
            'valid_until': entitlement.valid_until.isoformat() if entitlement.valid_until else None,
            'status': entitlement.status
        })
    else:
        return jsonify({
            'user_id': user_id,
            'plan': 'free',
            'valid_until': None,
            'status': 'inactive'
        })


@app.route('/api/v1/public/stats', methods=['GET'])
def public_stats():
    """Public endpoint with aggregated, anonymized system data.
    
    This is the "service to provide" as defined in the project requirements.
    Returns system-wide statistics that are safe to expose publicly.
    """
    from sqlalchemy import func
    
    # Count users with entitlements
    total_users_with_entitlement = db.session.query(func.count(Entitlement.user_id)).scalar() or 0
    active_users = db.session.query(func.count(Entitlement.user_id)).filter(
        Entitlement.status == 'active'
    ).scalar() or 0
    
    # Total payments processed
    total_webhooks = db.session.query(func.count(ProcessedWebhook.event_id)).scalar() or 0
    
    return jsonify({
        'total_active_users': active_users,
        'total_users_with_entitlement': total_users_with_entitlement,
        'total_payments_processed': total_webhooks,
        'service': 'payments',
        'timestamp': datetime.utcnow().isoformat()
    })


# Create database tables
with app.app_context():
    db.create_all()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
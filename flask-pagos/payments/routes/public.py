from flask import jsonify, request
from datetime import datetime, timedelta


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

    @app.route('/api/v1/public/entitlements/<user_id>', methods=['GET'])
    def get_entitlement(user_id):
        """Check user premium entitlement status."""
        from payments.models import Entitlement
        from payments.extensions import db

        entitlement = Entitlement.query.get(user_id)
        if entitlement:
            return jsonify({'status': 'ok', 'entitlement': entitlement.to_dict()})
        return jsonify({'status': 'not_found', 'entitlement': None}), 404

    @app.route('/api/v1/public/payment/process', methods=['POST'])
    def process_payment():
        """Process a payment for premium upgrade."""
        from payments.models import db, Subscription, Payment
        from payments.extensions import app

        data = request.get_json()
        user_id = data.get('user_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method')

        if not user_id or not amount:
            return jsonify({'status': 'error', 'message': 'user_id and amount required'}), 400

        # Create payment record
        payment = Payment(
            user_id=user_id,
            amount=amount,
            payment_method=payment_method,
            status='processing'
        )
        db.session.add(payment)
        db.session.commit()

        # Create/subscribe entitlement
        entitlement = Entitlement.query.get(user_id)
        if entitlement:
            entitlement.plan = 'premium'
            entitlement.valid_until = datetime.utcnow() + timedelta(days=app.config.get('PREMIUM_PERIOD_DAYS', 30))
            entitlement.status = 'active'
        else:
            entitlement = Entitlement(
                user_id=user_id,
                plan='premium',
                valid_until=datetime.utcnow() + timedelta(days=app.config.get('PREMIUM_PERIOD_DAYS', 30)),
                status='active'
            )
            db.session.add(entitlement)

        # Create active subscription
        subscription = Subscription.query.filter_by(user_id=user_id).first()
        if subscription:
            subscription.plan_type = 'premium'
            subscription.status = 'active'
            subscription.canceled_at = None
        else:
            subscription = Subscription(
                user_id=user_id,
                plan_type='premium',
                status='active',
                started_at=datetime.utcnow()
            )
            db.session.add(subscription)

        db.session.commit()

        return jsonify({
            'status': 'ok',
            'payment': payment.to_dict(),
            'entitlement': entitlement.to_dict(),
            'subscription': subscription.to_dict()
        })
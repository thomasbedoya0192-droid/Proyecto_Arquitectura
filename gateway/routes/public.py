from flask import jsonify

def register_public_routes(app):
    """Register public routes (no auth prefix)."""
    
    @app.route('/api/v1/public/health', methods=['GET'])
    def public_health():
        """Public health check endpoint."""
        return jsonify({'status': 'ok', 'service': 'payments'})
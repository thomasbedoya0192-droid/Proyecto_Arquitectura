from rest_framework.permissions import BasePermission
from .models import Subscription


class IsPremium(BasePermission):
    """
    Permission class that checks if the user has an active premium subscription.
    Uses the Subscription model's is_premium() method which handles:
    - Active premium subscriptions
    - Canceled subscriptions with cancel_at_period_end=True (grace period until period ends)
    - Automatic expiration via check_and_expire()
    """
    message = "Requiere plan Premium activo para acceder a esta funcionalidad."

    def has_permission(self, request, view):
        # Must be authenticated first
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get or create subscription and check premium status
        subscription, _ = Subscription.objects.get_or_create(user=request.user)
        subscription.check_and_expire()  # Auto-expire if needed
        
        return subscription.is_premium()
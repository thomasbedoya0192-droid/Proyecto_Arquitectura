from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View


class HealthView(View):
    """Simple health check endpoint with no authentication."""

    def get(self, request):
        """Return JSON status OK."""
        return JsonResponse({"status": "ok"})
from django.contrib import admin
from django.urls import path, include
from .views import HealthView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', HealthView.as_view(), name='api_health'),
    path('api/', include('app.urls')),
    path('api/', include('transacciones.urls')),
    path('api/billing/', include('billing.urls')),
]

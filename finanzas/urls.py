from django.urls import path
from finanzas.views import TransferenciaAPIView

urlpatterns = [
    path("transferir/", TransferenciaAPIView.as_view(), name="transferir_api"),
]

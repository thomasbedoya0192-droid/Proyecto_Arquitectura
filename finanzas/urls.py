from django.urls import path
from finanzas.views import (
    TransferenciaAPIView,
    GastoAPIView,
    CuentasAPIView,
    CategoriaAPIView,
    PresupuestoEstadoAPIView
)

urlpatterns = [
    path("transferir/", TransferenciaAPIView.as_view(), name="transferir_api"),
    path("gastos/", GastoAPIView.as_view(), name="gasto_api"),
    path("cuentas/", CuentasAPIView.as_view(), name="cuentas_api"),
    path("categorias/", CategoriaAPIView.as_view(), name="categoria_api"),
    path("cuentas/<int:cuenta_id>/presupuestos/", PresupuestoEstadoAPIView.as_view(), name="presupuesto_estado_api"),
]

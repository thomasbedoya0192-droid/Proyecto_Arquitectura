from django.urls import path
from .views import (
    ListaTransaccionesView,
    DetalleTransaccionView,
    ReporteFinancieroView,
    TransferenciaEntreCuentasView,
    LoginUsuarioView,
    RegistrarUsuarioView
)

urlpatterns = [
    path('transacciones/', ListaTransaccionesView.as_view(), name='lista_transacciones'),
    path('transacciones/registrar/', ListaTransaccionesView.as_view(), name='registrar_transaccion'),
    path('transacciones/<int:pk>/', DetalleTransaccionView.as_view(), name='detalle_transaccion'),
    path('transacciones/reporte/', ReporteFinancieroView.as_view(), name='reporte_financiero'),
    path('transacciones/transferir/', TransferenciaEntreCuentasView.as_view(), name='transferir_saldo'),
    path('transacciones/login-usuario/', LoginUsuarioView.as_view(), name='login_usuario'),
    path('transacciones/registrar-usuario/', RegistrarUsuarioView.as_view(), name='registrar_usuario'),
]

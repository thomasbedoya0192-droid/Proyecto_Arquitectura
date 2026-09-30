from django.urls import path
from .views import (
    ListaCuentasView,
    RegistroCuentaView,
    DetalleCuentaBancariaView,
    ListaSuscripcionesView,
    DetalleSuscripcionView,
    ProcesarAutoDebitosView,
    ListaMetasAhorroView,
    AbonarMetaAhorroView
)

urlpatterns = [
    path('cuentas/', ListaCuentasView.as_view(), name='lista_cuentas'),
    path('cuentas/registrar/', RegistroCuentaView.as_view(), name='registro_cuenta'),
    path('cuentas/<int:pk>/', DetalleCuentaBancariaView.as_view(), name='detalle_cuenta'),
    
    path('suscripciones/', ListaSuscripcionesView.as_view(), name='lista_suscripciones'),
    path('suscripciones/<int:pk>/', DetalleSuscripcionView.as_view(), name='detalle_suscripcion'),
    path('suscripciones/procesar-autodebitos/', ProcesarAutoDebitosView.as_view(), name='procesar_autodebitos'),

    # Rutas para Metas de Ahorro
    path('metas/', ListaMetasAhorroView.as_view(), name='lista_metas'),
    path('metas/<int:pk>/abonar/', AbonarMetaAhorroView.as_view(), name='abonar_meta'),
]


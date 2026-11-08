from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from .models import CuentaBancaria, Suscripcion
from .models import MetaAhorro
from .serializers import CuentaBancariaSerializer, SuscripcionSerializer
from .serializers import MetaAhorroSerializer
from transacciones.models import Transaccion
from .services import procesar_autodebitos_suscripciones


class ListaCuentasView(APIView):
    """Lista las cuentas bancarias; con ?usuario=<id> devuelve solo las de ese usuario."""
    def get(self, request):
        cuentas = CuentaBancaria.objects.all()
        usuario_id = request.query_params.get('usuario')
        if usuario_id:
            cuentas = cuentas.filter(usuario_id=usuario_id)
        serializer = CuentaBancariaSerializer(cuentas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RegistroCuentaView(APIView):
    """Endpoint para registrar una nueva cuenta bancaria."""
    def post(self, request):
        serializer = CuentaBancariaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(_(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


class DetalleCuentaBancariaView(APIView):
    """Endpoint para obtener, actualizar o eliminar una cuenta bancaria específica."""

    def get(self, request, pk):
        cuenta = get_object_or_404(CuentaBancaria, pk=pk)
        serializer = CuentaBancariaSerializer(cuenta)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        cuenta = get_object_or_404(CuentaBancaria, pk=pk)
        serializer = CuentaBancariaSerializer(cuenta, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(_(serializer.errors), status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        cuenta = get_object_or_404(CuentaBancaria, pk=pk)
        
        with transaction.atomic():
            Transaccion.objects.filter(cuenta=cuenta).delete()
            cuenta.delete()

        return Response(
            _({"mensaje": "Cuenta bancaria y sus transacciones asociadas eliminadas correctamente."}),
            status=status.HTTP_204_NO_CONTENT
        )


class ListaSuscripcionesView(APIView):
    """Endpoint para listar y registrar suscripciones recurrentes."""
    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        cuenta_id = request.query_params.get('cuenta')

        suscripciones = Suscripcion.objects.all()

        if usuario_id:
            suscripciones = suscripciones.filter(usuario_id=usuario_id)
        if cuenta_id:
            suscripciones = suscripciones.filter(cuenta_id=cuenta_id)

        if not usuario_id and not cuenta_id:
            return Response(_('Se requiere al menos el parámetro usuario o cuenta'), status=status.HTTP_400_BAD_REQUEST)

        suscripciones = suscripciones.order_by('fecha_proximo_pago')
        serializer = SuscripcionSerializer(suscripciones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SuscripcionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(_(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


class DetalleSuscripcionView(APIView):
    """Endpoint para editar o eliminar una suscripción específica."""
    def put(self, request, pk):
        suscripcion = get_object_or_404(Suscripcion, pk=pk)
        serializer = SuscripcionSerializer(suscripcion, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(_(serializer.errors), status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        suscripcion = get_object_or_404(Suscripcion, pk=pk)
        suscripcion.delete()
        return Response(_({'mensaje': 'Suscripción eliminada correctamente'}), status=status.HTTP_204_NO_CONTENT)


class ProcesarAutoDebitosView(APIView):
    """Endpoint para verificar y procesar automáticamente los cobros de suscripciones del día."""
    def post(self, request):
        usuario_id = request.data.get('usuario')
        if not usuario_id:
            return Response(_('El parámetro usuario es requerido'), status=status.HTTP_400_BAD_REQUEST)

        procesadas = procesar_autodebitos_suscripciones(usuario_id=usuario_id)
        return Response({
            'mensaje': _('Se procesaron {count} cobros de suscripciones automáticos.').format(count=len(procesadas)),
            'detalles': procesadas
        }, status=status.HTTP_200_OK)


class ListaMetasAhorroView(APIView):
    """Listar todas las metas del usuario o crear una nueva."""

    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        if not usuario_id:
            return Response(_('El parámetro usuario es requerido'), status=status.HTTP_400_BAD_REQUEST)
        
        metas = MetaAhorro.objects.filter(usuario_id=usuario_id).order_by('-fecha_creacion')
        serializer = MetaAhorroSerializer(metas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = MetaAhorroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(_(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


class AbonarMetaAhorroView(APIView):
    """Abonar o liberar saldo de una meta de ahorro asegurando que no supere el saldo libre."""

    def post(self, request, pk):
        try:
            meta = MetaAhorro.objects.get(pk=pk)
        except MetaAhorro.DoesNotExist:
            return Response(_('Meta de ahorro no encontrada.'), status=status.HTTP_404_NOT_FOUND)

        monto = float(request.data.get('monto', 0))
        accion = request.data.get('accion', 'abonar') # 'abonar' o 'liberar'

        if monto <= 0:
            return Response(_('El monto debe ser mayor a cero.'), status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cuenta = meta.cuenta
            saldo_real = float(cuenta.saldo)
            
            # Suma de lo abonado en todas las metas de esta cuenta
            reservado_actual = float(sum(m.monto_actual for m in cuenta.metas_ahorro.all()))
            disponible_actual = saldo_real - reservado_actual

            if accion == 'abonar':
                if monto > disponible_actual:
                    return Response(_(f'No tienes suficiente saldo libre en {cuenta.nombre}. Disponible: ${disponible_actual:.2f}'), status=status.HTTP_400_BAD_REQUEST)
                
                meta.monto_actual = float(meta.monto_actual) + monto

            elif accion == 'liberar':
                if monto > float(meta.monto_actual):
                    return Response(_(f'No puedes liberar más dinero del abonado en esta meta. Abonado actual: ${meta.monto_actual:.2f}'), status=status.HTTP_400_BAD_REQUEST)
                
                meta.monto_actual = float(meta.monto_actual) - monto

            meta.save()

        return Response(MetaAhorroSerializer(meta).data, status=status.HTTP_200_OK)


from billing.models import Subscription


class FeedbackAccessCheck(APIView):
    """Verificar si el usuario puede acceder al Feedback Financiero basado en su suscripción."""
    def get(self, request):
        usuario = request.user
        subscription, _ = Subscription.objects.get_or_create(user=usuario)
        subscription.check_and_expire()  # Auto-expire if needed
        puede_acceder = subscription.is_premium()
        return Response({
            'puede_acceder': puede_acceder,
            'plan_actual': subscription.plan,
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end,
        }, status=status.HTTP_200_OK)


from rest_framework_simplejwt.tokens import RefreshToken


class LoginJWTView(APIView):
    """Login endpoint that issues JWT tokens for service authentication.

    Returns a pair of access and refresh tokens. The access token can be used
    by Flask microservices to authenticate API calls without contacting Django.
    """
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': _('Username and password are required.')},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = authenticate(username=username, password=password)
        if user:
            token = RefreshToken.for_user(user)
            return Response({
                'access_token': str(token.access_token),
                'refresh_token': str(token)
            })
        return Response(
            {'error': _('Invalid credentials.')},
            status=status.HTTP_400_BAD_REQUEST
        )
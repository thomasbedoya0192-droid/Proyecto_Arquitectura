from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import CuentaBancaria, Suscripcion
from .models import MetaAhorro
from .serializers import CuentaBancariaSerializer, SuscripcionSerializer
from .serializers import MetaAhorroSerializer
from transacciones.models import Transaccion
from .services import procesar_autodebitos_suscripciones

class ListaCuentasView(APIView):
    """Endpoint para obtener todas las cuentas bancarias."""
    def get(self, request):
        cuentas = CuentaBancaria.objects.all()
        serializer = CuentaBancariaSerializer(cuentas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RegistroCuentaView(APIView):
    """Endpoint para registrar una nueva cuenta bancaria."""
    def post(self, request):
        serializer = CuentaBancariaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        cuenta = get_object_or_404(CuentaBancaria, pk=pk)
        
        with transaction.atomic():
            Transaccion.objects.filter(cuenta=cuenta).delete()
            cuenta.delete()

        return Response(
            {"mensaje": "Cuenta bancaria y sus transacciones asociadas eliminadas correctamente."},
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
            return Response({'error': 'Se requiere al menos el parámetro usuario o cuenta'}, status=status.HTTP_400_BAD_REQUEST)

        suscripciones = suscripciones.order_by('fecha_proximo_pago')
        serializer = SuscripcionSerializer(suscripciones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SuscripcionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DetalleSuscripcionView(APIView):
    """Endpoint para editar o eliminar una suscripción específica."""
    def put(self, request, pk):
        suscripcion = get_object_or_404(Suscripcion, pk=pk)
        serializer = SuscripcionSerializer(suscripcion, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        suscripcion = get_object_or_404(Suscripcion, pk=pk)
        suscripcion.delete()
        return Response({'mensaje': 'Suscripción eliminada correctamente'}, status=status.HTTP_204_NO_CONTENT)

class ProcesarAutoDebitosView(APIView):
    """Endpoint para verificar y procesar automáticamente los cobros de suscripciones del día."""
    def post(self, request):
        usuario_id = request.data.get('usuario')
        if not usuario_id:
            return Response({'error': 'El parámetro usuario es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        procesadas = procesar_autodebitos_suscripciones(usuario_id=usuario_id)
        return Response({
            'mensaje': f"Se procesaron {len(procesadas)} cobros de suscripciones automáticos.",
            'detalles': procesadas
        }, status=status.HTTP_200_OK)

class ListaMetasAhorroView(APIView):
    """Listar todas las metas del usuario o crear una nueva."""

    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        if not usuario_id:
            return Response({'error': 'El parámetro usuario es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        metas = MetaAhorro.objects.filter(usuario_id=usuario_id).order_by('-fecha_creacion')
        serializer = MetaAhorroSerializer(metas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = MetaAhorroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AbonarMetaAhorroView(APIView):
    """Abonar o liberar saldo de una meta de ahorro asegurando que no supere el saldo libre."""

    def post(self, request, pk):
        try:
            meta = MetaAhorro.objects.get(pk=pk)
        except MetaAhorro.DoesNotExist:
            return Response({'error': 'Meta de ahorro no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        monto = float(request.data.get('monto', 0))
        accion = request.data.get('accion', 'abonar') # 'abonar' o 'liberar'

        if monto <= 0:
            return Response({'error': 'El monto debe ser mayor a cero.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            cuenta = meta.cuenta
            saldo_real = float(cuenta.saldo)
            
            # Suma de lo abonado en todas las metas de esta cuenta
            reservado_actual = float(sum(m.monto_actual for m in cuenta.metas_ahorro.all()))
            disponible_actual = saldo_real - reservado_actual

            if accion == 'abonar':
                if monto > disponible_actual:
                    return Response({
                        'error': f'No tienes suficiente saldo libre en {cuenta.nombre}. Disponible: ${disponible_actual:.2f}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                meta.monto_actual = float(meta.monto_actual) + monto

            elif accion == 'liberar':
                if monto > float(meta.monto_actual):
                    return Response({
                        'error': f'No puedes liberar más dinero del abonado en esta meta. Abonado actual: ${meta.monto_actual:.2f}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                meta.monto_actual = float(meta.monto_actual) - monto

            meta.save()

        return Response(MetaAhorroSerializer(meta).data, status=status.HTTP_200_OK)

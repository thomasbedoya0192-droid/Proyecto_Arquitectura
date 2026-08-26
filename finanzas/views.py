from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from finanzas.serializers import (
    TransferRequestSerializer, TransaccionSerializer,
    GastoRequestSerializer, CuentaSerializer,
    CategoriaSerializer, PresupuestoSerializer
)
from finanzas.services import (
    TransferService, GastoService, PresupuestoService
)
from finanzas.models import Cuenta, Categoria


class TransferenciaAPIView(APIView):
    """
    Vista para gestionar transferencias entre cuentas.
    POST: Ejecutar una transferencia
    """

    def post(self, request):
        """
        Ejecuta una transferencia de fondos entre dos cuentas.
        """
        serializer = TransferRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaccion = TransferService.execute_transfer(
                origen_id=serializer.validated_data["origen_id"],
                destino_id=serializer.validated_data["destino_id"],
                monto=serializer.validated_data["monto"],
            )
            output_serializer = TransaccionSerializer(transaccion)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist:
            return Response(
                {"error": "Una o ambas cuentas no existen."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_409_CONFLICT)


class GastoAPIView(APIView):
    """
    Vista para registrar gastos en una cuenta.
    POST: Registrar un nuevo gasto
    """

    def post(self, request):
        """
        Registra un gasto en una cuenta específica.
        """
        serializer = GastoRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaccion = GastoService.registrar_gasto(
                cuenta_id=serializer.validated_data["cuenta_id"],
                categoria_id=serializer.validated_data["categoria_id"],
                monto=serializer.validated_data["monto"],
                descripcion=serializer.validated_data.get("descripcion", ""),
                etiquetas_ids=serializer.validated_data.get("etiquetas", [])
            )
            output_serializer = TransaccionSerializer(transaccion)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as e:
            return Response(
                {"error": f"Recurso no encontrado: {str(e)}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_409_CONFLICT)
        except ValidationError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CuentasAPIView(APIView):
    """
    Vista para gestionar cuentas.
    GET: Listar cuentas
    POST: Crear nueva cuenta
    """

    def get(self, request):
        """
        Lista todas las cuentas activas del usuario.
        """
        cuentas = Cuenta.objects.filter(activa=True)
        serializer = CuentaSerializer(cuentas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Crea una nueva cuenta.
        """
        serializer = CuentaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            cuenta = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CategoriaAPIView(APIView):
    """
    Vista para gestionar categorías de transacciones.
    GET: Listar categorías
    POST: Crear nueva categoría
    """

    def get(self, request):
        """
        Lista todas las categorías disponibles.
        """
        categorias = Categoria.objects.all()
        serializer = CategoriaSerializer(categorias, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Crea una nueva categoría.
        """
        serializer = CategoriaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            categoria = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PresupuestoEstadoAPIView(APIView):
    """
    Vista para consultar el estado de presupuestos.
    GET: Obtener estado de presupuestos de una cuenta
    """

    def get(self, request, cuenta_id):
        """
        Obtiene el estado actual de presupuestos para una cuenta.
        """
        try:
            cuenta = Cuenta.objects.get(id=cuenta_id)
            estado = PresupuestoService.obtener_estado_presupuestos(cuenta_id)
            return Response(estado, status=status.HTTP_200_OK)

        except Cuenta.DoesNotExist:
            return Response(
                {"error": "La cuenta no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )

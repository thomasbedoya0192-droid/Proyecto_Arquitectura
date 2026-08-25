from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from finanzas.serializers import TransferRequestSerializer, TransaccionSerializer
from finanzas.services import TransferService


class TransferenciaAPIView(APIView):
    def post(self, request):
        # 1. Entrada y validación de datos
        serializer = TransferRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # 2. Delegar al Service Layer (Desacoplamiento total)
        try:
            transaccion = TransferService.execute_transfer(
                origen_id=serializer.validated_data["origen_id"],
                destino_id=serializer.validated_data["destino_id"],
                monto=serializer.validated_data["monto"],
            )
            # 3. Salida de datos exitosa
            output_serializer = TransaccionSerializer(transaccion)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        # 4. Manejo de excepciones y códigos de estado
        except ObjectDoesNotExist:
            return Response(
                {"error": "Una o ambas cuentas no existen."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_409_CONFLICT)

from rest_framework import serializers
from finanzas.models import Transaccion


class TransferRequestSerializer(serializers.Serializer):
    origen_id = serializers.IntegerField()
    destino_id = serializers.IntegerField()
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)


class TransaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaccion
        fields = "__all__"

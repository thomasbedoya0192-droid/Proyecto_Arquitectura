from rest_framework import serializers
from .models import Transaccion

class TransaccionSerializer(serializers.ModelSerializer):
    nombre_cuenta = serializers.ReadOnlyField(source='cuenta.nombre')

    class Meta:
        model = Transaccion
        fields = ['id', 'usuario', 'cuenta', 'nombre_cuenta', 'monto', 'tipo', 'descripcion', 'fecha']
        read_only_fields = ['id', 'fecha']

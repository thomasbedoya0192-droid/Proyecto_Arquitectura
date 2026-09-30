from rest_framework import serializers
from .models import CuentaBancaria, Suscripcion, MetaAhorro

class CuentaBancariaSerializer(serializers.ModelSerializer):
    saldo_reservado_metas = serializers.SerializerMethodField()
    saldo_disponible = serializers.SerializerMethodField()

    class Meta:
        model = CuentaBancaria
        fields = [
            'id', 'usuario', 'nombre', 'tipo', 'saldo', 
            'saldo_reservado_metas', 'saldo_disponible', 
            'tope_gasto_mensual', 'fecha_creacion'
        ]

    def get_saldo_reservado_metas(self, obj):
        metas = obj.metas_ahorro.all()
        return float(sum(m.monto_actual for m in metas))

    def get_saldo_disponible(self, obj):
        saldo_real = float(obj.saldo)
        reservado = self.get_saldo_reservado_metas(obj)
        return max(0.0, saldo_real - reservado)

class SuscripcionSerializer(serializers.ModelSerializer):
    nombre_cuenta = serializers.ReadOnlyField(source='cuenta.nombre')
    tipo_cuenta = serializers.ReadOnlyField(source='cuenta.tipo')

    class Meta:
        model = Suscripcion
        fields = [
            'id', 
            'usuario', 
            'cuenta', 
            'nombre_cuenta', 
            'tipo_cuenta', 
            'nombre', 
            'servicio_preset', 
            'monto', 
            'frecuencia', 
            'fecha_proximo_pago'
        ]

class MetaAhorroSerializer(serializers.ModelSerializer):
    nombre_cuenta = serializers.ReadOnlyField(source='cuenta.nombre')
    progreso_porcentaje = serializers.SerializerMethodField()

    class Meta:
        model = MetaAhorro
        fields = [
            'id', 'usuario', 'cuenta', 'nombre_cuenta', 
            'nombre', 'monto_objetivo', 'monto_actual', 
            'fecha_limite', 'fecha_creacion', 'progreso_porcentaje'
        ]
        read_only_fields = ['id', 'fecha_creacion']

    def get_progreso_porcentaje(self, obj):
        if obj.monto_objetivo > 0:
            porcentaje = (float(obj.monto_actual) / float(obj.monto_objetivo)) * 100
            return round(min(porcentaje, 100.0), 1)
        return 0.0

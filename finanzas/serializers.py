from rest_framework import serializers
from finanzas.models import (
    Transaccion, Cuenta, Categoria, Etiqueta, 
    Presupuesto, Tope
)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'color', 'fecha_creacion']
        read_only_fields = ['fecha_creacion']


class EtiquetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etiqueta
        fields = ['id', 'nombre', 'descripcion', 'fecha_creacion']
        read_only_fields = ['fecha_creacion']


class CuentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuenta
        fields = [
            'id', 'nombre', 'saldo', 'tipo', 'moneda',
            'fecha_creacion', 'activa'
        ]
        read_only_fields = ['fecha_creacion', 'saldo']


class CuentaDetailSerializer(serializers.ModelSerializer):
    presupuestos = serializers.SerializerMethodField()

    class Meta:
        model = Cuenta
        fields = [
            'id', 'nombre', 'saldo', 'tipo', 'moneda',
            'fecha_creacion', 'activa', 'presupuestos'
        ]
        read_only_fields = ['fecha_creacion', 'saldo']

    def get_presupuestos(self, obj):
        presupuestos = obj.presupuestos.filter(activo=True)
        return PresupuestoSerializer(presupuestos, many=True).data


class TopeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tope
        fields = [
            'id', 'cuenta', 'limite_semanal', 'limite_mensual',
            'umbral_alerta', 'activo'
        ]


class PresupuestoSerializer(serializers.ModelSerializer):
    porcentaje_utilizado = serializers.SerializerMethodField()
    alerta_disparada = serializers.SerializerMethodField()

    class Meta:
        model = Presupuesto
        fields = [
            'id', 'cuenta', 'categoria', 'monto_limite',
            'monto_gastado', 'porcentaje_alerta', 'fecha_inicio',
            'fecha_fin', 'activo', 'porcentaje_utilizado',
            'alerta_disparada'
        ]
        read_only_fields = ['porcentaje_utilizado', 'alerta_disparada']

    def get_porcentaje_utilizado(self, obj):
        return obj.porcentaje_utilizado()

    def get_alerta_disparada(self, obj):
        return obj.alerta_disparada()


class TransaccionSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(
        source='categoria.nombre',
        read_only=True
    )
    etiquetas_nombres = serializers.SerializerMethodField()

    class Meta:
        model = Transaccion
        fields = [
            'id', 'cuenta_origen', 'cuenta_destino', 'categoria',
            'categoria_nombre', 'etiquetas', 'etiquetas_nombres',
            'monto', 'tipo', 'descripcion', 'fecha', 'creada_por_ia',
            'sincronizada'
        ]
        read_only_fields = ['fecha', 'sincronizada']

    def get_etiquetas_nombres(self, obj):
        return [etiqueta.nombre for etiqueta in obj.etiquetas.all()]


class TransferRequestSerializer(serializers.Serializer):
    origen_id = serializers.IntegerField()
    destino_id = serializers.IntegerField()
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "El monto debe ser mayor a 0."
            )
        return value


class GastoRequestSerializer(serializers.Serializer):
    cuenta_id = serializers.IntegerField()
    categoria_id = serializers.IntegerField()
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    descripcion = serializers.CharField(max_length=255, required=False)
    etiquetas = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )

    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "El monto debe ser mayor a 0."
            )
        return value

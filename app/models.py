from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class CuentaBancaria(models.Model):
    TIPO_CHOICES = [
        ('Ahorros', 'Cuenta de Ahorros'),
        ('Corriente', 'Cuenta Corriente'),
        ('Billetera Digital', 'Billetera Digital'),
        ('Tarjeta de Crédito', 'Tarjeta de Crédito'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cuentas')
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES, default='Ahorros')
    saldo = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tope_gasto_mensual = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    fecha_creacion = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.nombre} ({self.tipo}) - Saldo: ${self.saldo}"


class Suscripcion(models.Model):
    FRECUENCIA_CHOICES = [
        ('Mensual', 'Mensual'),
        ('Anual', 'Anual'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suscripciones')
    cuenta = models.ForeignKey(CuentaBancaria, on_delete=models.CASCADE, related_name='suscripciones')
    nombre = models.CharField(max_length=100)
    servicio_preset = models.CharField(max_length=50, default='otro')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    frecuencia = models.CharField(max_length=20, choices=FRECUENCIA_CHOICES, default='Mensual')
    fecha_proximo_pago = models.DateField()
    fecha_creacion = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.nombre} - ${self.monto} ({self.frecuencia})"

class MetaAhorro(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='metas_ahorro')
    cuenta = models.ForeignKey(CuentaBancaria, on_delete=models.CASCADE, related_name='metas_ahorro')
    nombre = models.CharField(max_length=120)
    monto_objetivo = models.DecimalField(max_digits=12, decimal_places=2)
    monto_actual = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    fecha_limite = models.DateField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.nombre} - ${self.monto_actual}/${self.monto_objetivo} ({self.cuenta.nombre})"

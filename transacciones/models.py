from django.db import models
from django.contrib.auth.models import User
from app.models import CuentaBancaria

class Transaccion(models.Model):
    TIPO_CHOICES = [
        ('ingreso', 'Ingreso'),
        ('gasto', 'Gasto'),
        ('transferencia', 'Transferencia'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transacciones')
    cuenta = models.ForeignKey(CuentaBancaria, on_delete=models.CASCADE, related_name='transacciones', default=1)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo.upper()} - ${self.monto} ({self.cuenta.nombre})"

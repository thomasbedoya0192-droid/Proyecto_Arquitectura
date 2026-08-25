from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal


class Cuenta(models.Model):
    nombre = models.CharField(max_length=100)
    saldo = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )

    def clean(self):
        # Validación de negocio: El saldo primitivo no debería ser negativo por defecto
        if self.saldo < 0:
            raise ValidationError("El saldo de la cuenta no puede ser negativo.")

    def save(self, *args, **kwargs):
        self.full_clean()  # Fuerza la validación antes de guardar
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} - Saldo: {self.saldo}"


class Tope(models.Model):
    cuenta = models.OneToOneField(Cuenta, on_delete=models.CASCADE, related_name="tope")
    limite_semanal = models.DecimalField(max_digits=12, decimal_places=2)
    umbral_alerta = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("80.00"),
        help_text="Porcentaje de consumo para disparar la alerta (ej. 80.00)",
    )

    def __str__(self):
        return f"Tope semanal {self.limite_semanal} para {self.cuenta.nombre}"


class Transaccion(models.Model):
    TIPO_CHOICES = [
        ("ingreso", "Ingreso"),
        ("gasto", "Gasto"),
        ("transferencia", "Transferencia"),
    ]

    cuenta_origen = models.ForeignKey(
        Cuenta,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transacciones_origen",
    )
    cuenta_destino = models.ForeignKey(
        Cuenta,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transacciones_destino",
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=255, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    # Campo para identificar si fue creada por IA o manualmente (útil a futuro)
    creada_por_ia = models.BooleanField(default=False)

    def clean(self):
        # Validaciones de negocio a nivel de entidad
        if self.monto <= 0:
            raise ValidationError("El monto de la transacción debe ser mayor a 0.")
        if self.tipo == "transferencia" and (
            not self.cuenta_origen or not self.cuenta_destino
        ):
            raise ValidationError(
                "Una transferencia requiere obligatoriamente cuenta de origen y destino."
            )
        if self.cuenta_origen == self.cuenta_destino:
            raise ValidationError(
                "La cuenta de origen y destino no pueden ser la misma."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tipo.capitalize()} - {self.monto} ({self.fecha.strftime('%Y-%m-%d')})"

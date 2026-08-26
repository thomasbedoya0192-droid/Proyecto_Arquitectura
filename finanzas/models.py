from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import datetime, timedelta


class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    color = models.CharField(
        max_length=7,
        default="#000000",
        help_text="Color en formato hexadecimal (ej. #FF5733)"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']
        verbose_name_plural = "Categorias"

    def clean(self):
        if len(self.nombre.strip()) == 0:
            raise ValidationError("El nombre de la categoría no puede estar vacío.")
        if len(self.color) != 7 or not self.color.startswith('#'):
            raise ValidationError("El color debe estar en formato hexadecimal válido (#RRGGBB).")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre


class Etiqueta(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def clean(self):
        if len(self.nombre.strip()) == 0:
            raise ValidationError("El nombre de la etiqueta no puede estar vacío.")
        if len(self.nombre) > 50:
            raise ValidationError("El nombre de la etiqueta no puede exceder 50 caracteres.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre


class Presupuesto(models.Model):
    cuenta = models.ForeignKey(
        'Cuenta',
        on_delete=models.CASCADE,
        related_name="presupuestos"
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.CASCADE,
        related_name="presupuestos"
    )
    monto_limite = models.DecimalField(max_digits=12, decimal_places=2)
    monto_gastado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00")
    )
    porcentaje_alerta = models.IntegerField(
        default=80,
        help_text="Porcentaje del presupuesto para disparar alerta (0-100)"
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['-fecha_inicio']
        unique_together = ('cuenta', 'categoria', 'fecha_inicio')

    def clean(self):
        if self.monto_limite <= 0:
            raise ValidationError("El monto límite debe ser mayor a 0.")
        if not (0 < self.porcentaje_alerta <= 100):
            raise ValidationError("El porcentaje de alerta debe estar entre 1 y 100.")
        if self.fecha_inicio >= self.fecha_fin:
            raise ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def porcentaje_utilizado(self) -> float:
        if self.monto_limite == 0:
            return 0
        return float((self.monto_gastado / self.monto_limite) * 100)

    def alerta_disparada(self) -> bool:
        return self.porcentaje_utilizado() >= self.porcentaje_alerta

    def __str__(self):
        return f"Presupuesto {self.categoria.nombre} - {self.cuenta.nombre}"


class Cuenta(models.Model):
    nombre = models.CharField(max_length=100)
    saldo = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    tipo = models.CharField(
        max_length=20,
        choices=[
            ('banco', 'Cuenta Bancaria'),
            ('efectivo', 'Efectivo'),
            ('tarjeta', 'Tarjeta de Crédito'),
            ('digital', 'Billetera Digital'),
            ('ahorros', 'Cuenta de Ahorros'),
        ],
        default='banco'
    )
    moneda = models.CharField(
        max_length=3,
        default='COP',
        help_text="Código ISO de la moneda (ej. COP, USD, EUR)"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']

    def clean(self):
        if self.saldo < 0:
            raise ValidationError("El saldo de la cuenta no puede ser negativo.")
        if len(self.nombre.strip()) == 0:
            raise ValidationError("El nombre de la cuenta no puede estar vacío.")
        if len(self.moneda) != 3:
            raise ValidationError("El código de moneda debe tener exactamente 3 caracteres.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} - Saldo: {self.saldo} {self.moneda}"


class Tope(models.Model):
    cuenta = models.OneToOneField(Cuenta, on_delete=models.CASCADE, related_name="tope")
    limite_semanal = models.DecimalField(max_digits=12, decimal_places=2)
    limite_mensual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Límite de gasto mensual"
    )
    umbral_alerta = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("80.00"),
        help_text="Porcentaje de consumo para disparar la alerta (0-100)"
    )
    activo = models.BooleanField(default=True)

    def clean(self):
        if self.limite_semanal <= 0 or self.limite_mensual <= 0:
            raise ValidationError("Los límites deben ser mayores a 0.")
        if not (0 < self.umbral_alerta <= 100):
            raise ValidationError("El umbral de alerta debe estar entre 0 y 100.")
        if self.limite_mensual < self.limite_semanal:
            raise ValidationError("El límite mensual debe ser mayor o igual al límite semanal.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Tope semanal {self.limite_semanal} | Mensual {self.limite_mensual} para {self.cuenta.nombre}"


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
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transacciones"
    )
    etiquetas = models.ManyToManyField(
        Etiqueta,
        blank=True,
        related_name="transacciones"
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.CharField(max_length=255, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    creada_por_ia = models.BooleanField(default=False)
    sincronizada = models.BooleanField(default=False)

    class Meta:
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['cuenta_origen', '-fecha']),
            models.Index(fields=['categoria', '-fecha']),
        ]

    def clean(self):
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
        if self.tipo in ["ingreso", "gasto"] and not self.categoria:
            raise ValidationError(
                "Una transacción de ingreso o gasto debe tener una categoría asignada."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tipo.capitalize()} - {self.monto} ({self.fecha.strftime('%Y-%m-%d %H:%M')})"

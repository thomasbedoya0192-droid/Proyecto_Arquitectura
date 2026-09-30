from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from calendar import monthrange
from .models import Suscripcion
from transacciones.models import Transaccion

def sumar_periodo(fecha_actual, frecuencia):
    """Calcula la próxima fecha de cobro según el ciclo (Mensual o Anual)."""
    if frecuencia == 'Anual':
        try:
            return fecha_actual.replace(year=fecha_actual.year + 1)
        except ValueError:
            return fecha_actual + timedelta(days=365)
    else: # Mensual
        year = fecha_actual.year
        month = fecha_actual.month + 1
        if month > 12:
            month = 1
            year += 1
        day = min(fecha_actual.day, monthrange(year, month)[1])
        return fecha_actual.replace(year=year, month=month, day=day)


def procesar_autodebitos_suscripciones(usuario_id=None):
    """
    Detecta suscripciones vencidas, debita el saldo de la cuenta,
    registra la transacción de gasto y actualiza la fecha progresivamente
    hasta la siguiente fecha de cobro futura.
    """
    hoy = timezone.now().date()
    suscripciones_query = Suscripcion.objects.filter(fecha_proximo_pago__lte=hoy)

    if usuario_id:
        suscripciones_query = suscripciones_query.filter(usuario_id=usuario_id)

    procesadas = []

    for sub in suscripciones_query:
        with transaction.atomic():
            cuenta = sub.cuenta

            # Bucle para ponernos al día si la fecha venía de meses muy atrás
            while sub.fecha_proximo_pago <= hoy:
                # 1. Registrar la transacción de gasto
                Transaccion.objects.create(
                    usuario=sub.usuario,
                    cuenta=cuenta,
                    monto=sub.monto,
                    tipo='gasto',
                    descripcion=f"Cobro Automático Suscripción: {sub.nombre} ({sub.fecha_proximo_pago.strftime('%d/%m/%Y')})"
                )

                # 2. Descontar el saldo de la cuenta
                cuenta.saldo = float(cuenta.saldo) - float(sub.monto)

                # 3. Avanzar al siguiente periodo
                sub.fecha_proximo_pago = sumar_periodo(sub.fecha_proximo_pago, sub.frecuencia)

            cuenta.save()
            sub.save()

            procesadas.append({
                'suscripcion': sub.nombre,
                'cuenta': cuenta.nombre,
                'proximo_pago': sub.fecha_proximo_pago.strftime('%Y-%m-%d')
            })

    return procesadas

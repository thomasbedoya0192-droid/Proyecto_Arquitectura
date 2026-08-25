from django.db import transaction
from decimal import Decimal
from finanzas.models import Cuenta, Tope, Transaccion
from finanzas.patterns.builder import TransactionBuilder
from finanzas.patterns.factory import NotificationFactory


class TransferService:
    @staticmethod
    def execute_transfer(origen_id: int, destino_id: int, monto: Decimal):
        # transaction.atomic garantiza que si algo falla, no se guarde nada a medias
        with transaction.atomic():
            origen = Cuenta.objects.select_for_update().get(id=origen_id)
            destino = Cuenta.objects.select_for_update().get(id=destino_id)

            if origen.saldo < monto:
                raise ValueError("Fondos insuficientes para realizar la transferencia.")

            # 1. Actualizar saldos
            origen.saldo -= monto
            destino.saldo += monto
            origen.save()
            destino.save()

            # 2. Crear transacción con el Builder obligatorio
            builder = TransactionBuilder()
            nueva_transaccion = (
                builder.set_cuentas(origen, destino)
                .set_detalles(
                    monto=monto,
                    tipo="transferencia",
                    descripcion="Transferencia en App",
                )
                .build()
            )
            nueva_transaccion.save()

            # 3. Validar topes (Lógica primitivizada para la entrega)
            TransferService._check_budget_limits(origen)

            return nueva_transaccion

    @staticmethod
    def _check_budget_limits(cuenta: Cuenta):
        try:
            tope = cuenta.tope
            # Aquí sumaríamos las transacciones de la semana.
            # Para simplificar y probar el Factory ahora, lanzamos alerta de prueba:
            if cuenta.saldo < tope.umbral_alerta:
                notificador = NotificationFactory.get_notificacion("push")
                notificador.enviar(
                    f"¡Atención! Tu saldo en {cuenta.nombre} está muy bajo."
                )
        except Tope.DoesNotExist:
            pass

from django.db.models import Sum, Count
from django.db import transaction
from decimal import Decimal
from .models import Transaccion
from app.models import CuentaBancaria, MetaAhorro

class TransaccionService:
    @staticmethod
    def registrar_gasto_con_proteccion_meta(usuario, cuenta_id, monto, descripcion):
        """
        Registra un gasto descontando del saldo real. 
        Si el gasto supera el saldo libre disponible pero no el saldo real total, 
        se descuenta el excedente de las metas asociadas y retorna una alerta.
        """
        monto = Decimal(str(monto))
        
        with transaction.atomic():
            cuenta = CuentaBancaria.objects.select_for_update().get(pk=cuenta_id)
            saldo_real = cuenta.saldo
            
            # Obtener las metas asociadas a esta cuenta
            metas = cuenta.metas_ahorro.all().order_by('-monto_actual')
            reservado_total = sum(m.monto_actual for m in metas)
            disponible_libre = max(Decimal('0.00'), saldo_real - reservado_total)

            if monto > saldo_real:
                raise ValueError(f"Saldo insuficiente en {cuenta.nombre}. Saldo real: ${saldo_real}")

            # 1. Descontar el saldo real de la cuenta
            cuenta.saldo -= monto
            cuenta.save()

            # 2. Crear la transacción de gasto en la base de datos
            transaccion_obj = Transaccion.objects.create(
                usuario=usuario,
                cuenta=cuenta,
                monto=monto,
                tipo='gasto',
                descripcion=descripcion
            )

            # 3. Verificar si el gasto invadió el saldo protegido por metas
            alerta_meta = None
            if monto > disponible_libre:
                excedente = monto - disponible_libre
                
                for meta in metas:
                    if excedente <= Decimal('0.00'):
                        break
                    
                    if meta.monto_actual > Decimal('0.00'):
                        descuento = min(meta.monto_actual, excedente)
                        meta.monto_actual -= descuento
                        excedente -= descuento
                        meta.save()
                        
                        alerta_meta = {
                            'meta_nombre': meta.nombre,
                            'monto_afectado': float(descuento),
                            'mensaje': f"¡Atención! Se utilizaron ${float(descuento):,.2f} de tu meta '{meta.nombre}' para cubrir la transacción."
                        }

            return transaccion_obj, alerta_meta

    @staticmethod
    def obtener_reporte_financiero(usuario_id, cuenta_id=None):
        query = Transaccion.objects.filter(usuario_id=usuario_id)

        if cuenta_id:
            query = query.filter(cuenta_id=cuenta_id)

        # 1. Totales de Ingresos, Gastos y Transferencias
        ingresos_total = query.filter(tipo='ingreso').aggregate(total=Sum('monto'))['total'] or 0
        gastos_total = query.filter(tipo='gasto').aggregate(total=Sum('monto'))['total'] or 0
        
        # Para transferencias, calculamos enviadas vs recibidas
        transferencias_query = query.filter(tipo='transferencia')
        trans_enviadas = transferencias_query.filter(descripcion__icontains='enviada').aggregate(total=Sum('monto'))['total'] or 0
        trans_recibidas = transferencias_query.filter(descripcion__icontains='recibida').aggregate(total=Sum('monto'))['total'] or 0

        total_transacciones = query.count()

        # 2. Desglose reciente de transacciones para analíticas
        recientes = query.order_by('-fecha')[:10]
        desglose_reciente = [
            {
                'id': t.id,
                'monto': float(t.monto),
                'tipo': t.tipo,
                'descripcion': t.descripcion or 'Sin descripción',
                'cuenta': t.cuenta.nombre,
                'fecha': t.fecha.strftime('%Y-%m-%d %H:%M')
            }
            for t in recientes
        ]

        return {
            'resumen': {
                'total_ingresos': float(ingresos_total),
                'total_gastos': float(gastos_total),
                'balance_neto': float(ingresos_total) - float(gastos_total),
                'total_transferencias_enviadas': float(trans_enviadas),
                'total_transferencias_recibidas': float(trans_recibidas),
                'cantidad_transacciones': total_transacciones
            },
            'desglose_reciente': desglose_reciente
        }

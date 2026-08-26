from django.db import transaction
from django.db.models import Sum, Q
from decimal import Decimal
from datetime import datetime, timedelta
from finanzas.models import (
    Cuenta, Tope, Transaccion, Categoria,
    Etiqueta, Presupuesto
)
from finanzas.patterns.builder import TransactionBuilder
from finanzas.patterns.factory import NotificationFactory


class TransferService:
    """
    Servicio de transferencias entre cuentas.
    Orquesta la lógica de negocio para ejecutar transferencias
    con validación de fondos y alertas presupuestarias.
    """

    @staticmethod
    def execute_transfer(origen_id: int, destino_id: int, monto: Decimal):
        """
        Ejecuta una transferencia entre dos cuentas de forma atómica.

        Args:
            origen_id: ID de la cuenta de origen
            destino_id: ID de la cuenta de destino
            monto: Cantidad a transferir

        Returns:
            Transaccion: Objeto de la transacción registrada

        Raises:
            ValueError: Si los fondos son insuficientes
            Cuenta.DoesNotExist: Si alguna cuenta no existe
        """
        with transaction.atomic():
            origen = Cuenta.objects.select_for_update().get(id=origen_id)
            destino = Cuenta.objects.select_for_update().get(id=destino_id)

            if origen.saldo < monto:
                raise ValueError(
                    f"Fondos insuficientes. Disponible: {origen.saldo}, Solicitado: {monto}"
                )

            origen.saldo -= monto
            destino.saldo += monto
            origen.save()
            destino.save()

            builder = TransactionBuilder()
            nueva_transaccion = (
                builder.set_cuentas(origen, destino)
                .set_detalles(
                    monto=monto,
                    tipo="transferencia",
                    descripcion="Transferencia entre cuentas",
                )
                .build()
            )
            nueva_transaccion.save()

            TransferService._check_budget_limits(origen)

            return nueva_transaccion

    @staticmethod
    def _check_budget_limits(cuenta: Cuenta):
        """
        Verifica los límites presupuestarios de una cuenta
        y dispara notificaciones si es necesario.
        """
        try:
            tope = cuenta.tope
            if cuenta.saldo < tope.umbral_alerta:
                notificador = NotificationFactory.get_notificacion("push")
                notificador.enviar(
                    f"Alerta: Tu saldo en {cuenta.nombre} es bajo ({cuenta.saldo})."
                )
        except Tope.DoesNotExist:
            pass


class GastoService:
    """
    Servicio para registrar y gestionar gastos.
    Maneja la creación de transacciones de gasto, validación
    de presupuestos y actualización de saldos.
    """

    @staticmethod
    def registrar_gasto(
        cuenta_id: int,
        categoria_id: int,
        monto: Decimal,
        descripcion: str = "",
        etiquetas_ids: list = None
    ) -> Transaccion:
        """
        Registra un gasto en una cuenta específica.

        Args:
            cuenta_id: ID de la cuenta
            categoria_id: ID de la categoría
            monto: Monto del gasto
            descripcion: Descripción del gasto
            etiquetas_ids: Lista de IDs de etiquetas

        Returns:
            Transaccion: Objeto de la transacción registrada

        Raises:
            Cuenta.DoesNotExist: Si la cuenta no existe
            Categoria.DoesNotExist: Si la categoría no existe
            ValueError: Si los fondos son insuficientes
        """
        with transaction.atomic():
            cuenta = Cuenta.objects.select_for_update().get(id=cuenta_id)
            categoria = Categoria.objects.get(id=categoria_id)

            if cuenta.saldo < monto:
                raise ValueError(
                    f"Fondos insuficientes para registrar gasto de {monto}."
                )

            cuenta.saldo -= monto
            cuenta.save()

            builder = TransactionBuilder()
            transaccion = (
                builder.set_cuentas_gasto(cuenta)
                .set_detalles(
                    monto=monto,
                    tipo="gasto",
                    descripcion=descripcion,
                )
                .set_categoria(categoria)
                .build()
            )
            transaccion.save()

            if etiquetas_ids:
                etiquetas = Etiqueta.objects.filter(id__in=etiquetas_ids)
                transaccion.etiquetas.set(etiquetas)

            GastoService._actualizar_presupuestos(cuenta, categoria, monto)
            GastoService._check_budget_alerts(cuenta, categoria)

            return transaccion

    @staticmethod
    def _actualizar_presupuestos(cuenta: Cuenta, categoria: Categoria, monto: Decimal):
        """
        Actualiza los presupuestos asociados al gasto registrado.
        """
        fecha_actual = datetime.now().date()
        presupuestos = Presupuesto.objects.filter(
            cuenta=cuenta,
            categoria=categoria,
            fecha_inicio__lte=fecha_actual,
            fecha_fin__gte=fecha_actual,
            activo=True
        )

        for presupuesto in presupuestos:
            presupuesto.monto_gastado += monto
            presupuesto.save()

    @staticmethod
    def _check_budget_alerts(cuenta: Cuenta, categoria: Categoria):
        """
        Verifica si algún presupuesto ha disparado alerta
        y notifica al usuario.
        """
        fecha_actual = datetime.now().date()
        presupuesto = Presupuesto.objects.filter(
            cuenta=cuenta,
            categoria=categoria,
            fecha_inicio__lte=fecha_actual,
            fecha_fin__gte=fecha_actual,
            activo=True
        ).first()

        if presupuesto and presupuesto.alerta_disparada():
            notificador = NotificationFactory.get_notificacion("email")
            porcentaje = presupuesto.porcentaje_utilizado()
            notificador.enviar(
                f"Presupuesto: Has utilizado {porcentaje:.1f}% de tu presupuesto "
                f"en {categoria.nombre} para {cuenta.nombre}."
            )


class PresupuestoService:
    """
    Servicio para gestionar presupuestos.
    Permite crear, modificar y analizar presupuestos por categoría.
    """

    @staticmethod
    def crear_presupuesto(
        cuenta_id: int,
        categoria_id: int,
        monto_limite: Decimal,
        fecha_inicio,
        fecha_fin,
        porcentaje_alerta: int = 80
    ) -> Presupuesto:
        """
        Crea un nuevo presupuesto para una cuenta y categoría.

        Args:
            cuenta_id: ID de la cuenta
            categoria_id: ID de la categoría
            monto_limite: Límite de gasto
            fecha_inicio: Fecha de inicio del presupuesto
            fecha_fin: Fecha de fin del presupuesto
            porcentaje_alerta: Porcentaje para disparar alerta

        Returns:
            Presupuesto: Objeto del presupuesto creado

        Raises:
            Presupuesto.DoesNotExist: Si ya existe un presupuesto en esas fechas
            ValueError: Si las fechas son inválidas
        """
        cuenta = Cuenta.objects.get(id=cuenta_id)
        categoria = Categoria.objects.get(id=categoria_id)

        presupuesto = Presupuesto.objects.create(
            cuenta=cuenta,
            categoria=categoria,
            monto_limite=monto_limite,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            porcentaje_alerta=porcentaje_alerta
        )

        return presupuesto

    @staticmethod
    def obtener_estado_presupuestos(cuenta_id: int) -> dict:
        """
        Obtiene el estado actual de todos los presupuestos activos
        de una cuenta.

        Returns:
            dict: Información de presupuestos y alertas
        """
        fecha_actual = datetime.now().date()
        presupuestos = Presupuesto.objects.filter(
            cuenta_id=cuenta_id,
            fecha_inicio__lte=fecha_actual,
            fecha_fin__gte=fecha_actual,
            activo=True
        )

        data = {
            'presupuestos': [],
            'alertas': 0,
            'presupuestos_excedidos': 0
        }

        for presupuesto in presupuestos:
            porcentaje = presupuesto.porcentaje_utilizado()
            info = {
                'id': presupuesto.id,
                'categoria': presupuesto.categoria.nombre,
                'monto_limite': float(presupuesto.monto_limite),
                'monto_gastado': float(presupuesto.monto_gastado),
                'porcentaje_utilizado': porcentaje,
                'alerta_disparada': presupuesto.alerta_disparada()
            }
            data['presupuestos'].append(info)

            if presupuesto.alerta_disparada():
                data['alertas'] += 1

            if porcentaje > 100:
                data['presupuestos_excedidos'] += 1

        return data

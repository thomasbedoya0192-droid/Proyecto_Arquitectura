from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from transacciones.models import Transaccion
from transacciones.services import TransaccionService
from app.models import CuentaBancaria, MetaAhorro, Suscripcion


class TransaccionServiceTests(TestCase):
    """Characterization tests for TransaccionService business rules."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.cuenta = CuentaBancaria.objects.create(
            usuario=self.user,
            nombre='Cuenta Principal',
            tipo='Ahorros',
            saldo=Decimal('1000.00'),
            tope_gasto_mensual=Decimal('500.00'),
        )
        # Meta con poco monto_actual para que haya saldo libre
        self.meta = MetaAhorro.objects.create(
            usuario=self.user,
            cuenta=self.cuenta,
            nombre='Meta Principal',
            monto_objetivo=Decimal('5000.00'),
            monto_actual=Decimal('100.00'),
        )

    def test_registrar_gasto_saldo_suficiente_sin_invadir_meta(self):
        """Gasto menor al saldo libre disponible (saldo - meta) debe tener éxito sin alerta."""
        # saldo=1000, meta monto_actual=100, así que disponible_libre = 900
        # gasto de 50 debe tener éxito y sin alerta
        alerta = None
        transaccion, alerta = TransaccionService.registrar_gasto_con_proteccion_meta(
            self.user, self.cuenta.id, Decimal('50.00'), 'Compra de prueba'
        )
        self.assertIsNone(alerta, f"Expected no alerta but got: {alerta}")
        self.cuenta.refresh_from_db()
        self.assertEqual(self.cuenta.saldo, Decimal('950.00'))
        transaccion.refresh_from_db()
        self.assertEqual(transaccion.tipo, 'gasto')
        self.assertEqual(transaccion.descripcion, 'Compra de prueba')

    def test_registrar_gasto_supera_saldo_real(self):
        """Gasto que supera el saldo real debe lanzar ValueError."""
        with self.assertRaises(ValueError) as context:
            TransaccionService.registrar_gasto_con_proteccion_meta(
                self.user, self.cuenta.id, Decimal('1500.00'), 'Gasto excesivo'
            )
        self.assertIn('Saldo insuficiente', str(context.exception))

    def test_registrar_gasto_invade_meta(self):
        """Gasto que invada el saldo protegido por metas debe descontar de la meta."""
        # saldo=1000, meta monto_actual=100, disponible_libre = 900
        # gasto de 950 > 900, así que invade la meta
        alerta = None
        transaccion, alerta = TransaccionService.registrar_gasto_con_proteccion_meta(
            self.user, self.cuenta.id, Decimal('950.00'), 'Gasto con invasión de meta'
        )
        self.cuenta.refresh_from_db()
        self.assertLess(self.cuenta.saldo, Decimal('1000.00'))
        self.assertIsNotNone(alerta)
        self.assertIn('Meta Principal', alerta['meta_nombre'])

    def test_obtener_reporte_financiero(self):
        """Reporte financiero debe contener resumen y desglose."""
        Transaccion.objects.create(
            usuario=self.user, cuenta=self.cuenta, monto=Decimal('200.00'),
            tipo='ingreso', descripcion='Salario'
        )
        Transaccion.objects.create(
            usuario=self.user, cuenta=self.cuenta, monto=Decimal('50.00'),
            tipo='gasto', descripcion='Compra menor'
        )
        reporte = TransaccionService.obtener_reporte_financiero(self.user.id)
        self.assertIn('resumen', reporte)
        self.assertIn('desglose_reciente', reporte)
        self.assertEqual(reporte['resumen']['cantidad_transacciones'], 2)

    def test_obtener_reporte_financiero_cuenta_filtrada(self):
        """Reporte financiero debe poder filtrar por cuenta."""
        Transaccion.objects.create(
            usuario=self.user, cuenta=self.cuenta, monto=Decimal('30.00'),
            tipo='gasto', descripcion='Compra en cuenta'
        )
        reporte = TransaccionService.obtener_reporte_financiero(self.user.id, cuenta_id=self.cuenta.id)
        self.assertEqual(reporte['resumen']['cantidad_transacciones'], 1)

    def test_atomicidad_gasto(self):
        """La operación debe ser atómica: o todo sucede o nada sucede."""
        from django.db import transaction
        with transaction.atomic():
            transaccion1 = TransaccionService.registrar_gasto_con_proteccion_meta(
                self.user, self.cuenta.id, Decimal('500.00'), 'Gasto atómico 1'
            )
            transaccion2 = TransaccionService.registrar_gasto_con_proteccion_meta(
                self.user, self.cuenta.id, Decimal('300.00'), 'Gasto atómico 2'
            )
            self.cuenta.refresh_from_db()
            self.assertEqual(self.cuenta.saldo, Decimal('200.00'))
        self.cuenta.refresh_from_db()
        self.assertEqual(self.cuenta.saldo, Decimal('200.00'))
        with self.assertRaises(ValueError):
            TransaccionService.registrar_gasto_con_proteccion_meta(
                self.user, self.cuenta.id, Decimal('9999.00'), 'Gasto excesivo'
            )
        self.cuenta.refresh_from_db()
        self.assertEqual(self.cuenta.saldo, Decimal('200.00'))
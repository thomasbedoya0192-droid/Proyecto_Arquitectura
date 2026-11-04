from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction

from app.models import MetaAhorro, Suscripcion, CuentaBancaria
from transacciones.models import Transaccion
from app.ia.services import FeedbackIAService


@receiver(post_save, sender=MetaAhorro)
def meta_ahorro_creada_o_actualizada(sender, instance, created, **kwargs):
    """Dispara feedback cuando se crea o cumple una meta"""
    if created:
        transaction.on_commit(lambda: FeedbackIAService.generar_feedback_usuario(
            instance.usuario_id, ['metas', 'general'], 'new_meta'
        ))
    else:
        # Verificar si se cumplió la meta (progreso >= 100%)
        if instance.monto_actual >= instance.monto_objetivo:
            transaction.on_commit(lambda: FeedbackIAService.generar_feedback_usuario(
                instance.usuario_id, ['metas', 'general'], 'meta_cumplida'
            ))


@receiver(post_save, sender=Suscripcion)
def suscripcion_creada_o_actualizada(sender, instance, created, **kwargs):
    """Dispara feedback cuando se crea una suscripción"""
    if created:
        transaction.on_commit(lambda: FeedbackIAService.generar_feedback_usuario(
            instance.usuario_id, ['suscripciones', 'general'], 'new_suscripcion'
        ))


@receiver(post_save, sender=Transaccion)
def transaccion_creada(sender, instance, created, **kwargs):
    """Verifica gastos grandes para disparar feedback"""
    if created and instance.tipo == 'gasto':
        from decimal import Decimal
        monto = Decimal(str(instance.monto))
        
        # Verificar si es gasto grande de forma asíncrona
        transaction.on_commit(lambda: _verificar_gasto_grande_async(
            instance.usuario_id, instance.cuenta_id, monto
        ))


def _verificar_gasto_grande_async(usuario_id: int, cuenta_id: int, monto):
    """Verificación async de gasto grande"""
    try:
        if FeedbackIAService.verificar_gasto_grande(usuario_id, cuenta_id, monto):
            FeedbackIAService.generar_feedback_usuario(
                usuario_id, ['gastos', 'general'], 'large_gasto'
            )
    except Exception:
        # Silencioso para no romper transacciones
        pass
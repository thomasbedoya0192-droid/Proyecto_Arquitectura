from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from app.ia.services import FeedbackIAService
from billing.models import Subscription


def _is_user_premium(user):
    """Check if user has active premium subscription."""
    try:
        subscription = Subscription.objects.get(user=user)
        subscription.check_and_expire()
        return subscription.is_premium()
    except Subscription.DoesNotExist:
        return False


class Command(BaseCommand):
    help = 'Genera feedback semanal de IA para usuarios premium activos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--usuario-id',
            type=int,
            help='Generar feedback solo para un usuario específico',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar regeneración aunque no haya pasado una semana',
        )

    def handle(self, *args, **options):
        usuario_id = options.get('usuario_id')
        force = options.get('force', False)
        
        if usuario_id:
            usuarios = User.objects.filter(pk=usuario_id)
            self.stdout.write(f"Generando feedback para usuario {usuario_id}...")
        else:
            # Solo usuarios premium activos con al menos una cuenta
            usuarios = User.objects.filter(
                cuentas__isnull=False,
                subscription__plan='premium',
                subscription__status='active'
            ).distinct()
            # Filter out expired/canceled at period end
            premium_users = []
            for u in usuarios:
                try:
                    sub = Subscription.objects.get(user=u)
                    sub.check_and_expire()
                    if sub.is_premium():
                        premium_users.append(u)
                except Subscription.DoesNotExist:
                    continue
            usuarios = premium_users
            self.stdout.write(f"Generando feedback semanal para {len(usuarios)} usuarios premium...")
        
        total_procesados = 0
        total_errores = 0
        
        for usuario in usuarios:
            try:
                # Verificar si debe actualizar (salvo force)
                if not force:
                    if not FeedbackIAService.debe_actualizar_por_evento(usuario.id, 'weekly'):
                        self.stdout.write(f"  - {usuario.username}: Saltado (actualizado recientemente)")
                        continue
                
                self.stdout.write(f"  - {usuario.username}: Generando feedback...")
                FeedbackIAService.generar_feedback_usuario(usuario.id, trigger='weekly')
                total_procesados += 1
                self.stdout.write(self.style.SUCCESS(f"    ✓ Completado"))
                
            except Exception as e:
                total_errores += 1
                self.stdout.write(self.style.ERROR(f"    ✗ Error: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(
            f"\nCompletado: {total_procesados} usuarios procesados, {total_errores} errores"
        ))
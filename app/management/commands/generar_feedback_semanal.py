from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from app.ia.services import FeedbackIAService


class Command(BaseCommand):
    help = 'Genera feedback semanal de IA para todos los usuarios activos'

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
            # Usuarios que tienen al menos una cuenta
            usuarios = User.objects.filter(cuentas__isnull=False).distinct()
            self.stdout.write(f"Generando feedback semanal para {usuarios.count()} usuarios...")
        
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
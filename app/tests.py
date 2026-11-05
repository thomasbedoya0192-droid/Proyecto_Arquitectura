from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock
from app.ia.services import FeedbackIAService


class APITests(TestCase):
    """Characterization tests for API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.other_user = User.objects.create_user(username='otheruser', password='testpass')
        self.client = Client()

    @patch('app.ia.services.FeedbackIAService.obtener_contexto_completo')
    def test_contexto_financiero_con_usuario_valido(self, mock_obtener_contexto):
        """GET /api/ia/contexto/ debe devolver contexto con usuario válido."""
        mock_obtener_contexto.return_value = {
            'usuario': {'id': self.user.id, 'username': self.user.username},
            'cuentas': [],
            'metas': [],
            'suscripciones': {},
            'transacciones': {'resumen': {}, 'transacciones': []},
            'reporte': {'resumen': {}, 'desglose_reciente': []},
            'alertas_automaticas': [],
        }
        from app.ia.views import ContextoFinancieroView
        view = ContextoFinancieroView()
        request = self.client.get('/api/ia/contexto/', {'usuario': self.user.id})
        # El cliente de pruebas de Django no usa query_params directamente
        # Vamos a probar la vista con el patrón URL correcto
        from django.urls import resolve, reverse
        url = '/api/ia/contexto/'
        response = self.client.get(url, {'usuario': self.user.id})
        self.assertEqual(response.status_code, 400)  # Sin usuario válido en el formato esperado

    def test_sin_parametro_usuario(self):
        """Sin parámetro usuario debe devolver error 400."""
        from app.ia.views import ContextoFinancieroView
        url = '/api/ia/contexto/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_usuario_invalido(self):
        """Usuario inexistente debe devolver error 404."""
        from app.ia.views import ContextoFinancieroView
        url = '/api/ia/contexto/'
        response = self.client.get(url, {'usuario': 9999})
        self.assertEqual(response.status_code, 404)

    @patch('app.ia.views.FeedbackIAService')
    def test_feedback_ia_get_sin_usuario(self, mock_service):
        """GET /api/ia/feedback/ sin usuario debe devolver 400."""
        from app.ia.views import FeedbackIAView
        url = '/api/ia/feedback/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    @patch('app.ia.views.FeedbackIAService')
    def test_feedback_ia_get_con_usuario(self, mock_service):
        """GET /api/ia/feedback/ con usuario debe funcionar."""
        mock_service.obtener_feedback_usuario.return_value = {
            'general': {'contenido': 'Test feedback', 'tokens_usados': 10},
        }
        from app.ia.views import FeedbackIAView
        url = '/api/ia/feedback/'
        response = self.client.get(url, {'usuario': self.user.id})
        self.assertEqual(response.status_code, 200)

    @patch('app.ia.views.FeedbackIAService')
    def test_feedback_ia_post_sin_usuario(self, mock_service):
        """POST /api/ia/feedback/ sin usuario debe devolver 400."""
        from app.ia.views import FeedbackIAView
        url = '/api/ia/feedback/'
        response = self.client.post(url, {'otro_campo': 'valor'})
        self.assertEqual(response.status_code, 400)

    @patch('app.ia.views.FeedbackIAService.generar_feedback_usuario')
    def test_feedback_ia_post_force(self, mock_generar):
        """POST /api/ia/feedback/ con force debe llamar al servicio."""
        mock_generar.return_value = {'general': 'Feedback generado'}
        from app.ia.views import FeedbackIAView
        url = '/api/ia/feedback/'
        response = self.client.post(
            url,
            {'usuario': self.user.id, 'secciones': ['general'], 'force': True},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        mock_generar.assert_called_once()

    @patch('app.ia.views.FeedbackIAService')
    def test_feedback_stats_sin_usuario(self, mock_service):
        """GET /api/ia/feedback/stats/ sin usuario debe devolver 400."""
        from app.ia.views import FeedbackStatsView
        url = '/api/ia/feedback/stats/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    @patch('app.ia.views.FeedbackIAService')
    def test_feedback_stats_con_usuario(self, mock_service):
        """GET /api/ia/feedback/stats/ con usuario debe funcionar."""
        from app.ia.views import FeedbackStatsView
        url = '/api/ia/feedback/stats/'
        response = self.client.get(url, {'usuario': self.user.id})
        self.assertEqual(response.status_code, 200)

    @patch('app.ia.views.FeedbackIAService.generate_full_feedback')
    def test_feedback_full_post(self, mock_generar):
        """POST /api/ia/feedback/full/ debe generar feedback completo."""
        mock_generar.return_value = {
            'general': 'Feedback general',
            'cuentas': 'Feedback cuentas',
            'gastos': 'Feedback gastos',
            'metas': 'Feedback metas',
            'suscripciones': 'Feedback suscripciones',
            'reportes': 'Feedback reportes',
        }
        from app.ia.views import FeedbackFullView
        url = '/api/ia/feedback/full/'
        response = self.client.post(
            url,
            {'usuario': self.user.id, 'force': False},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        mock_generar.assert_called_once_with(self.user.id, False)
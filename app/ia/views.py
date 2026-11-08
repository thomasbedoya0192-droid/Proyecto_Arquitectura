from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User

from app.ia.services import FeedbackIAService
from app.models import FeedbackIA
from billing.permissions import IsPremium


class ContextoFinancieroView(APIView):
    """Endpoint único que devuelve TODO el contexto financiero para la IA"""
    permission_classes = [IsAuthenticated, IsPremium]
    
    def get(self, request):
        # Use authenticated user's ID, ignore 'usuario' param for security
        usuario_id = request.user.id
        
        try:
            contexto = FeedbackIAService.obtener_contexto_completo(usuario_id)
            return Response(contexto, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo contexto: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FeedbackIAView(APIView):
    """
    GET: Obtiene feedback guardado del usuario (todas las secciones o una específica)
    POST: Fuerza regeneración manual del feedback (todas o secciones específicas)
    """
    permission_classes = [IsAuthenticated, IsPremium]
    
    def get(self, request):
        seccion = request.query_params.get('seccion')
        usuario_id = request.user.id
        
        try:
            feedback = FeedbackIAService.obtener_feedback_usuario(usuario_id, seccion)
            return Response(feedback, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo feedback: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        secciones = request.data.get('secciones')  # lista opcional
        usuario_id = request.user.id
        
        try:
            if secciones and not isinstance(secciones, list):
                return Response(
                    {'error': 'El parámetro secciones debe ser una lista.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            resultados = FeedbackIAService.generar_feedback_usuario(
                usuario_id, secciones, 'manual'
            )
            
            # Check if any sections failed
            errores = {k: v for k, v in resultados.items() if v.startswith('Error generando feedback:')}
            
            if errores:
                return Response({
                    'mensaje': 'Feedback generado parcialmente con errores',
                    'feedback': resultados,
                    'errores': errores,
                    'secciones_exitosas': [k for k, v in resultados.items() if not v.startswith('Error generando feedback:')],
                    'secciones_fallidas': list(errores.keys()),
                }, status=status.HTTP_207_MULTI_STATUS)
            
            return Response({
                'mensaje': 'Feedback generado correctamente',
                'feedback': resultados
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error generando feedback: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FeedbackStatsView(APIView):
    """Estadísticas de uso de tokens del usuario"""
    permission_classes = [IsAuthenticated, IsPremium]
    
    def get(self, request):
        usuario_id = request.user.id
        
        feedbacks = FeedbackIA.objects.filter(usuario_id=usuario_id)
        total_tokens = sum(f.tokens_usados for f in feedbacks)
        por_seccion = {f.seccion: f.tokens_usados for f in feedbacks}
        
        return Response({
            'total_tokens': total_tokens,
            'por_seccion': por_seccion,
            'total_feedbacks': feedbacks.count(),
        }, status=status.HTTP_200_OK)


class FeedbackFullView(APIView):
    """
    POST: Genera (o devuelve de caché) el feedback completo de las seis secciones.
    Body: { "force": false }
    """
    permission_classes = [IsAuthenticated, IsPremium]
    
    def post(self, request):
        force = request.data.get('force', False)
        usuario_id = request.user.id

        try:
            sections = FeedbackIAService.generate_full_feedback(usuario_id, force)
            
            # Check if any sections failed (sections with error messages)
            errores = {k: v for k, v in sections.items() if isinstance(v, str) and v.startswith('Error generando feedback:')}
            
            if errores:
                return Response({
                    'mensaje': 'Feedback generado parcialmente con errores',
                    'feedback': sections,
                    'errores': errores,
                    'secciones_exitosas': [k for k, v in sections.items() if not (isinstance(v, str) and v.startswith('Error generando feedback:'))],
                    'secciones_fallidas': list(errores.keys()),
                }, status=status.HTTP_207_MULTI_STATUS)
            
            return Response({
                'mensaje': 'Feedback generado correctamente',
                'feedback': sections
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error generando feedback completo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
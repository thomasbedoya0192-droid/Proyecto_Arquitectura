from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User

from app.ia.services import FeedbackIAService
from app.models import FeedbackIA


class ContextoFinancieroView(APIView):
    """Endpoint único que devuelve TODO el contexto financiero para la IA"""
    
    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        if not usuario_id:
            return Response(
                {'error': 'El parámetro usuario es requerido.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            usuario_id = int(usuario_id)
            User.objects.get(pk=usuario_id)
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Usuario no válido.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
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
    
    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        seccion = request.query_params.get('seccion')
        
        if not usuario_id:
            return Response(
                {'error': 'El parámetro usuario es requerido.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            usuario_id = int(usuario_id)
            User.objects.get(pk=usuario_id)
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Usuario no válido.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            feedback = FeedbackIAService.obtener_feedback_usuario(usuario_id, seccion)
            return Response(feedback, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo feedback: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        usuario_id = request.data.get('usuario')
        secciones = request.data.get('secciones')  # lista opcional
        
        if not usuario_id:
            return Response(
                {'error': 'El parámetro usuario es requerido.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            usuario_id = int(usuario_id)
            User.objects.get(pk=usuario_id)
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Usuario no válido.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            if secciones and not isinstance(secciones, list):
                return Response(
                    {'error': 'El parámetro secciones debe ser una lista.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            resultados = FeedbackIAService.generar_feedback_usuario(
                usuario_id, secciones, 'manual'
            )
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
    
    def get(self, request):
        usuario_id = request.query_params.get('usuario')
        
        if not usuario_id:
            return Response(
                {'error': 'El parámetro usuario es requerido.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            usuario_id = int(usuario_id)
            User.objects.get(pk=usuario_id)
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Usuario no válido.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
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
    Body: { "usuario": <id>, "force": false }
    """
    def post(self, request):
        usuario_id = request.data.get('usuario')
        force = request.data.get('force', False)

        if not usuario_id:
            return Response(
                {'error': 'El parámetro usuario es requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario_id = int(usuario_id)
            User.objects.get(pk=usuario_id)
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Usuario no válido.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            sections = FeedbackIAService.generate_full_feedback(usuario_id, force)
            return Response({
                'mensaje': 'Feedback generado correctamente',
                'feedback': sections
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error generando feedback completo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
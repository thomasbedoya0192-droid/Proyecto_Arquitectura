import os
import json
import time
import hashlib
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count
from django.contrib.auth.models import User

from app.models import CuentaBancaria, Suscripcion, MetaAhorro, FeedbackIA, FeedbackCache
from transacciones.models import Transaccion
from transacciones.services import TransaccionService

from .prompts import PROMPTS, SECCIONES, UMBRAL_GASTO_GRANDE_PORCENTAJE, MASTER_PROMPT


# Servicio cliente para la abstracción e integración con proveedores de LLM (Groq u OpenAI)
class LLMClient:
    """Cliente para llamar a la API de LLM (Groq/OpenAI)"""
    
    def __init__(self):
        self.provider = os.environ.get('LLM_PROVIDER', 'groq').lower()
        self.api_key = os.environ.get('LLM_API_KEY')
        self.model = os.environ.get('LLM_MODEL', 'llama-3.3-70b-versatile')
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY no configurada en variables de entorno")
    
    # Servicio auxiliar para enrutar solicitudes de completado al proveedor configurado
    def completar(self, prompt: str, max_tokens: int = 800, temperature: float = 0.3) -> tuple[str, int]:
        """
        Llama al LLM y retorna (respuesta, tokens_usados)
        """
        if self.provider == 'groq':
            return self._groq_completar(prompt, max_tokens, temperature)
        elif self.provider == 'openai':
            return self._openai_completar(prompt, max_tokens, temperature)
        else:
            raise ValueError(f"Proveedor no soportado: {self.provider}")
    
    # Servicio interno para gestionar llamadas a la API de Groq con reintentos e intervalo exp de retroceso
    def _groq_completar(self, prompt: str, max_tokens: int, temperature: float) -> tuple[str, int]:
        import requests, logging, time
        
        logger = logging.getLogger(__name__)
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        for attempt in range(3):
            try:
                logger.info("Groq request attempt %d", attempt + 1)
                response = requests.post(url, headers=headers, json=payload, timeout=20)
                if response.status_code == 429:
                    raise RuntimeError("Groq quota exhausted (429)")
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content'].strip(), data['usage']['total_tokens']
            except requests.exceptions.Timeout:
                logger.warning("Groq timeout on attempt %d", attempt + 1)
            except requests.exceptions.RequestException:
                logger.exception("Groq request failed")
                raise
            time.sleep(2 ** attempt)
        raise RuntimeError("Groq request timed out after retries")
    
    # Servicio interno para gestionar llamadas a la API de OpenAI con política de reintentos
    def _openai_completar(self, prompt: str, max_tokens: int, temperature: float) -> tuple[str, int]:
        import requests, logging, time
        
        logger = logging.getLogger(__name__)
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        for attempt in range(3):  # max 3 attempts
            try:
                logger.info("OpenAI request attempt %d", attempt + 1)
                response = requests.post(url, headers=headers, json=payload, timeout=20)
                if response.status_code == 429:
                    # Treat quota exhausted as non‑retryable to avoid long hangs
                    raise RuntimeError("OpenAI quota exhausted (429)")
                response.raise_for_status()
                data = response.json()
                contenido = data['choices'][0]['message']['content'].strip()
                tokens = data['usage']['total_tokens']
                return contenido, tokens
            except requests.exceptions.Timeout:
                logger.warning("OpenAI timeout on attempt %d", attempt + 1)
            except requests.exceptions.RequestException as exc:
                logger.exception("OpenAI request failed")
                raise
            time.sleep(2 ** attempt)  # 1s, 2s, 4s
        raise RuntimeError("OpenAI request timed out after retries")


# Servicio de inicialización bajo demanda (lazy factory) del cliente LLM
def get_llm_client():
    """Lazy initialization del cliente LLM"""
    return LLMClient()


# Servicio principal para la agregación de contexto financiero, análisis de datos y generación de feedback mediante IA
class FeedbackIAService:
    """Servicio principal para generar y gestionar feedback de IA"""
    
    # Servicio para la recolección y agregación completa del contexto financiero del usuario (cuentas, metas, suscripciones, transacciones y alertas)
    @staticmethod
    def obtener_contexto_completo(usuario_id: int) -> dict:
        """Obtiene todo el contexto financiero del usuario en una sola llamada"""
        usuario = User.objects.get(pk=usuario_id)
        
        # 1. Cuentas con saldos calculados
        cuentas = CuentaBancaria.objects.filter(usuario=usuario).select_related('usuario')
        cuentas_data = []
        saldo_total = Decimal('0')
        disponible_total = Decimal('0')
        reservado_total = Decimal('0')
        
        for cuenta in cuentas:
            metas = cuenta.metas_ahorro.all()
            reservado = sum(m.monto_actual for m in metas)
            saldo_real = cuenta.saldo
            disponible = max(Decimal('0'), saldo_real - reservado)
            
            cuentas_data.append({
                'id': cuenta.id,
                'nombre': cuenta.nombre,
                'tipo': cuenta.tipo,
                'saldo_real': float(saldo_real),
                'saldo_reservado_metas': float(reservado),
                'saldo_disponible': float(disponible),
                'tope_gasto_mensual': float(cuenta.tope_gasto_mensual),
                'metas_count': metas.count(),
            })
            saldo_total += saldo_real
            disponible_total += disponible
            reservado_total += reservado
        
        # 2. Metas de ahorro con progreso
        metas = MetaAhorro.objects.filter(usuario=usuario).select_related('cuenta')
        metas_data = []
        metas_en_riesgo = 0
        metas_cumplidas = 0
        
        for meta in metas:
            progreso = 0
            if meta.monto_objetivo > 0:
                progreso = float(meta.monto_actual) / float(meta.monto_objetivo) * 100
            
            dias_restantes = None
            if meta.fecha_limite:
                dias_restantes = (meta.fecha_limite - timezone.now().date()).days
            
            faltante = float(meta.monto_objetivo) - float(meta.monto_actual)
            ritmo_semanal = 0
            if dias_restantes and dias_restantes > 0:
                ritmo_semanal = faltante / (dias_restantes / 7)
            
            estado = 'cumplida' if progreso >= 100 else ('en_riesgo' if (dias_restantes and dias_restantes <= 30 and progreso < 50) else 'en_camino')
            if estado == 'cumplida':
                metas_cumplidas += 1
            elif estado == 'en_riesgo':
                metas_en_riesgo += 1
            
            metas_data.append({
                'id': meta.id,
                'nombre': meta.nombre,
                'cuenta': meta.cuenta.nombre,
                'monto_objetivo': float(meta.monto_objetivo),
                'monto_actual': float(meta.monto_actual),
                'progreso_porcentaje': round(progreso, 1),
                'faltante': round(faltante, 2),
                'fecha_limite': meta.fecha_limite.isoformat() if meta.fecha_limite else None,
                'dias_restantes': dias_restantes,
                'ritmo_semanal_necesario': round(ritmo_semanal, 2),
                'estado': estado,
            })
        
        # 3. Suscripciones
        suscripciones = Suscripcion.objects.filter(usuario=usuario).select_related('cuenta')
        suscripciones_data = []
        total_mensual = Decimal('0')
        proximos_cobros = []
        
        hoy = timezone.now().date()
        for sub in suscripciones:
            monto_mensual = sub.monto if sub.frecuencia == 'Mensual' else sub.monto / 12
            total_mensual += monto_mensual
            
            dias_hasta_pago = (sub.fecha_proximo_pago - hoy).days
            proximos_cobros.append({
                'nombre': sub.nombre,
                'monto': float(sub.monto),
                'fecha': sub.fecha_proximo_pago.isoformat(),
                'dias_hasta_pago': dias_hasta_pago,
                'cuenta': sub.cuenta.nombre,
                'frecuencia': sub.frecuencia,
            })
        
        proximos_cobros.sort(key=lambda x: x['dias_hasta_pago'])
        
        suscripciones_data = {
            'total_activas': suscripciones.count(),
            'total_mensual': float(total_mensual),
            'total_anual': float(total_mensual * 12),
            'proximos_cobros_30_dias': [s for s in proximos_cobros if s['dias_hasta_pago'] <= 30],
            'proximos_cobros_7_dias': [s for s in proximos_cobros if s['dias_hasta_pago'] <= 7],
        }
        
        # 4. Transacciones recientes (30 días)
        hace_30_dias = timezone.now() - timezone.timedelta(days=30)
        transacciones = Transaccion.objects.filter(
            usuario=usuario, fecha__gte=hace_30_dias
        ).select_related('cuenta').order_by('-fecha')
        
        gastos_30d = transacciones.filter(tipo='gasto')
        ingresos_30d = transacciones.filter(tipo='ingreso')
        
        total_gastos = gastos_30d.aggregate(total=Sum('monto'))['total'] or Decimal('0')
        total_ingresos = ingresos_30d.aggregate(total=Sum('monto'))['total'] or Decimal('0')
        
        # Top gastos por descripción (agrupado simple)
        top_gastos = gastos_30d.values('descripcion').annotate(
            total=Sum('monto'), count=Count('id')
        ).order_by('-total')[:5]
        
        transacciones_data = {
            'periodo_dias': 30,
            'total_transacciones': transacciones.count(),
            'total_gastos': float(total_gastos),
            'total_ingresos': float(total_ingresos),
            'balance_neto': float(total_ingresos - total_gastos),
            'top_gastos': [
                {'descripcion': g['descripcion'] or 'Sin descripción', 'total': float(g['total']), 'count': g['count']}
                for g in top_gastos
            ],
            'recientes': [
                {
                    'fecha': t.fecha.strftime('%Y-%m-%d'),
                    'tipo': t.tipo,
                    'monto': float(t.monto),
                    'descripcion': t.descripcion or 'Sin descripción',
                    'cuenta': t.cuenta.nombre,
                }
                for t in transacciones[:10]
            ],
        }
        
        # 5. Reporte financiero agregado (usar service existente)
        reporte = TransaccionService.obtener_reporte_financiero(usuario_id)
        
        # 6. Alertas automáticas
        alertas = []
        
        # Saldo bajo en cuentas
        for c in cuentas_data:
            if c['saldo_disponible'] < 10000:  # Umbral configurable
                alertas.append(f"Saldo disponible bajo en {c['nombre']}: ${c['saldo_disponible']:,.0f}")
        
        # Metas en riesgo
        for m in metas_data:
            if m['estado'] == 'en_riesgo':
                alertas.append(f"Meta '{m['nombre']}' en riesgo: {m['progreso_porcentaje']}% en {m['dias_restantes']} días")
        
        # Suscripciones por cobrar pronto
        for s in suscripciones_data['proximos_cobros_7_dias']:
            alertas.append(f"Suscripción '{s['nombre']}' se cobra en {s['dias_hasta_pago']} días (${s['monto']:,.0f})")
        
        # Gasto > ingresos
        if total_gastos > total_ingresos:
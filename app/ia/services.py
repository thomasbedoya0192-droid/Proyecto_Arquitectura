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


class LLMClient:
    """Cliente para llamar a la API de LLM (Groq/OpenAI)"""
    
    def __init__(self):
        self.provider = os.environ.get('LLM_PROVIDER', 'groq').lower()
        self.api_key = os.environ.get('LLM_API_KEY')
        self.model = os.environ.get('LLM_MODEL', 'llama-3.3-70b-versatile')
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY no configurada en variables de entorno")
    
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


def get_llm_client():
    """Lazy initialization del cliente LLM"""
    return LLMClient()


class FeedbackIAService:
    """Servicio principal para generar y gestionar feedback de IA"""
    
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
            alertas.append(f"Gastos superan ingresos en 30 días: ${float(total_gastos - total_ingresos):,.0f} de déficit")
        
        return {
            'usuario': {'id': usuario.id, 'username': usuario.username},
            'cuentas': cuentas_data,
            'resumen_cuentas': {
                'total_cuentas': len(cuentas_data),
                'saldo_total': float(saldo_total),
                'disponible_total': float(disponible_total),
                'reservado_total': float(reservado_total),
            },
            'metas': metas_data,
            'resumen_metas': {
                'total': len(metas_data),
                'en_riesgo': metas_en_riesgo,
                'cumplidas': metas_cumplidas,
                'en_camino': len(metas_data) - metas_en_riesgo - metas_cumplidas,
            },
            'suscripciones': suscripciones_data,
            'transacciones': transacciones_data,
            'reporte': reporte,
            'alertas_automaticas': alertas,
        }
    
    @staticmethod
    def _construir_contexto_seccion(contexto_completo: dict, seccion: str) -> str:
        """Construye el contexto específico para cada sección"""
        if seccion == 'general':
            return json.dumps(contexto_completo, ensure_ascii=False, indent=2)
        
        elif seccion == 'cuentas':
            return json.dumps({
                'cuentas': contexto_completo['cuentas'],
                'resumen': contexto_completo['resumen_cuentas'],
            }, ensure_ascii=False, indent=2)
        
        elif seccion == 'gastos':
            return json.dumps({
                'transacciones': contexto_completo['transacciones'],
            }, ensure_ascii=False, indent=2)
        
        elif seccion == 'metas':
            return json.dumps({
                'metas': contexto_completo['metas'],
                'resumen': contexto_completo['resumen_metas'],
            }, ensure_ascii=False, indent=2)
        
        elif seccion == 'suscripciones':
            return json.dumps({
                'suscripciones': contexto_completo['suscripciones'],
            }, ensure_ascii=False, indent=2)
        
        elif seccion == 'reportes':
            return json.dumps({
                'reporte': contexto_completo['reporte'],
                'transacciones_resumen': {
                    'total_gastos': contexto_completo['transacciones']['total_gastos'],
                    'total_ingresos': contexto_completo['transacciones']['total_ingresos'],
                    'balance_neto': contexto_completo['transacciones']['balance_neto'],
                }
            }, ensure_ascii=False, indent=2)
        
        return '{}'
    
    @classmethod
    def generar_feedback_usuario(cls, usuario_id: int, secciones: list = None, trigger: str = 'manual') -> dict:
        """Genera feedback para todas o algunas secciones de un usuario"""
        secciones = secciones or SECCIONES
        contexto = cls.obtener_contexto_completo(usuario_id)
        resultados = {}
        
        for idx, seccion in enumerate(secciones):
            try:
                contexto_seccion = cls._construir_contexto_seccion(contexto, seccion)
                prompt = PROMPTS[seccion].format(
                    contexto=contexto_seccion,
                    contexto_cuentas=contexto_seccion if seccion == 'cuentas' else '',
                    contexto_gastos=contexto_seccion if seccion == 'gastos' else '',
                    contexto_metas=contexto_seccion if seccion == 'metas' else '',
                    contexto_suscripciones=contexto_seccion if seccion == 'suscripciones' else '',
                    contexto_reportes=contexto_seccion if seccion == 'reportes' else '',
                )
                
                respuesta, tokens = get_llm_client().completar(prompt)
                
                FeedbackIA.objects.update_or_create(
                    usuario_id=usuario_id,
                    seccion=seccion,
                    defaults={
                        'contenido': respuesta,
                        'tokens_usados': tokens,
                        'trigger': trigger,
                    }
                )
                resultados[seccion] = respuesta
                
            except Exception as e:
                resultados[seccion] = f"Error generando feedback: {str(e)}"
            
            # small delay between sections to avoid rate limits
            if idx < len(secciones) - 1:
                time.sleep(1)
        
        return resultados
    
    @classmethod
    def debe_actualizar_por_evento(cls, usuario_id: int, evento_tipo: str, contexto_adicional: dict = None) -> bool:
        """Determina si debe regenerar feedback basado en el tipo de evento"""
        # Eventos que SÍ disparan feedback inmediato
        if evento_tipo in ['new_meta', 'new_suscripcion', 'large_gasto', 'meta_cumplida']:
            return True
        
        # Weekly: solo si pasó una semana desde la última actualización
        if evento_tipo == 'weekly':
            ultimo = FeedbackIA.objects.filter(usuario_id=usuario_id).order_by('-actualizado_en').first()
            if not ultimo:
                return True
            dias_desde_actualizacion = (timezone.now() - ultimo.actualizado_en).days
            return dias_desde_actualizacion >= 7
        
        # Pequeños gastos/transferencias: NO disparan
        return False
    
    @classmethod
    def verificar_gasto_grande(cls, usuario_id: int, cuenta_id: int, monto: Decimal) -> bool:
        """Verifica si un gasto supera el umbral porcentaje del saldo disponible"""
        try:
            cuenta = CuentaBancaria.objects.get(pk=cuenta_id, usuario_id=usuario_id)
            metas = cuenta.metas_ahorro.all()
            reservado = sum(m.monto_actual for m in metas)
            disponible = max(Decimal('0'), cuenta.saldo - reservado)
            
            if disponible > 0:
                porcentaje = monto / disponible
                return porcentaje >= UMBRAL_GASTO_GRANDE_PORCENTAJE
        except CuentaBancaria.DoesNotExist:
            pass
        return False
    
    @classmethod
    def obtener_feedback_usuario(cls, usuario_id: int, seccion: str = None) -> dict:
        """Obtiene feedback guardado del usuario"""
        qs = FeedbackIA.objects.filter(usuario_id=usuario_id)
        if seccion:
            qs = qs.filter(seccion=seccion)
        
        return {f.seccion: {
            'contenido': f.contenido,
            'tokens_usados': f.tokens_usados,
            'trigger': f.trigger,
            'actualizado_en': f.actualizado_en.isoformat(),
        } for f in qs}

    @staticmethod
    def _hash_context(ctx: dict) -> str:
        """Genera un hash SHA256 del contexto serializado ordenado."""
        serialized = json.dumps(ctx, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    @classmethod
    def build_full_context(cls, usuario_id: int) -> dict:
        """Obtiene el contexto completo y le añade context_hash."""
        contexto = cls.obtener_contexto_completo(usuario_id)
        contexto['context_hash'] = cls._hash_context(contexto)
        return contexto

    @staticmethod
    def _parse_master_answer(answer: str) -> dict:
        """Divide la respuesta maestra en las seis secciones esperadas."""
        sections = {}
        current = None
        lines = answer.splitlines()
        for line in lines:
            stripped = line.strip()
            if stripped.upper().endswith(':') and stripped.upper()[:-1] in ('GENERAL','CUENTAS','GASTOS','METAS','SUSCRIPCIONES','REPORTES'):
                current = stripped.upper()[:-1].lower()
                sections[current] = ''
            elif current:
                sections[current] += line + '\n'
        # strip trailing newlines
        for k in sections:
            sections[k] = sections[k].strip()
        return sections

    @classmethod
    def generate_full_feedback(cls, usuario_id: int, force: bool = False) -> dict:
        """Genera feedback de las seis secciones en una sola llamada al LLM, con caché por hash de contexto."""
        full_ctx = cls.build_full_context(usuario_id)
        ctx_hash = full_ctx.pop('context_hash')
        # check cache
        cached = FeedbackCache.objects.filter(usuario_id=usuario_id, context_hash=ctx_hash).first()
        if cached and not force:
            return cached.payload

        # prepare master prompt
        prompt = MASTER_PROMPT.format(context=json.dumps(full_ctx, ensure_ascii=False, indent=2))
        respuesta, tokens = get_llm_client().completar(prompt, max_tokens=1500)
        sections = cls._parse_master_answer(respuesta)

        # persist each section in FeedbackIA
        for sec, txt in sections.items():
            FeedbackIA.objects.update_or_create(
                usuario_id=usuario_id,
                seccion=sec,
                defaults={
                    'contenido': txt,
                    'tokens_usados': tokens // max(1, len(sections)),  # approx split
                    'trigger': 'manual',
                }
            )
        # save cache
        FeedbackCache.objects.update_or_create(
            usuario_id=usuario_id,
            context_hash=ctx_hash,
            defaults={'payload': sections}
        )
        return sections
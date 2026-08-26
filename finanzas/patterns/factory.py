from abc import ABC, abstractmethod


class AlertaNotificacion(ABC):
    """
    Clase base abstracta para notificaciones.
    Define la interfaz que deben implementar todos los notificadores.
    """

    @abstractmethod
    def enviar(self, mensaje: str) -> bool:
        """
        Envía una notificación.

        Args:
            mensaje: Contenido de la notificación

        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        pass


class NotificacionPush(AlertaNotificacion):
    """
    Notificación tipo Push (simulada).
    Representaría notificaciones push a dispositivos móviles.
    """

    def enviar(self, mensaje: str) -> bool:
        """
        Envía una notificación push simulada.
        """
        try:
            print(f"[PUSH NOTIFICATION] {mensaje}")
            return True
        except Exception as e:
            print(f"[PUSH ERROR] {str(e)}")
            return False


class NotificacionEmail(AlertaNotificacion):
    """
    Notificación tipo Email (simulada).
    Representaría envíos de email a través de servidor SMTP.
    """

    def enviar(self, mensaje: str) -> bool:
        """
        Envía una notificación por email simulada.
        """
        try:
            print(f"[EMAIL NOTIFICATION] {mensaje}")
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] {str(e)}")
            return False


class NotificacionSMS(AlertaNotificacion):
    """
    Notificación tipo SMS (simulada).
    Representaría envíos de SMS a través de API de terceros.
    """

    def enviar(self, mensaje: str) -> bool:
        """
        Envía una notificación SMS simulada.
        """
        try:
            print(f"[SMS NOTIFICATION] {mensaje}")
            return True
        except Exception as e:
            print(f"[SMS ERROR] {str(e)}")
            return False


class NotificacionWebhook(AlertaNotificacion):
    """
    Notificación tipo Webhook.
    Representaría notificaciones a través de webhooks HTTP.
    """

    def enviar(self, mensaje: str) -> bool:
        """
        Envía una notificación por webhook simulada.
        """
        try:
            print(f"[WEBHOOK NOTIFICATION] {mensaje}")
            return True
        except Exception as e:
            print(f"[WEBHOOK ERROR] {str(e)}")
            return False


class NotificationFactory:
    """
    Patrón Factory para crear instancias de notificadores.
    Permite crear dinámicamente diferentes tipos de notificaciones
    sin acoplar el código al tipo específico de implementación.
    """

    _tipos_soportados = {
        "push": NotificacionPush,
        "email": NotificacionEmail,
        "sms": NotificacionSMS,
        "webhook": NotificacionWebhook,
    }

    @staticmethod
    def get_notificacion(tipo: str) -> AlertaNotificacion:
        """
        Factory method que retorna una instancia del notificador solicitado.

        Args:
            tipo: Tipo de notificación (push, email, sms, webhook)

        Returns:
            AlertaNotificacion: Instancia del notificador

        Raises:
            ValueError: Si el tipo no está soportado
        """
        if tipo not in NotificationFactory._tipos_soportados:
            tipos_disponibles = ", ".join(NotificationFactory._tipos_soportados.keys())
            raise ValueError(
                f"Tipo de notificación '{tipo}' no soportado. "
                f"Tipos disponibles: {tipos_disponibles}"
            )
        return NotificationFactory._tipos_soportados[tipo]()

    @staticmethod
    def agregar_tipo_notificacion(tipo: str, clase: type) -> None:
        """
        Permite registrar dinámicamente nuevos tipos de notificaciones.

        Args:
            tipo: Identificador del nuevo tipo
            clase: Clase que implementa AlertaNotificacion
        """
        if not issubclass(clase, AlertaNotificacion):
            raise TypeError(
                f"La clase {clase.__name__} debe heredar de AlertaNotificacion"
            )
        NotificationFactory._tipos_soportados[tipo] = clase

    @staticmethod
    def obtener_tipos_disponibles() -> list:
        """
        Retorna lista de tipos de notificación disponibles.

        Returns:
            list: Lista de tipos soportados
        """
        return list(NotificationFactory._tipos_soportados.keys())

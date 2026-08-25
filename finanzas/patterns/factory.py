class AlertaNotificacion:
    def enviar(self, mensaje):
        pass


class NotificacionPush(AlertaNotificacion):
    def enviar(self, mensaje):
        print(f"[PUSH SIMULADO] {mensaje}")  # Aquí a futuro irá la API real


class NotificacionEmail(AlertaNotificacion):
    def enviar(self, mensaje):
        print(f"[EMAIL SIMULADO] {mensaje}")


class NotificationFactory:
    @staticmethod
    def get_notificacion(tipo: str) -> AlertaNotificacion:
        if tipo == "push":
            return NotificacionPush()
        elif tipo == "email":
            return NotificacionEmail()
        raise ValueError(f"Tipo de notificación '{tipo}' no soportado.")

# Wiki Técnica: Núcleo de Negocio y Exposición de API Profesional

## 1. Justificación de la Estructura de Carpetas
Para esta entrega, adaptamos la arquitectura tradicional de Django hacia una estructura basada en capas con el fin de garantizar el Principio de Responsabilidad Única (SRP) y lograr un desacoplamiento total del sistema.

* **`models.py`:** Contiene estrictamente las entidades de dominio y las validaciones de integridad de datos a nivel de base de datos y entidad (como evitar saldos negativos o transferencias entre la misma cuenta).
* **`services.py`:** Centraliza toda la lógica de negocio y los flujos transaccionales (como la ejecución de transferencias y validación de topes). Esto elimina por completo los anti-patrones de *Fat Views* o *Fat Models*[cite: 1].
* **`serializers.py` y `views.py`:** Conforman la capa de presentación utilizando Django Rest Framework (DRF), dedicadas de forma exclusiva a la estructuración de datos de entrada/salida, validación de peticiones y control de códigos de estado HTTP (201, 400, 404, 409)[cite: 1].
* **`patterns/`:** Aísla la lógica de los patrones creacionales requeridos:
  * **Builder (`builder.py`):** Encargado del ensamblaje paso a paso de la entidad compleja de Transacciones[cite: 1].
  * **Factory (`factory.py`):** Gestiona la creación dinámica de variantes de dependencias externas (sistema de alertas y notificaciones)[cite: 1].

---

## 2. Diagrama de Secuencia (Flujo de Transferencia y Topes)
El siguiente diagrama describe la interacción de los componentes durante la ejecución de una transferencia con validación de umbrales:

```mermaid
sequenceDiagram
    actor Usuario
    participant View as TransferenciaAPIView
    participant Serializer as TransferRequestSerializer
    participant Service as TransferService
    participant DB as Base de Datos (Cuenta)
    participant Builder as TransactionBuilder
    participant Factory as NotificationFactory

    Usuario->>View: POST /transferir/ (origen, destino, monto)
    View->>Serializer: Validar datos de entrada
    Serializer-->>View: Datos válidos
    View->>Service: execute_transfer(...)
    Service->>DB: Verificar saldo y actualizar cuentas
    Service->>Builder: Construir entidad Transacción
    Builder-->>Service: Objeto Transaccion ensamblado
    Service->>DB: Guardar Transacción
    Service->>Service: _check_budget_limits()
    alt Saldo < Umbral Alerta
        Service->>Factory: get_notificacion('push')
        Factory-->>Service: Instancia NotificacionPush
        Service->>Usuario: Enviar alerta (Simulada)
    end
    Service-->>View: Retornar Transacción exitosa
    View-->>Usuario: HTTP 201 Created (JSON)



## Visión de Escalabilidad y Preparación para un API Gateway

El sistema está arquitectónicamente preparado para integrarse de manera limpia detrás de un 
API Gateway por las siguientes razones:

 - Controladores Ligeros (APIViews): Al no contener lógica de negocio, cálculos ni validaciones complejas, 
las vistas actúan únicamente como adaptadores de transporte HTTP

 - Desacoplamiento de Servicios: Toda la lógica reside en la capa de servicios (services.py), 
lo que permite que el backend pueda descomponerse o escalarse horizontalmente por dominios funcionales en el futuro

 - Integración con Gateway: Un API Gateway centralizado (como Kong, Tyk o AWS API Gateway) 
podrá encargarse de tareas transversales como autenticación por tokens JWT, limitación de peticiones (rate limiting)
balanceo de carga y ruteo, mientras que los endpoints de Django procesarán de forma estandarizada las solicitudes delegadas 
sin requerir modificaciones estructurales internas

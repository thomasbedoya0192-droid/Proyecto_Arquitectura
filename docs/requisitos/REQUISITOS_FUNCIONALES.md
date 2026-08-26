# Requisitos Funcionales del Sistema de Gestión Financiera

## Documento de Especificación de Requisitos Funcionales (FRS)

**Proyecto:** Sistema de Gestión de Transacciones Financieras  
**Versión:** 1.0  
**Fecha de Creación:** 2026-08-26  
**Estado:** En Desarrollo

---

## 📋 Índice de Requisitos

| Código | Descripción | Módulo | Prioridad |
|--------|-------------|--------|-----------|
| FR01 | Registrar transacción con detalles | Transacciones | Alta |
| FR02 | Visualizar historial cronológico | Transacciones | Alta |
| FR03 | Calcular balance en tiempo real | Cálculos | Alta |
| FR04 | Clasificar gastos por categoría | Categorización | Alta |
| FR05 | Editar y eliminar transacciones | Transacciones | Alta |
| FR06 | Extraer datos de texto libre | Entrada de Datos | Media |
| FR07 | Gestionar múltiples cuentas | Cuentas | Alta |
| FR08 | Asociar transacción a cuenta | Cuentas | Alta |
| FR09 | Generar resumen gráfico mensual | Reportes | Media |
| FR10 | Filtrar transacciones por fecha | Búsqueda | Alta |
| FR11 | Establecer presupuestos por categoría | Presupuestos | Media |
| FR12 | Exportar reportes en PDF | Reportes | Media |
| FR13 | Crear etiquetas personalizadas | Categorización | Baja |
| FR14 | Calcular indicadores de tendencia | Análisis | Media |
| FR15 | Búsqueda avanzada con múltiples criterios | Búsqueda | Media |
| FR16 | Registrar historial de cambios (auditoría) | Auditoría | Baja |
| FR17 | Importar transacciones desde CSV/Excel | Importación | Media |
| FR18 | Generar análisis de flujo de caja | Análisis | Media |
| FR19 | Establecer y monitorear metas de ahorro | Metas | Baja |
| FR20 | Sincronizar datos entre dispositivos | Sincronización | Media |

---

## 🔹 MÓDULO 1: TRANSACCIONES

### FR01 - Registrar transacción con detalles

**Descripción:**  
El sistema debe permitir registrar una transacción especificando monto, fecha, tipo (ingreso/gasto) y descripción.

**Criterios de Aceptación:**
- ✓ El usuario debe poder ingresar el monto de la transacción
- ✓ El sistema debe permitir seleccionar la fecha (predeterminada: hoy)
- ✓ El usuario debe elegir si es ingreso o gasto
- ✓ Se debe incluir un campo de descripción opcional
- ✓ Los datos deben guardarse en la base de datos
- ✓ Se debe mostrar un mensaje de confirmación al guardar

**Flujo Principal:**
1. Usuario accede a la sección "Nueva Transacción"
2. Ingresa monto, selecciona fecha, tipo y descripción
3. Hace clic en "Guardar"
4. Sistema valida los datos y guarda en BD
5. Muestra confirmación al usuario

---

### FR02 - Visualizar historial cronológico

**Descripción:**  
El sistema debe visualizar un historial cronológico completo de las transacciones registradas por el usuario.

**Criterios de Aceptación:**
- ✓ Mostrar todas las transacciones del usuario ordenadas por fecha (más recientes primero)
- ✓ Mostrar para cada transacción: fecha, monto, tipo, descripción, categoría
- ✓ Permitir scroll/paginación si hay muchos registros
- ✓ Usar colores diferenciados para ingresos (verde) y gastos (rojo)
- ✓ Mostrar el balance acumulado progresivo

**Flujo Principal:**
1. Usuario accede a "Historial de Transacciones"
2. Sistema carga y muestra todas las transacciones ordenadas cronológicamente
3. Usuario puede ver detalles completos de cada registro

---

### FR03 - Calcular balance en tiempo real

**Descripción:**  
El sistema debe calcular y mostrar el balance financiero total actualizando los datos en tiempo real tras cada registro.

**Criterios de Aceptación:**
- ✓ Balance = Suma de ingresos - Suma de gastos
- ✓ Actualizar automáticamente después de cada transacción
- ✓ Mostrar balance total en un lugar destacado (dashboard)
- ✓ Mostrar total ingresos, total gastos por separado
- ✓ El cálculo debe ser instantáneo

**Fórmula:**
```
Balance Total = ΣIngresos - ΣGastos
```

---

### FR05 - Editar y eliminar transacciones

**Descripción:**  
El sistema debe permitir la edición y eliminación de cualquier transacción previamente guardada.

**Criterios de Aceptación:**
- ✓ Usuario debe poder editar cualquier campo de la transacción
- ✓ Cambios se guardan y se actualiza el balance automáticamente
- ✓ Usuario debe poder eliminar transacciones con confirmación
- ✓ Se debe mostrar alerta de confirmación antes de eliminar
- ✓ El balance se recalcula después de eliminar

**Seguridad:**
- Solicitar confirmación antes de eliminar
- Opcional: Mantener registros de eliminaciones en auditoría

---

## 🔹 MÓDULO 2: CUENTAS

### FR07 - Gestionar múltiples cuentas

**Descripción:**  
El sistema debe permitir la creación y gestión de múltiples cuentas o carteras virtuales (ej. Banco, Efectivo).

**Criterios de Aceptación:**
- ✓ Usuario puede crear nuevas cuentas con nombre personalizado
- ✓ Especificar balance inicial de la cuenta
- ✓ Editar nombre y balance inicial
- ✓ Eliminar cuentas (si no tienen transacciones)
- ✓ Ver lista de todas las cuentas con sus datos
- ✓ Mostrar balance actual de cada cuenta

**Ejemplos de Cuentas:**
- Banco Santander
- Efectivo
- Billetera Digital
- Tarjeta de Crédito
- Ahorros

---

### FR08 - Asociar transacción a cuenta

**Descripción:**  
El sistema debe asociar obligatoriamente cada transacción registrada a una cuenta virtual específica.

**Criterios de Aceptación:**
- ✓ Al crear transacción, seleccionar cuenta obligatoriamente
- ✓ No permitir guardar sin cuenta seleccionada
- ✓ Mostrar cuenta en el historial de transacciones
- ✓ Filtrar transacciones por cuenta
- ✓ El balance de cada cuenta se calcula independientemente

---

## 🔹 MÓDULO 3: CATEGORIZACIÓN

### FR04 - Clasificar gastos por categoría

**Descripción:**  
El sistema debe permitir clasificar los gastos mediante una lista de categorías predefinidas.

**Criterios de Aceptación:**
- ✓ Mostrar lista de categorías predefinidas
- ✓ Categorías sugeridas: Alimentación, Transporte, Entretenimiento, Salud, etc.
- ✓ Asignar categoría al registrar transacción
- ✓ Mostrar categoría en historial
- ✓ Agrupar gastos por categoría en reportes

**Categorías Predefinidas:**
- Alimentación
- Transporte
- Salud
- Entretenimiento
- Compras
- Servicios
- Educación
- Otros

---

### FR13 - Crear etiquetas personalizadas

**Descripción:**  
El sistema debe permitir crear etiquetas personalizadas adicionales para organizar y clasificar las transacciones de forma flexible.

**Criterios de Aceptación:**
- ✓ Usuario puede crear etiquetas personalizadas con nombre y color
- ✓ Asignar múltiples etiquetas a una transacción
- ✓ Editar y eliminar etiquetas
- ✓ Filtrar transacciones por etiqueta
- ✓ Mostrar etiquetas en el historial

**Ejemplos de Etiquetas:**
- #urgente
- #deuda
- #proyecto
- #viaje
- #regalo

---

## 🔹 MÓDULO 4: ENTRADA DE DATOS AVANZADA

### FR06 - Extraer datos de texto libre

**Descripción:**  
El sistema debe extraer automáticamente el monto y la descripción al procesar bloques de texto libre ingresados por el usuario.

**Criterios de Aceptación:**
- ✓ Usuario ingresa texto como: "Compré café por $5.50"
- ✓ Sistema extrae: monto ($5.50), descripción (Compré café)
- ✓ Permitir corrección manual si la extracción es incorrecta
- ✓ Usar patrón de búsqueda para números y monedas
- ✓ Completar otros campos manualmente (fecha, tipo, categoría)

**Patrones Soportados:**
```
"Gané $1000 de freelance"
"Gasté 50 en cine"
"Depósito de 2000 al banco"
"$100 en comida ayer"
```

---

## 🔹 MÓDULO 5: REPORTES Y ANÁLISIS

### FR09 - Generar resumen gráfico mensual

**Descripción:**  
El sistema debe generar un gráfico de resumen mensual que agrupe y totalice los gastos por categoría.

**Criterios de Aceptación:**
- ✓ Mostrar gráfico de barras o pastel con gastos por categoría
- ✓ Permitir seleccionar mes/año a visualizar
- ✓ Mostrar valores en dinero y porcentaje
- ✓ Incluir categoría con mayor gasto destacada
- ✓ Datos actualizados en tiempo real

**Tipos de Gráficos:**
- Gráfico de pastel (proporciones)
- Gráfico de barras (comparativa)
- Tabla resumen

---

### FR12 - Exportar reportes en PDF

**Descripción:**  
El sistema debe generar reportes en formato PDF exportables con resumen de transacciones, balance y gráficos de análisis financiero.

**Criterios de Aceptación:**
- ✓ Generar PDF con transacciones de período seleccionado
- ✓ Incluir gráficos y análisis
- ✓ Mostrar balance inicial, final y cambios
- ✓ Incluir resumen por categoría
- ✓ Descargar o enviar por correo
- ✓ PDF debe ser profesional y bien formateado

**Contenido del PDF:**
- Encabezado con período
- Resumen de balance
- Tabla de transacciones
- Gráficos de análisis
- Totales por categoría

---

### FR14 - Calcular indicadores de tendencia

**Descripción:**  
El sistema debe calcular y mostrar indicadores de tendencia (promedio mensual, gasto máximo, ingreso mínimo) para análisis comparativo.

**Criterios de Aceptación:**
- ✓ Calcular promedio de gastos mensuales
- ✓ Calcular promedio de ingresos mensuales
- ✓ Mostrar gasto máximo registrado
- ✓ Mostrar ingreso mínimo registrado
- ✓ Comparar con períodos anteriores
- ✓ Mostrar tendencia (↑ aumento, ↓ disminución)

**Indicadores:**
```
Promedio Mensual de Gastos: $500
Promedio Mensual de Ingresos: $2000
Gasto Máximo: $800 (Categoría: Electrónica)
Ingreso Mínimo: $1500
Tendencia: ↓ -5% vs mes anterior
```

---

### FR18 - Generar análisis de flujo de caja

**Descripción:**  
El sistema debe generar un análisis de flujo de caja mensual mostrando ingresos vs egresos por período.

**Criterios de Aceptación:**
- ✓ Mostrar comparativa ingresos vs gastos mes a mes
- ✓ Gráfico de líneas mostrando tendencia
- ✓ Tabla con datos detallados
- ✓ Indicar períodos con superávit/déficit
- ✓ Proyección de flujo futuro (opcional)

---

## 🔹 MÓDULO 6: BÚSQUEDA Y FILTRADO

### FR10 - Filtrar transacciones por fecha

**Descripción:**  
El sistema debe permitir filtrar el listado de transacciones utilizando rangos de fechas definidos por el usuario.

**Criterios de Aceptación:**
- ✓ Selector de fecha inicio y fecha fin
- ✓ Filtros predefinidos: Hoy, Esta semana, Este mes, Últimos 3 meses
- ✓ Mostrar solo transacciones en el rango seleccionado
- ✓ Actualizar balance y totales según filtro
- ✓ Permitir limpiar filtro

---

### FR15 - Búsqueda avanzada con múltiples criterios

**Descripción:**  
El sistema debe permitir la búsqueda avanzada de transacciones por múltiples criterios (monto, descripción, categoría, cuenta, fecha).

**Criterios de Aceptación:**
- ✓ Filtrar por monto (rango)
- ✓ Buscar en descripción (texto libre)
- ✓ Filtrar por categoría
- ✓ Filtrar por cuenta
- ✓ Filtrar por rango de fechas
- ✓ Combinar múltiples criterios simultáneamente
- ✓ Mostrar cantidad de resultados encontrados

**Ejemplo de Búsqueda:**
```
Criterios:
- Monto: $10 - $100
- Categoría: Alimentación
- Cuenta: Efectivo
- Período: Últimos 30 días
- Descripción: "café"

Resultado: 3 transacciones encontradas
```

---

## 🔹 MÓDULO 7: PRESUPUESTOS Y METAS

### FR11 - Establecer presupuestos por categoría

**Descripción:**  
El sistema debe permitir establecer presupuestos mensuales por categoría y alertar al usuario cuando el gasto se aproxime al límite establecido.

**Criterios de Aceptación:**
- ✓ Definir presupuesto máximo por categoría
- ✓ Mostrar gasto actual vs presupuesto
- ✓ Barra de progreso visual
- ✓ Alerta cuando se alcanza 80% del presupuesto
- ✓ Alerta cuando se excede el presupuesto
- ✓ Editar presupuestos en cualquier momento

**Ejemplo:**
```
Categoría: Alimentación
Presupuesto: $300
Gasto actual: $240 (80%)
Estado: ⚠️ Aproximándose al límite
```

---

### FR19 - Establecer y monitorear metas de ahorro

**Descripción:**  
El sistema debe permitir establecer metas de ahorro y mostrar progreso visual hacia el cumplimiento de objetivos.

**Criterios de Aceptación:**
- ✓ Crear metas con nombre y monto objetivo
- ✓ Establecer fecha límite
- ✓ Mostrar progreso en barra visual
- ✓ Mostrar cantidad ahorrada vs meta
- ✓ Mostrar tiempo restante
- ✓ Notificar cuando se alcance meta
- ✓ Editar o eliminar metas

**Ejemplo:**
```
Meta: Viaje a Europa
Objetivo: $5000
Ahorrado: $3200 (64%)
Tiempo restante: 2 meses
Ahorro mensual requerido: $900
```

---

## 🔹 MÓDULO 8: AUDITORÍA E IMPORTACIÓN

### FR16 - Registrar historial de cambios (auditoría)

**Descripción:**  
El sistema debe registrar un historial de cambios (auditoría) mostrando quién, cuándo y qué se modificó en cada transacción.

**Criterios de Aceptación:**
- ✓ Registrar usuario que realizó cambio
- ✓ Registrar fecha y hora exacta del cambio
- ✓ Mostrar valores anteriores y nuevos
- ✓ Acceder a historial desde vista de transacción
- ✓ Mostrar tipo de operación (creación, edición, eliminación)

**Registro de Auditoría:**
```
Transacción ID: 1234
Cambios:
- 2026-08-26 10:30 | usuario@email.com | Monto: $100 → $120
- 2026-08-26 10:35 | usuario@email.com | Categoría: Otros → Alimentación
- 2026-08-26 10:40 | usuario@email.com | Descripción: "Compra" → "Almuerzo en restaurante"
```

---

### FR17 - Importar transacciones desde CSV/Excel

**Descripción:**  
El sistema debe permitir importar transacciones desde archivos CSV/Excel con validación automática de datos.

**Criterios de Aceptación:**
- ✓ Soportar formato CSV y Excel
- ✓ Validar estructura del archivo
- ✓ Mapeo de columnas automático o manual
- ✓ Validar datos antes de importar
- ✓ Mostrar errores encontrados
- ✓ Permitir corregir datos antes de confirmar
- ✓ Importar lote de transacciones

**Formato Esperado:**
```
fecha,monto,tipo,descripción,categoría,cuenta
2026-08-01,50.00,gasto,Almuerzo,Alimentación,Efectivo
2026-08-02,100.00,ingreso,Freelance,Otros,Banco
2026-08-03,20.50,gasto,Café,Alimentación,Efectivo
```

---

## 🔹 MÓDULO 9: SINCRONIZACIÓN

### FR20 - Sincronizar datos entre dispositivos

**Descripción:**  
El sistema debe sincronizar datos entre dispositivos manteniéndolos actualizados en tiempo real.

**Criterios de Aceptación:**
- ✓ Sincronizar automáticamente cambios entre web y mobile
- ✓ Detectar cambios en tiempo real
- ✓ Resolver conflictos de sincronización
- ✓ Funcionamiento offline con sincronización posterior
- ✓ Mostrar estado de sincronización
- ✓ Permitir forzar sincronización manual

**Escenarios:**
```
1. Usuario registra transacción en web
2. Aparece automáticamente en app mobile

1. Usuario registra transacción en mobile (sin internet)
2. Se guarda localmente
3. Al recuperar conexión, se sincroniza con servidor
4. Se actualiza en web automáticamente
```

---

## 📊 Resumen de Requisitos

| Módulo | Requisitos | Total |
|--------|-----------|-------|
| Transacciones | FR01, FR02, FR03, FR05 | 4 |
| Cuentas | FR07, FR08 | 2 |
| Categorización | FR04, FR13 | 2 |
| Entrada de Datos | FR06 | 1 |
| Reportes y Análisis | FR09, FR12, FR14, FR18 | 4 |
| Búsqueda y Filtrado | FR10, FR15 | 2 |
| Presupuestos y Metas | FR11, FR19 | 2 |
| Auditoría e Importación | FR16, FR17 | 2 |
| Sincronización | FR20 | 1 |
| **TOTAL** | | **20** |

---

## 🔄 Estados de Requisitos

- **En Desarrollo:** FR01-FR10
- **Diseño:** FR11-FR15
- **Planificación:** FR16-FR20

---

## 📝 Notas

- Todos los requisitos están alineados con la arquitectura del proyecto
- Prioridades pueden ser ajustadas según capacidad del equipo
- Los criterios de aceptación son verificables y medibles
- Se recomienda implementar en el orden de prioridad

---

**Documento generado:** 2026-08-26  
**Versión:** 1.0


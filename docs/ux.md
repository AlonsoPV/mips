Actúa como un **Senior Product Designer especializado en SaaS B2B, restaurantes, dashboards operativos y data visualization**, además de Senior Frontend Developer.

Vamos a rediseñar Míps Connect http://127.0.0.1:5001/inicio  .

NO rediseñes toda la aplicación de una sola vez.

Trabajaremos una pantalla, la dejaremos completamente resuelta en UX, jerarquía, interacción y responsive, y sólo después pasaremos a la siguiente.

# CONTEXTO DEL PRODUCTO

Míps Connect es el **Hub digital de un restaurante**.

Centraliza información proveniente de:

- Uber Eats
- OpenTable
- WhatsApp Business
- Míps POS

El objetivo NO es crear un dashboard de Business Intelligence tradicional.

El producto debe ayudar al dueño o gerente a responder rápidamente:

- ¿Cómo va mi restaurante?
- ¿Qué está pasando hoy?
- ¿Hay algo que necesita mi atención?
- ¿Qué canal está funcionando mejor?
- ¿Dónde hay una oportunidad?
- ¿Qué está fallando?
- ¿Qué debería hacer?

# USUARIO OBJETIVO

Diseña principalmente para:

## Dueño / Director del restaurante

Tiene poco tiempo.

Puede revisar el sistema entre reuniones o durante operación.

No quiere interpretar gráficas complejas.

No quiere recorrer tablas enormes.

Necesita conclusiones.

## Gerente / Operador

Necesita profundizar cuando existe una incidencia.

Debe poder pasar rápidamente:

Resumen → causa → detalle → acción.

# REGLA CENTRAL DE UX

Cada pantalla debe seguir:

**¿Qué pasó? → ¿Por qué importa? → ¿Qué hago? → Ver detalle**

Nunca:

**Dato → otro dato → otra gráfica → tabla gigante**

Míps Connect debe sentirse más cercano a:

- un centro de control
- un asistente ejecutivo
- un hub operativo

y menos parecido a:

- Power BI
- Google Analytics
- un reporte financiero
- un ERP tradicional

# PRINCIPIOS VISUALES

Mantener una estética premium y gastronómica, pero aumentar significativamente:

- contraste
- jerarquía
- densidad útil
- escaneabilidad
- estados
- señales visuales

La interfaz actual utiliza demasiado espacio vertical y demasiado contenido con el mismo peso visual.

Corregirlo.

## Evitar

- grandes bloques vacíos
- listas largas de insights
- textos explicativos innecesarios
- tarjetas idénticas unas a otras
- 8 KPIs con la misma importancia
- información crítica debajo del fold
- uso excesivo del beige
- dashboards genéricos

## Priorizar

- información accionable
- señales de estado
- comparaciones
- tendencias
- alertas
- contextos
- drill-down
- visualizaciones compactas
- microinteracciones
- tooltips útiles

# SISTEMA DE PRIORIDAD VISUAL

Todo dato debe pertenecer a alguno de estos cuatro niveles:

### CRÍTICO
Requiere atención inmediata.

Ejemplo:
Pedidos atorados o integración caída.

### ATENCIÓN
Existe una desviación importante.

Ejemplo:
Cancelaciones +18%.

### OPORTUNIDAD
Existe algo aprovechable.

Ejemplo:
Producto creciendo 32%.

### INFORMATIVO
Contexto del negocio.

Ejemplo:
Ticket promedio $420.

Usar señales visuales diferentes.

No abusar del rojo.

# NUEVA FILOSOFÍA DE HOME

La Home NO debe mostrar todo.

Debe responder:

## 1. ¿Estoy bien?

Mostrar salud general del negocio y del Hub.

## 2. ¿Qué cambió?

Mostrar sólo 2–4 cambios significativos.

## 3. ¿Hay algo que atender?

Mostrar máximo 3 prioridades.

## 4. ¿Dónde está la oportunidad?

Mostrar 1–2 oportunidades accionables.

## 5. ¿Quiero investigar?

Permitir drill-down.

# REGLA PARA INSIGHTS

NO mostrar cinco insights como textos apilados.

Convertirlos en una sección:

**Prioridades de hoy**

Máximo 3 tarjetas.

Cada tarjeta contiene:

Etiqueta:
Atención / Oportunidad / Riesgo

Título claro.

Ejemplo:

**WhatsApp está absorbiendo reservaciones**

Texto:

42% de las conversaciones están relacionadas con reservas.

Dato secundario:

+16% vs. periodo anterior.

CTA:

Ver conversaciones →

---

Otro ejemplo:

**8 pedidos necesitaron reprocesamiento**

8 de 408 pedidos Uber.

98.0% procesados correctamente.

CTA:

Revisar incidencias →

# DISEÑO DE KPIs

No mostrar solamente:

1146

Mostrar:

### Actividad digital

1,146

↓ 1.1%

“14 eventos menos que el periodo anterior”

Tooltip:
Qué incluye exactamente el KPI.

Los KPIs principales deben ser clicables.

# INTRODUCIR STATUS BAR DEL HUB

En Home, cerca del encabezado, mostrar una barra muy compacta:

Hub operativo ●

Uber Eats ●
OpenTable ●
WhatsApp ●
Míps ●

Última sincronización:
18 segundos

2 pendientes

Esto genera inmediatamente sensación de producto vivo.

# UTILIZAR “HOY” COMO PRINCIPAL CONTEXTO

Aunque exista selector:

Hoy
7 días
30 días
90 días

La Home debe estar diseñada inicialmente pensando en:

**Hoy**

Porque el usuario operativo quiere primero saber qué está ocurriendo ahora.

Puede cambiar después a 30 días para análisis.

# HOME — NUEVA ESTRUCTURA

Para la pantalla Inicio usar esta estructura:

--------------------------------------------------

HEADER

Buenas tardes, Alonso.

**Todo está operando normalmente.**

o dinámicamente:

**Hay 2 situaciones que requieren atención.**

A la derecha:

Periodo
Última actualización

--------------------------------------------------

STATUS BAR

Uber Eats ● Operativo

OpenTable ● Operativo

WhatsApp ● Operativo

Míps ● Operativo

--------------------------------------------------

PRIMER BLOQUE

## Tu restaurante ahora

Máximo 4 métricas:

Ventas digitales

Pedidos

Reservaciones

Ticket promedio

Añadir variación.

--------------------------------------------------

SEGUNDO BLOQUE

## Prioridades

Máximo 3.

Ejemplo:

RIESGO
8 pedidos reprocesados.

OPORTUNIDAD
Domingo 14–16 h concentra 31% de las reservas.

OPORTUNIDAD
Rib Eye tiene ticket +41% vs promedio.

--------------------------------------------------

TERCER BLOQUE

## Así llega tu negocio

Diseñar como visualización horizontal compacta.

Uber Eats
408 pedidos

OpenTable
243 reservas

WhatsApp
495 conversaciones

↓

Míps
385 ventas confirmadas

No usar 4 tarjetas gigantes.

Crear flujo visual.

--------------------------------------------------

CUARTO BLOQUE

## Demanda

Heatmap día / hora.

Debe aparecer mucho más arriba.

Añadir selector:

Todos
Pedidos
Reservaciones
WhatsApp

--------------------------------------------------

QUINTO BLOQUE

## Qué está creciendo

Mostrar 3 elementos:

Producto
Canal
Horario

Ejemplo:

Hamburguesa Angus
+22%

Reservaciones domingo
+31%

WhatsApp reservaciones
+18%

--------------------------------------------------

SEXTO BLOQUE

## Última actividad

Mostrar únicamente 5 registros.

14:32
Pedido Uber
Confirmado

14:27
Reserva OpenTable
Recibida

14:21
WhatsApp
Nueva conversación

CTA:
Ver Hub →

--------------------------------------------------

# INTERACCIÓN

Todo debe permitir drill-down.

Click en:

Pedidos
→ Ventas y pedidos

Reservaciones
→ OpenTable

Conversaciones
→ WhatsApp

Error
→ Salud del Hub

Producto
→ detalle producto

Horario
→ vista demanda

No hacer botones que no funcionen.

# SIDEBAR

La sidebar actual tiene demasiadas opciones para una demo.

Reestructurar en:

Inicio

Hub

Operación
  Pedidos
  Reservaciones
  WhatsApp

Insights

Reportes

Salud del Hub

Configuración

“Clientes” y “Marketing” pueden permanecer dentro de Insights inicialmente.

Evitar saturar navegación.

# CONTEXTO DE CADA PÁGINA

Cada página debe comenzar con una pregunta.

Ejemplos:

Inicio
“¿Cómo está funcionando mi restaurante?”

Hub
“¿Está llegando correctamente la información?”

Pedidos
“¿Qué estamos vendiendo?”

Reservaciones
“¿Cuándo quieren venir nuestros clientes?”

WhatsApp
“¿Por qué nos están contactando?”

Insights
“¿Dónde están las oportunidades?”

Salud
“¿Está funcionando todo correctamente?”

Esto ayuda a mantener el producto centrado en decisiones.

# PANTALLAS QUE REDISEÑAREMOS

Orden obligatorio:

1. Inicio
2. Hub
3. Ventas y pedidos
4. Reservaciones
5. WhatsApp
6. Insights
7. Reportes
8. Salud del Hub

No pasar a la siguiente hasta que yo lo indique.

# PROCESO PARA CADA PANTALLA

Antes de modificar código:

Entrega brevemente:

1. Objetivo de la pantalla.
2. Qué decisión permite tomar.
3. Qué información es prioritaria.
4. Qué información debe eliminarse.
5. Estructura propuesta.

Después:

Implementa solamente esa pantalla.

# COMPONENTES REUTILIZABLES

Crear sistema de componentes:

KpiCard
StatusIndicator
InsightCard
PriorityCard
ChannelBadge
TrendIndicator
ChartCard
EmptyState
ErrorState
FilterBar
DataTable
HealthStatus
MetricTooltip
DrilldownDrawer

Evitar duplicar código.

# GRÁFICAS

Cada gráfica debe tener una razón de existir.

Antes de crear una gráfica preguntarse:

“¿Qué pregunta responde?”

Ejemplo:

Heatmap:
¿Cuándo ocurre la demanda?

Bar chart:
¿Qué producto vende más?

Line chart:
¿Cómo está cambiando algo?

Donut:
¿Cómo se distribuye?

No usar gráficas decorativas.

# MICROCOPY

Cambiar textos técnicos por lenguaje del restaurante.

NO:

Integration events.

SÍ:

Actividad del Hub.

NO:

Failed events.

SÍ:

Necesitan atención.

NO:

External ID.

SÍ:

ID del pedido.

# RESPONSIVE TABLET

El producto debe funcionar especialmente bien en tablet.

Desktop:
sidebar fija.

Tablet:
sidebar colapsable.

Home tablet:
KPIs 2x2.

Prioridades:
carrusel horizontal.

Heatmap:
scroll horizontal si es necesario.

# DETALLE VISUAL

La interfaz debe transmitir:

tecnología
control
hospitalidad
tranquilidad

No utilizar visuales excesivamente corporativos.

Mantener personalidad editorial pero mejorar:

- tipografía
- escala
- ritmo
- contraste
- señalización

# DATOS

Mantener los datos dummy existentes.

NO modificar arquitectura ni modelos todavía salvo que sea necesario para mejorar UX.

No romper endpoints.

# OBJETIVO DE ESTA ITERACIÓN

Vamos a empezar exclusivamente con:

# PANTALLA 1 — INICIO

Quiero que transformes la Home actual para que deje de sentirse como un reporte largo y se convierta en un **Executive Control Center**.

Una persona debe entender en máximo 10 segundos:

- cuánto está ocurriendo
- si existe algún problema
- qué está creciendo
- qué oportunidad hay
- si el Hub está sano

Reduce drásticamente el scroll inicial.

En desktop, intenta que dentro del primer viewport estén:

Header
Estado del Hub
KPIs
Prioridades

y que parte de la siguiente sección ya sea visible.

NO modifiques las otras pantallas todavía.

Cuando termines:

1. Describe qué cambiaste.
2. Explica por qué mejora la toma de decisiones.
3. Indica los componentes reutilizables creados.
4. Ejecuta lint/build/typecheck.
5. Corrige errores.
6. Espera mi aprobación antes de continuar con Hub.
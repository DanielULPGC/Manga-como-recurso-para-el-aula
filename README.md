# El manga como recurso didáctico
## Biblioteca Campus del Obelisco · Aula de Cómic · ULPGC

**Versión:** 5.16 | **app.js:** 7.16 | **datos.js:** 5.16

Aplicación web progresiva (PWA) para la gestión y explotación didáctica del
catálogo de manga de la Biblioteca Campus del Obelisco de la ULPGC. Permite
al profesorado explorar 279 títulos, generar recursos pedagógicos con IA,
planificar itinerarios de lectura y visualizar la cobertura curricular del fondo.

---

## Índice

1. [Estructura de archivos](#1-estructura-de-archivos)
2. [Inicio rápido](#2-inicio-rápido)
3. [Arquitectura](#3-arquitectura)
4. [Módulos principales](#4-módulos-principales)
5. [Esquema de datos](#5-esquema-de-datos)
6. [Panel docente](#6-panel-docente)
7. [Modo alumno](#7-modo-alumno)
8. [Seguridad y accesibilidad](#8-seguridad-y-accesibilidad)
9. [Mantenimiento del catálogo](#9-mantenimiento-del-catálogo)
10. [Modo DEBUG](#10-modo-debug)
11. [Changelog v5.8 → v5.16](#11-changelog-v58--v516)
12. [Deuda técnica conocida](#12-deuda-técnica-conocida)

---

## 1. Estructura de archivos

```
proyecto/
├── index.html          ← Punto de entrada. HTML de overlays, modales y SAs
├── sw.js               ← Service Worker — precaché offline, estrategia network-first
├── sw-register.js      ← Registro del SW externo (CSP compliance, desde v5.9)
├── manifest.json       ← Manifiesto PWA — nombre, iconos, display standalone
├── js/
│   ├── app.js          ← Lógica principal (~22.000 líneas, ver §3)
│   └── datos.js        ← Catálogo de 279 títulos
├── css/
│   └── estilos.css     ← Estilos (~8.600 líneas)
└── icons/
    └── icon.svg        ← Icono PWA maskable
```

> **Arquitectura de archivo único:** toda la lógica, datos y estilos residen
> en tres archivos sin proceso de compilación. Facilita el despliegue en
> cualquier servidor estático y el mantenimiento por personal no especializado.

---

## 2. Inicio rápido

```bash
# Opción A — servidor local (recomendada para PWA + SW)
npx serve .

# Opción B — Python
python3 -m http.server 8080

# Opción C — apertura directa (sin SW, sin PWA)
# Abrir index.html en el navegador
```

Navegadores compatibles: Chrome 111+, Firefox 113+, Safari 16.2+, Edge 111+.

---

## 3. Arquitectura

```
app.js
│
├── INFRAESTRUCTURA
│   ├── Logger            — Logging condicional (DEBUG flag)
│   ├── SafeStorage       — Adaptador localStorage con fallback en memoria
│   ├── FocusTrap         — Trampa de foco accesible para modales
│   └── sanitizeText()    — Limpieza XSS de entradas de usuario
│
├── HELPERS DE DATOS (v5.11–v5.16)
│   ├── usoP/usoArr/usoMatch         — Acceso a uso[] (array desde v5.11)
│   ├── nivelP/nivelArr/nivelMatch   — Acceso a nivel[] (array desde v5.11)
│   └── periodoP/periodoArr/periodoMatch — Acceso a periodo[] (array desde v5.16)
│
├── CONSTANTES DE VOCABULARIO
│   ├── USO_LABELS / USO_COLORS_V    — Etiquetas y colores de uso
│   ├── NIVEL_LABELS                 — Etiquetas de nivel
│   ├── PERIODO_VOCAB / PERIODO_LABELS / PERIODO_ORDER — Vocabulario de periodo
│   └── ODS_LABELS                   — Etiquetas ODS Agenda 2030
│
├── CATÁLOGO
│   ├── renderCatalog()   — Renderizado con virtual scrolling
│   ├── applyFilters()    — Filtrado uso × nivel × ODS × texto libre
│   ├── filterUso/filterNivel/filterOds — Activadores de filtro
│   └── searchCatalog()   — Búsqueda por título, autor, tip
│
├── VISTAS MODALES
│   ├── openFicha()       — Ficha de aula
│   ├── openLectura()     — Ficha de lectura guiada
│   ├── openRubrica()     — Rúbrica IA
│   ├── openComp()        — Comparador de hasta 3 títulos
│   ├── openMapa()        — Mapa curricular por ODS y nivel
│   ├── openVitrina()     — Drawer lateral con detalle del título
│   └── openExpres()      — Actividad exprés de aula
│
├── VISUALIZACIONES
│   ├── SankeyView v1.1   — Diagrama flujo nivel → uso → ODS (drill-through)
│   ├── HeatmapView v1.0  — Mapa cobertura curricular uso × nivel (drill-through)
│   └── Grafo D3          — Red de relaciones por uso y era
│
├── MODO ALUMNO
│   ├── openAlumno()      — Recorrido guiado de 5 pasos
│   └── PasaporteHistorial v1.0 — Librete acumulativo de lecturas (imprimible)
│
├── PANEL DOCENTE
│   ├── _pdStats()        — Estadísticas + SankeyView + HeatmapView inline
│   ├── _pdEditor()       — Editor de catálogo en tiempo real
│   ├── _pdImport()       — Importador CSV / JSON
│   ├── _pdExport()       — Exportación JSON / CSV
│   └── _pdValidar()      — Validador de integridad
│
├── ASISTENTE IA
│   ├── Chat libre        — Consultas sobre el catálogo
│   ├── Generador         — Fichas SA, rúbricas, actividades exprés
│   └── Historial         — Registro de documentos generados
│
└── DELEGACIÓN DE EVENTOS
    └── window[action]()  — Sistema data-action (CSP compliance sin onclick)
```

---

## 4. Módulos principales

### SankeyView (v1.1 · desde v5.10)

Diagrama de flujo curricular nivel → uso → ODS en SVG nativo.
Accesible desde Panel docente → Estadísticas.

| Gesto | Resultado |
|---|---|
| Clic simple | Focus mode — resalta flujos conectados |
| Doble clic / Enter | Drill-through: filtra catálogo y hace scroll |
| Filtro nivel/ODS | Recalcula con el subconjunto |
| ⬇ SVG | Exporta el diagrama |

### HeatmapView (v1.0 · desde v5.14)

Mapa de cobertura curricular uso × nivel. Renderizado inline en la pestaña
Estadísticas. Toggle ⚠ Ver lagunas resalta en rojo las celdas con ≤2 títulos
(17 de 40), orientando decisiones de adquisiciones. Doble clic en celda →
drill-through con `filterUso()` + `filterNivel()` simultáneos.

### PasaporteHistorial (v1.0 · desde v5.9)

Historial acumulativo de lecturas del Modo Alumno. Cada sesión completada
genera un sello hanko persistente en SafeStorage (clave `manga_pasaporte_hist_v1`).
El botón **⎙ Imprimir / PDF** clona el librete completo (portada + sellos +
lectura actual) y lo envía a la impresora con layout A4; el usuario elige
«Guardar como PDF» en el diálogo del sistema.

### Helpers de arrays (v5.11–v5.16)

Desde v5.11, `uso` y `nivel` son arrays. Desde v5.16, `periodo` también.

```javascript
usoP(t)           // → 'historia'
usoArr(t)         // → ['emocional', 'historia']
usoMatch(t, 'historia')  // → true

nivelP(t)         // → 'bachillerato'
nivelArr(t)       // → ['bachillerato', 'universidad']
nivelMatch(t, 'universidad')  // → true

periodoP(t)       // → 'Siglo XXI' (etiqueta legible)
periodoArr(t)     // → ['sigloXXI']
periodoMatch(t, 'sigloXXI')   // → true
```

---

## 5. Esquema de datos

```javascript
{
  titulo:  'Vagabond',
  autor:   'Takehiko Inoue · 2000',
  uso:     ['historia'],                        // array — categorías pedagógicas
  nivel:   ['bachillerato', 'universidad'],     // array — niveles educativos
  periodo: ['bajaEdadMedia', 'renacimiento'],   // array — periodos canónicos
  color:   '#5A3A1A',
  tip:     'Adaptación manga de la vida...',
  badges:  ['Historia'],
  niveles: ['Bachillerato', 'Universidad'],
  ods:     [4, 16],
  opac:    'https://opac.ulpgc.es/...',
}
```

**Vocabulario `uso` (8 valores):**
`historia` · `filosofia` · `ciencia` · `emocional` · `genero` · `lenguas` · `visual` · `inclusion`

**Vocabulario `nivel` (5 valores):**
`infantil` · `primaria` · `secundaria` · `bachillerato` · `universidad`

**Vocabulario `periodo` (19 valores canónicos, orden cronológico):**
`prehistoria` · `antiguedad` · `altaEdadMedia` · `bajaEdadMedia` · `renacimiento` ·
`edadModerna` · `ilustracion` · `romanticismo` · `industrialismo` · `imperialismo` ·
`primeraGM` · `entreguerras` · `segundaGM` · `guerraFria` · `globalizacion` · `sigloXXI` ·
`cienciaFiccion` · `fantasia` · `folkloreJapones`

---

## 6. Panel docente

Accesible desde el FAB → icono ✎.

| Pestaña | Función |
|---|---|
| Estadísticas | Métricas de uso + SankeyView + HeatmapView inline |
| Editor | CRUD de títulos con previsualización en tiempo real |
| Importar | CSV/JSON — normaliza `uso`/`nivel`/`periodo` a arrays |
| Exportar | JSON o CSV completo |
| Validar | Integridad del catálogo (campos, URLs, ODS) |
| Notas | Notas privadas del docente por título |

---

## 7. Modo alumno

Recorrido guiado de 5 pasos (FAB → icono 👤):

```
Paso 1 — Selección de título (filtro por uso y nivel)
Paso 2 — Presentación del título
Paso 3 — Lectura guiada
Paso 4 — Quiz + reflexión libre
Paso 5 — Pasaporte de lectura (librete hanko acumulativo + impresión A4)
```

---

## 8. Seguridad y accesibilidad

### Content Security Policy

`index.html` define CSP con `script-src 'self' https://cdnjs.cloudflare.com`.
**No se permiten `onclick` inline.** Toda la interactividad usa `data-action`:

```html
<button data-action="miAccion" data-arg="valor">Texto</button>
```

```javascript
// app.js — registrar en window
window.miAccion = function(arg) { /* lógica */ };
```

### WCAG 2.1 AA

Modales con `role="dialog"`, `aria-modal="true"` y `FocusTrap`. Botones con
`aria-label`. SankeyView y HeatmapView incluyen tabla alternativa accesible.

---

## 9. Mantenimiento del catálogo

### Edición directa de `datos.js`

Los tres campos array deben ser **siempre arrays** (desde v5.11/v5.16):

```javascript
uso:     ['emocional', 'historia'],   // ✓ correcto
nivel:   ['bachillerato'],             // ✓ correcto
periodo: ['sigloXXI'],                 // ✓ correcto
uso:     'emocional historia',         // ✗ incorrecto desde v5.11
```

Tras editar, incrementar `CACHE_NAME` en `sw.js` (p. ej. `v5.17`) para
forzar actualización de la caché en clientes con la PWA instalada.

### Modo DEBUG

```javascript
localStorage.setItem('manga_debug', '1'); location.reload();
// Desactivar:
localStorage.removeItem('manga_debug'); location.reload();
```

---

## 10. Modo DEBUG

Con DEBUG activo aparecen mensajes de: `Patch-v59` · `ArrayHelpers-v511` ·
`ArrayHelpers-v516` · `SankeyView` · `PasaporteHistorial` · `HeatmapView` ·
`Delegation` · `openFicha` y todos los módulos del Panel docente.

---

## 11. Changelog v5.8 → v5.16

### v5.9 — Corrección crítica CSP + PasaporteHistorial
**BUG-01 [CRÍTICO]** La CSP de v5.8 bloqueaba silenciosamente 45 `onclick`
inline: fichas, comparador, modo alumno, asistente IA, vocabulario, ranking.
Solución: migración completa a `data-action` con 29 funciones en `window`.

**BUG-02 [ALTO]** Script de registro del SW inline bloqueado por CSP.
Solución: extraído a `sw-register.js`.

**BUG-03 [MEDIO]** Botón «Ver ficha completa» del Modo Alumno paso 2 usaba
`onclick` multi-statement con `_makeVirtualCard` no expuesta en `window`.
Solución: `window.alumnoVerFicha()`.

**BUG-04 [MEDIO]** Leyenda del grafo D3 con `onclick` bloqueados.
Solución: `data-action="grafoHighlightDelegated"`.

**BUG-05 [BAJO]** `openFicha()` sin guarda de tipo.
Solución: `typeof card.querySelector !== 'function'` → return.

**NUEVO** PasaporteHistorial v1.0 — librete acumulativo de lecturas del Modo
Alumno con sellos hanko, estadísticas y persistencia en SafeStorage.

---

### v5.10 — SankeyView v1.0
Diagrama de flujo curricular nivel → uso → ODS en SVG nativo. Filtros por
nivel y ODS, exportación SVG, tabla accesible alternativa.

---

### v5.11 — Normalización `uso` y `nivel` → arrays
16 entradas con `uso` compuesto y 129 con `nivel` compuesto convertidas a
arrays en `datos.js`. Seis helpers añadidos en `app.js`.
Eliminados todos los patrones `.split()` del código.

---

### v5.12 — Drill-through Sankey → Catálogo
Doble clic en nodo del Sankey: cierra el diagrama, activa el filtro
(`filterUso/filterNivel/filterOds`) y hace scroll al catálogo con badge de
contexto. Enter con nodo enfocado: mismo efecto (accesibilidad teclado).

---

### v5.13 — Exportar PasaporteHistorial como PDF
`printPasaporte()` actualizada para clonar el librete completo (`.ph-wrap`)
en lugar de solo el panel inferior. CSS de impresión A4 con `@page`,
`print-color-adjust: exact`, pie de página automático con `::after`.

---

### v5.14 — HeatmapView v1.0
Mapa de cobertura curricular uso × nivel renderizado inline en la pestaña
Estadísticas. Escala de color proporcional, toggle de lagunas (≤2 títulos),
tabla accesible, drill-through con filtros dobles simultáneos y badge de
contexto. Sin dependencias nuevas (SVG nativo).

---

### v5.15 — BUG-06 + BUG-07
**BUG-06 [CRÍTICO]** `openLecturaFor`, `openQuizFor` y `openRubricaFor`
no estaban en `window`. El dispatcher `window[action]` las buscaba y fallaba
silenciosamente: los botones de acceso rápido de todas las SAs parecían inertes.
Solución: tres líneas `window.openXFor = openXFor`.

**BUG-07 [VISUAL]** El elemento «Reflexión exposición» del FAB estaba fuera de
`#fabItems`, renderizándose siempre visible y solapándose con el botón IA.
Solución: movido dentro de `#fabItems`.

---

### v5.16 — Vocabulario controlado `periodo` + infraestructura
`PERIODO_ORDER` (19 valores en orden cronológico estricto) y `PERIODO_LABELS`
(alias de `PERIODO_VOCAB`) añadidos a `app.js`. Los helpers `periodoArr`,
`periodoP` y `periodoMatch` completan la familia de helpers de arrays junto
con los de `uso` y `nivel`.

---

## 12. Deuda técnica conocida

| Elemento | Descripción | Prioridad |
|---|---|---|
| Línea temporal por periodo | Vista cronológica del catálogo usando `PERIODO_ORDER`. Habilitada por la normalización de v5.16. | Media |
| Export PDF pasaporte | Flujo completo sin diálogo del sistema (requeriría html2canvas u otro CDN). | Baja |
| Sincronización entre dispositivos | SafeStorage es local al navegador. | Futura |

---

*Documentación actualizada el 2026-05-01 · Biblioteca Campus del Obelisco · ULPGC.*

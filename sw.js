/**
 * sw.js — Service Worker para El manga como recurso didáctico
 * Biblioteca Campus del Obelisco · Aula de Cómic · ULPGC
 * Versión: 5.31  (catálogo completo oculto por sistema; solo búsqueda y filtros despliegan títulos)
 *
 * ── PROTOCOLO DE MANTENIMIENTO ─────────────────────────────────
 * Cada vez que se publique una nueva versión del recurso:
 *   1. Incrementar CACHE_NAME aquí (ej. 'manga-ulpgc-v5.9').
 *   2. Actualizar el número de versión en la cabecera de este archivo.
 *   3. Verificar que PRECACHE_ASSETS incluye todos los assets nuevos.
 * Sin este paso, los usuarios con caché previa no recibirán
 * las actualizaciones hasta que limpien el navegador manualmente.
 * ───────────────────────────────────────────────────────────────
 *
 * Estrategia de caché:
 *   · Cache First  → assets estáticos propios (HTML, CSS, JS, datos).
 *   · Network Only → APIs de IA (Claude, Gemini) — nunca se cachean.
 *   · Cache First  → fuentes Google (fonts.gstatic.com) — se cachean
 *     en primera visita para habilitar uso offline. Si Google actualiza
 *     los binarios de fuente, la invalidación ocurrirá en la siguiente
 *     visita con red cuando se bump-ee CACHE_NAME.
 */

'use strict';

/* ── VERSIÓN DE CACHÉ ── actualizar en cada release ── */
const CACHE_NAME = 'manga-ulpgc-v5.31';

/* ── Assets precacheados en la instalación del SW ─────────────────
   Incluir aquí cualquier archivo nuevo que se añada al proyecto. */
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/estilos.css',
  './js/app.js',
  './js/datos.js',
  './manifest.json',
  './icons/icon.svg',
];

/* ── Dominios que van SIEMPRE a red (nunca se cachean) ────────────
   · api.anthropic.com              → Claude API
   · googleapis.com                 → Google Fonts CSS + Gemini
   · generativelanguage.googleapis.com → Gemini API (explícito)
   fonts.gstatic.com se omite intencionalmente: los binarios de
   fuente se cachean para permitir uso offline en el aula. */
const NETWORK_ONLY_PATTERNS = [
  'api.anthropic.com',
  'googleapis.com',
  'generativelanguage.googleapis.com',
];

/* ── INSTALACIÓN: precachear assets estáticos ─────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())   // activa el SW nuevo inmediatamente
  );
});

/* ── ACTIVACIÓN: limpiar cachés de versiones anteriores ──────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)   // conserva solo la versión actual
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())      // toma control de pestañas abiertas
  );
});

/* ── FETCH: Cache First para assets, Network Only para IA ───── */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Network Only: nunca cachear llamadas a APIs de IA
  if (NETWORK_ONLY_PATTERNS.some(pattern => url.includes(pattern))) return;

  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache hit → responder desde caché
      if (cached) return cached;

      // Cache miss → ir a red y cachear la respuesta
      return fetch(event.request)
        .then(response => {
          // Cachear solo respuestas válidas del propio origen o CORS anónimo
          if (response.ok && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback offline: devolver index.html para navegación SPA
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Para otros recursos (imágenes, fuentes), fallo silencioso
        });
    })
  );
});

/* sw-register.js · El manga como recurso didáctico · ULPGC
   Extrae el registro del Service Worker del inline script de index.html
   para cumplir con la Content-Security-Policy (sin 'unsafe-inline').
   Parche v5.9 — BUG-02 fix */
'use strict';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(() => {
        // SW no disponible en file:// — solo funciona vía HTTP/HTTPS
      });
  });
}

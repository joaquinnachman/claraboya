# Claraboya — instrucciones para trabajar en este repo

Web de Claraboya Estudio (claraboyaestudio.netlify.app) y sus herramientas gratis para músicos.
Dueño: Joaquín Nachman. Es la fuente única: de acá salen la web, la web instalable y (próximamente) las apps de Android e iOS.

## Regla principal: una sola versión, todo se actualiza junto
- La versión está en `VERSION` (formato `7.0.0`). **Todo cambio publicado sube la versión**:
  - arreglos y ajustes chicos: el último número (7.0.0 → 7.0.1);
  - herramienta nueva o función nueva: el del medio (7.0.1 → 7.1.0);
  - cambio grande de la web o de las apps: el primero.
- Cada versión se anota en `CAMBIOS.md`, arriba de todo, en castellano rioplatense y sin tecnicismos.
- Nunca escribir el número de versión a mano en las páginas: se usa `{{VERSION}}` y lo completa `scripts/build.mjs`.
- Cuando existan las apps de Android e iOS, salen de este mismo repo y con este mismo número.

## Cómo se publica
- Netlify está conectado a la rama `main`: cada push publica solo (corre `node scripts/build.mjs && node scripts/check.mjs`).
- `web/` es el código fuente; `dist/` se genera y no se sube.
- Antes de subir: `node scripts/build.mjs && node scripts/check.mjs` tiene que dar ok.
- Probar en tamaño celular (375 px) y en compu, sin errores en la consola.

## Qué hay
- `web/index.html` + `style.css` + `main.js`: la página del estudio.
- `web/herramientas/`: el selector y las 9 herramientas (01 Matriz de acordes … 09 Buscador de BPM).
  - `assets/tools.js`: guardado local, copias, avisos y parámetros entre herramientas.
  - `assets/pwa.js`: service worker, botón Instalar y versiones en vivo de las apps.
  - `assets/vendor/`: librerías servidas desde la web (React, jsPDF, html2canvas). Nada de CDNs: tiene que andar sin internet.
- `web/sw.js`: service worker. Con internet pide todo a la red; sin internet sirve la copia guardada.
- `web/descargas/`: .apk propias. AirMix no está acá: `_redirects` la manda al último Release de `joaquinnachman/airmix`.

## AirMix
- Vive en su propio repo (`joaquinnachman/airmix`, apps nativas Kotlin + Swift). No se copia acá.
- La web toma de su último Release la descarga, la versión y el peso. Con publicar una versión de AirMix alcanza.

## Lo que NO va acá
- Herramientas internas del estudio (presupuestos, luces, disponibilidad semanal, respuestas a clientes): quedan afuera.
- Claves, tokens o datos de clientes: el repo es público.
- Precios, políticas comerciales o la dirección exacta del estudio (solo "Vicente López").

## Estilo
- Castellano rioplatense, cálido y directo. Evitar "calidad", "profesional" y "potencial".
- Colores de marca: tinta #1F2426, bordó #551112. Tipografías Bebas Neue y Montserrat (en `web/fonts/`).
- Sin espacios muertos: diseños compactos.

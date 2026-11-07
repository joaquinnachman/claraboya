# Claraboya — instrucciones para trabajar en este repo

Web de Claraboya Estudio (claraboyaestudio.netlify.app) y sus herramientas gratis para músicos.
Dueño: Joaquín Nachman. Es la fuente única: de acá salen la web, la web instalable y la APK de Android (iOS más adelante).

## Regla principal: una sola versión, todo se actualiza junto
- La versión está en `VERSION` (formato `7.1.0`) y vale para la web, la web instalada y la APK.
- **Los cambios se juntan y salen los lunes.** Se trabaja siempre en la rama `proxima`; nunca se sube directo a `main`.
- Cada cambio se anota en `CAMBIOS.md`, debajo de `## Próxima versión`, en castellano rioplatense y sin tecnicismos.
- Si el cambio es una herramienta o función nueva, subir el número del medio en `VERSION` (7.1.0 → 7.2.0), una sola vez por tanda.
  Si no se toca, al publicar se sube solo el último número.
- Nunca escribir el número de versión a mano en las páginas: se usa `{{VERSION}}` y lo completa `scripts/build.mjs`.

## Cómo se publica
- `Publicar versión` (`.github/workflows/publicar.yml`), lunes 9:00 de Argentina, o a mano desde Actions:
  1. cierra la versión (`scripts/cerrar-version.mjs`): número final y título en `CAMBIOS.md`;
  2. arma la APK oficial y crea el Release `vX.Y.Z` (marcado como último);
  3. pasa `proxima` a `main` y Netlify publica la web.
- La web toma, al publicarse, la AirMix vigente en ese momento (`_redirects` y textos), así cambia una vez por semana con todo lo demás.
- Cada push a `proxima` arma una APK de prueba (Release `prueba`, preliminar). No llega a la web ni a nadie más.
- Antes de subir: `node scripts/build.mjs && node scripts/check.mjs && node scripts/build-app.mjs` tiene que dar ok.
- Probar en tamaño celular (375 px), tablet y compu, en la web común y en modo app (`?app=1`), sin errores en la consola.

## Qué hay
- `web/index.html` + `style.css` + `main.js`: la página del estudio.
- `web/herramientas/`: el selector y las 10 herramientas (01 Matriz de acordes … 09 Buscador de BPM, 10 Piano).
  Herramienta nueva: sumarla al menú `.tn__tools` de todas las páginas, al selector, a `TOOL_NAMES` (tools.js), a `TOOLS` (app.js), al inicio de la app, al sitemap y a los textos que dicen cuántas son.
  - `assets/tools.js`: guardado local, copias, avisos, parámetros entre herramientas y `CB.saveFile` (en la APK guarda en Descargas/Claraboya).
  - `assets/pwa.js`: service worker y botón Instalar de la web.
  - `assets/app.js` + `app.css`: la interfaz de app (barra de arriba, barra de abajo, transiciones, botón atrás, pantalla encendida, aviso de versión nueva). Solo actúa con `<html data-app>`.
  - `assets/vendor/`: librerías servidas desde la web (React, jsPDF, html2canvas). Nada de CDNs: tiene que andar sin internet.
- `web/app/` (Inicio) y `web/app/estudio/` (Estudio): pantallas propias de la app. Barra de abajo: Inicio, Afinador, Piano, Metrónomo, Estudio.
- Modo app: lo activa un script chico en el `<head>` de cada página si es la APK, la web instalada o `?app=1`.
  En modo app se esconden cabecera, pie, textos de presentación y bloques de descarga de la web.
- `web/sw.js`: service worker. Con internet pide todo a la red; sin internet sirve la copia guardada.
- `app/`: la APK (Capacitor 6). `scripts/build-app.mjs` arma `app/www` desde `dist/`:
  marca las páginas con `data-app data-native` y cambia los links `carpeta/` por `carpeta/index.html`
  (el servidor interno de la APK no abre carpetas). En JS, para links entre herramientas usar `CB.toolUrl()`.
  - `app/native/MainActivity.java`: puente `window.ClaraboyaNativo` (guardar archivos, pantalla encendida, vibrar).
  - `app/keystore/claraboya.jks`: llave de firma, pública (mismo criterio que AirMix). No cambiarla: si cambia, hay que desinstalar para actualizar.
- La APK la arma GitHub Actions (`.github/workflows/app.yml`); no hay SDK de Android local.

## AirMix
- Vive en su propio repo (`joaquinnachman/airmix`, apps nativas Kotlin + Swift). No se copia acá.
- En la app aparece entre las herramientas, pero se baja aparte (es otra app).
- La web toma su último Release al publicarse cada lunes: descarga, versión y peso.

## Claraboya Grab
- Plugin VST3 para Cubase en Windows (y programa suelto), en su propio repo (`joaquinnachman/claraboyagrab`). No se copia acá.
- Cada push a su `main` publica un Release con `ClaraboyaGrab-Windows.zip`; la web lo toma al publicarse cada lunes
  (`/descargas/claraboya-grab.zip`, versión y peso), igual que AirMix.
- Aparece en la app y en la web para todos (decisión de Joaquín), siempre con la aclaración de que es para escuchar referencias.

## Lo que NO va acá
- Herramientas internas del estudio (presupuestos, luces, disponibilidad semanal, respuestas a clientes): quedan afuera.
- Claves, tokens o datos de clientes: el repo es público.
- Precios, políticas comerciales o la dirección exacta del estudio (solo "Vicente López").

## Estilo
- Castellano rioplatense, cálido y directo. Evitar "calidad", "profesional" y "potencial".
- Colores de marca: tinta #1F2426, bordó #551112. Tipografías Bebas Neue y Montserrat (en `web/fonts/`).
- Sin espacios muertos: diseños compactos.

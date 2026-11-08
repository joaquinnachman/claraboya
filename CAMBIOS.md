# Cambios

Una sola versión para todo: la web, las herramientas y las apps.
La versión vive en el archivo `VERSION`. Lo nuevo se anota en "Próxima versión" y sale los lunes.

## Próxima versión
- La app avisa sola cuando hay una versión nueva, muestra qué trae y se actualiza con un toque (baja la versión y abre el instalador de Android, sin pasar por el navegador).
- En Estudio se pueden activar las versiones de prueba, para recibir lo nuevo antes de que salga los lunes.
- Herramienta nueva, 10 · Piano: teclado para tocar con varios dedos y deslizar, sonidos de piano, eléctrico y órgano, pedal, calentamientos de voz que suben de a medio tono (de bajo a soprano), adivina en qué tonalidad está un tema según las notas que tocás, marca escalas y toca los acordes de la tonalidad.
- Inicio de la app rediseñado: accesos grandes a Afinador, Piano, Metrónomo y BPM, y las secciones Componer, Producir, Salir a tocar y Aparte en bloques separados, con atajos arriba para saltar a cada una.
- La barra de abajo de la app suma el Piano.
- App Claraboya para Android: las nueve herramientas en una app, con inicio propio, barra de abajo (Inicio, Afinador, Metrónomo, Estudio), transiciones y botón atrás.
- Ícono nuevo: los cuatro cuadros de Claraboya sobre negro (también en la web instalada).
- La web instalada se abre con la misma interfaz de app.
- En la app los archivos (PDF, copias) se guardan en Descargas/Claraboya y la pantalla queda prendida con el afinador y en el modo show.
- Sección Estudio: contacto, AirMix (se baja aparte), copia de todo lo guardado y aviso de versión nueva.
- Claraboya Grab (plugin de Cubase para bajar referencias de un link) aparece en la app y en la web y se baja aparte, siempre en su última versión.
- La APK suelta del afinador queda reemplazada por la app de Claraboya.
- Las versiones se juntan y salen solas los lunes: web, APK y AirMix al mismo tiempo.

## 7.0.0 — 5/11/2026
- La web y las herramientas pasan a vivir en este repo y se publican solas en Netlify con cada cambio (antes: zip a mano).
- La web se puede instalar como app en Android, iPhone, iPad y la compu, y las herramientas andan sin internet.
- Tarjeta "Claraboya en tu pantalla de inicio" en el selector de herramientas, con el botón Instalar o los pasos según el dispositivo.
- AirMix: la descarga apunta siempre a la última versión publicada en su repo, y el número de versión y el peso se leen de ahí.
- React, jsPDF y html2canvas se sirven desde la web (antes venían de un CDN), así la Matriz de acordes y el Rider técnico andan sin internet.
- La versión se ve en el pie de todas las páginas.
- Base: web v6 (27/10/2026).

# Cambios

Una sola versión para todo: la web, las herramientas y las apps.
La versión vive en el archivo `VERSION`. Lo nuevo se anota en "Próxima versión" y sale los lunes.

## Próxima versión
- Ícono nuevo de la app: los cuatro cuadros de la claraboya ahora son un vúmetro, para que se note que es una app de música. Es también el logo de toda la app (Inicio, Estudio y la pantalla de carga). En iPhone, para ver el ícono nuevo hay que borrar el acceso directo y volver a agregarlo a inicio.
- Rider técnico en otros idiomas: el PDF sale en castellano, inglés, portugués, francés, italiano o alemán (títulos, columnas, escenario y lo que vino de las plantillas, que se traduce solo; lo que escribiste vos queda igual). Con «Otro idioma…» escribís vos los textos, incluso con otros alfabetos (polaco, griego, ruso…).
- Stage plot rediseñado: en el celular ya no se corta ni se encima (el escenario es más alto, los íconos se adaptan al tamaño y los carteles de fondo y público quedan afuera del área), se puede bajar la página con el dedo encima, los íconos se agarran desde donde tocás, se mueven con el teclado y muestran su número de canal.
- En el PDF el stage plot sale claro (fondo blanco, para imprimir sin gastar tinta), siempre con la misma forma sin importar en qué pantalla lo armaste, con letras más grandes y los números de canal.
- Rider: la barra de Guardar y Exportar ocupa menos en el celular y en la app queda arriba de la barra de abajo.
- En la app, en el celular, el estado de guardado de arriba es solo un puntito, así entra el nombre de la herramienta.
- Arreglado: el recorrido de herramientas del selector no mostraba el Piano ni el Grabador de ideas.
- Herramienta nueva, 11 · Grabador de ideas: grabás una melodía o un riff (con o sin click, con un compás de cuenta), te dice en qué tono y a qué tempo está, guardás la letra y las notas al lado, y la mandás por WhatsApp o la guardás como archivo para abrirla en la compu. Desde cada idea vas directo al metrónomo o al piano con su tono.
- La lista de herramientas de la página del estudio suma el Piano y el Grabador de ideas.
- Metrónomo rediseñado para el dedo: el tempo se cambia girando una rueda, deslizando el número o dejando apretados − y +. La rueda titila con cada pulso y, en la app, Arrancar y Tap quedan siempre a mano.
- Afinador: en la app ocupa toda la pantalla, arranca solo si ya le diste permiso al micrófono y vibra cuando una cuerda queda afinada.
- En iPhone, el metrónomo, el piano y las demás herramientas que suenan se escuchan aunque el teléfono esté en silencio (al arrancar, pausan la música de otras apps).
- Botón «Pasale la app a un amigo» en Estudio, y página nueva claraboyaestudio.netlify.app/bajar que muestra cómo instalarla según el teléfono.
- Arreglado: adentro del afinador aparecía un botón de cerrar que no iba.

## 7.1.2 — 12/11/2026
- Ícono de la app con el logo más grande, en Android y en iPhone (en iPhone se ve al volver a agregarla a inicio).
- Arreglado: recién actualizada, la app ya no sigue avisando que hay una versión nueva.

## 7.1.1 — 9/11/2026
- iPhone y iPad: al abrir las herramientas desde Safari aparece un aviso para tenerla como app, con los pasos para agregarla a inicio. Agregada, se ve y anda igual que la app de Android.
- En iPhone la app usa toda la pantalla también dentro de las herramientas, no se agranda sola al escribir y no abre la vista previa al mantener apretado un botón.
- «Probarla ahora» abre la interfaz de app en la misma pestaña, y desde Estudio se puede volver a ver la página web de siempre.
- Metrónomo: en los celulares más angostos ya no se sale de la pantalla.

## 7.1.0 — 9/11/2026
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

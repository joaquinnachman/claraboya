# Claraboya

La web de Claraboya Estudio y sus herramientas para músicos, en un solo lugar.

- **Web:** https://claraboyaestudio.netlify.app
- **Herramientas:** https://claraboyaestudio.netlify.app/herramientas/

## Cómo se actualiza
1. Los cambios se suben a la rama `proxima` y se anotan en `CAMBIOS.md`, en "Próxima versión".
2. Cada cambio arma una APK de prueba (Releases → "prueba") para probarla antes que nadie.
3. Los lunes a las 9 sale todo junto, solo: APK oficial, web nueva y la AirMix del momento.
   Si hace falta antes: Actions → "Publicar versión" → Run workflow.
4. La app avisa en el Inicio cuando hay una versión nueva. La web instalada se actualiza sola.

La versión publicada se ve en el pie de cada página, en Estudio dentro de la app y en `/version.json`.

## Probar en la compu
```
node scripts/build.mjs
node scripts/check.mjs
node scripts/build-app.mjs   # contenido de la APK en app/www
npx serve dist                # la web; con ?app=1 se ve como la app
```

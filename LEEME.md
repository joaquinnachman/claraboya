# Claraboya

La web de Claraboya Estudio y sus herramientas para músicos, en un solo lugar.

- **Web:** https://claraboyaestudio.netlify.app
- **Herramientas:** https://claraboyaestudio.netlify.app/herramientas/

## Cómo se actualiza
1. Se cambia algo en `web/` y se sube el número en `VERSION` (y una línea en `CAMBIOS.md`).
2. Al subirlo a GitHub, Netlify arma y publica la web sola, en un minuto más o menos.
3. Quien tenga la web instalada como app ve la versión nueva la próxima vez que la abre con internet.
4. AirMix se actualiza desde su propio repo: la web siempre ofrece su última versión.

La versión publicada se ve en el pie de cada página y en `/version.json`.

## Probar en la compu
```
node scripts/build.mjs
node scripts/check.mjs
npx serve dist
```

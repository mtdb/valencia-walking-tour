# Valencia walking tour

Guía estática en español para descubrir Ciutat Vella a pie. Siete capítulos recorren Mercado, Lonja, Plaza Redonda, Catedral, Almoina/Virgen, Serranos y Carmen, con regreso a la misma plaza del Mercado. Funciona cualquier día; los interiores son decisiones del visitante y las duraciones son orientativas.

## Ejecutar y comprobar

Requiere Node.js 24 para las herramientas. La web no tiene dependencias de ejecución.

```sh
node tools/preview.mjs
```

Abre http://127.0.0.1:4173/valencia-walking-tour/. El servidor también admite la raíz para desarrollo.

```sh
node tools/check-tour.mjs
node --test tests/*.test.mjs
node tools/browser-smoke.mjs
node tools/build.mjs
```

La prueba de navegador requiere Chromium y el servidor activo. Genera capturas e informe en `captures/`. Utiliza previsiones sintéticas exclusivamente dentro de las pruebas; no se incluyen en `dist/`. También puedes usar `pnpm run check`, `pnpm test`, `pnpm run test:browser` y `pnpm run build`.

## Experiencia implementada

- Recorrido circular con historia, detalles visibles, transiciones, fuentes y glosario.
- Interiores de pago/gratis, condiciones de gratuidad, presupuesto orientativo y tiempo adicional según selección.
- Clima por horas para hoy y los próximos seis días, antes de las paradas, usando la fecha y hora de Valencia.
- Progreso y preferencias guardados localmente; Google Maps, OsmAnd o copia de coordenadas.
- Exportación de 16 referencias GPS en GPX, sin atribuirles una geometría peatonal medida.
- PWA con texto sin conexión tras la primera instalación completa. Las fotografías de Wikimedia se guardan al verse y muestran un mensaje si no pueden cargarse.

El clima consulta [Open-Meteo](https://open-meteo.com/en/docs) sin clave ni geolocalización. Reutiliza consultas durante 30 minutos; si falla la conexión conserva datos hasta 48 horas, siempre que incluyan hoy y mostrando que están guardados. Sin datos válidos ofrece reintento y AEMET. La API gratuita se destina a uso no comercial según sus [condiciones](https://open-meteo.com/en/terms). Ver [decisiones de UX](weather-ux.md).

## Contenido y mantenimiento

- [Ruta y fuentes](route.md): coordenadas, accesos, precios y horarios revisados el 07/10/2026.
- [Revisión adversaria](route-review.md): crítica histórica y práctica y resolución de pendientes.
- [Brief editorial](tour.md), [arquitectura](implementation-plan.md) y [patrones de referencia](project-patterns.md).
- [Créditos](IMAGE_CREDITS.md): autores, originales y licencias de las fotografías de Wikimedia Commons.

Las fichas se mantienen en `src/tour-data.js`. No se fijan fecha de viaje ni distancias exactas. Horarios y tarifas son referencias revisadas, no un calendario operativo en tiempo real; cada espacio enlaza información oficial. Las fotografías y sus atribuciones se mantienen en `src/photos.js`. Se cargan desde Wikimedia; el service worker guarda sólo las imágenes elegidas con respuesta válida. Las ilustraciones SVG anteriores permanecen como archivos de trabajo y ya no se muestran.

## Publicación y verificación

`dist/` contiene únicamente la web. Usa rutas relativas y admite GitHub Pages bajo `/valencia-walking-tour/`. El workflow `.github/workflows/pages.yml` verifica, prueba y prepara el artefacto. Para publicar hay que disponer de un repositorio y habilitar Pages con GitHub Actions; no se ha publicado desde esta sesión.

Al cambiar archivos publicados hay que incrementar el sufijo de versión de `CACHE` en `sw.js` (actualmente `v3`). Su caché está limitada al proyecto y sólo elimina versiones anteriores de Valencia. Navegación externa, enlaces y consultas nuevas del clima requieren conexión.

Pasaron integridad, 14 pruebas unitarias y comprobaciones de Chromium a 1440, 390 y 320 px, incluyendo navegación, persistencia y lectura sin conexión bajo subruta. La carga real de fotografías y la conexión a la API no pudieron verificarse desde la red de este entorno; éxito/error/reintento se verificaron con respuestas controladas.

Para inicializar Git, añadir `git@github.com:mtdb/valencia-walking-tour.git`, crear el commit, subir `main` y publicar, ejecuta desde una terminal con acceso a GitHub y permisos de escritura en `.git`:

```sh
bash tools/publish.sh
```

El script comprueba el proyecto y la autenticación, conserva cualquier remoto existente que sea distinto, configura Pages con GitHub Actions mediante la [API oficial de Pages](https://docs.github.com/en/rest/pages/pages), espera el despliegue y verifica la URL publicada. Si el repositorio remoto ya tiene un historial incompatible, Git rechazará el push; el script no fuerza ni sobrescribe su historial.

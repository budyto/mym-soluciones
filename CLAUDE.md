# CLAUDE.md — agencia-ia-web
## Grupo MyM: bitácora compartida (Matías, 2/11/2026)

Este repo es del Grupo MyM. Matías y Budy usan cuentas de Claude distintas; lo que conecta sus sesiones es la bitácora del repo `budyto/grupo-mym`.

- **Al empezar:** conectá también `budyto/grupo-mym` y leé su `CLAUDE.md` y las entradas de los últimos 7 días en `docs/bitacora/`.
- **Al cerrar** (cuando digan "cerrar sesión", o al terminar un trabajo): registrá la sesión en `grupo-mym/docs/bitacora/` con la skill `cerrar-sesion` de ese repo (plantilla en `docs/bitacora/README.md`), con commit y push en grupo-mym.
- Nunca claves, contraseñas, tokens ni datos de clientes en la bitácora.

## Cada js o css que cambia, con su ?v= nuevo (25/11/2026)

El `.htaccess` guarda los `.js` y `.css` un año en la caché: si cambian y la página los sigue pidiendo con el mismo `?v=`, la gente sigue con el viejo (pasó el 25/11 con `alta/alta.js`, lo arregló la PR #26).

- Cada vez que cambia un js o css local, subile el `?v=` (AAAAMMDDhhmm) en **todos** los HTML que lo cargan, y también en los js que lo cargan por código (`admin/acceso.js` pide `menu.js`, `panel/pieza.js` y `panel/aprendido.js` piden su css). Las muestras de `muestras/` llevan la versión que les pone `moldes/generar.mjs`.
- Todo js/css local se pide con `?v=`, salvo `admin/sw.js` (el `.htaccess` lo sirve sin caché).
- El control de GitHub (`.github/workflows/versiones.yml`) frena la PR si falta. Antes de subir: `node herramientas/versiones.js --base origin/main`. Para ver si lo publicado quedó viejo: `node herramientas/versiones.js --publicado`.

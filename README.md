# Velvet Beauty

Prototipo web **académico y local** del recorrido MS-01 → MS-02 → MS-03:

1. Consultar tres productos ficticios.
2. Abrir un detalle y elegir un tono disponible, sin preselección.
3. Agregar una unidad y comprobar la selección y su subtotal en el carrito.

## Alcance y decisiones

La carpeta inicial estaba vacía y no contenía una arquitectura técnica existente. Se eligió TypeScript estricto, sin framework, backend ni dependencias de ejecución. Se conserva la estructura del wireframe: catálogo, detalle/tonos y carrito; navegación responsive, controles nativos y aviso académico.

**Límite explícito del prototipo:** una selección de una unidad por sesión abierta. Repetir la misma operación no duplica; otra selección nunca reemplaza silenciosamente la anterior. La interfaz informa de ese límite y bloquea nuevos agregados tras el primero. Esto no establece la política comercial del futuro MVP, todavía pendiente de acuerdo.

El carrito está únicamente en memoria: **recargar la página lo vacía**. No se descuenta inventario ni se realiza una venta. No hay pagos, envío, edición de cantidades, registro, administración, filtros, asesoría o servicios externos.

## Arquitectura

```text
src/
  data/products.ts       # Catálogo ficticio, recibido como unknown
  domain/                # Tipos, validación, búsquedas, errores y carrito
  app/controller.ts      # Estado y coordinación; servicios inyectables para pruebas
  ui/                    # Pantallas y eventos; contenido mediante textContent
  main.ts                # Composición de la aplicación
  styles.css             # Responsive y estados visuales
scripts/
  build.mjs              # Compila TypeScript y copia recursos propios
  server.mjs             # Servidor estático local con cabeceras de seguridad
  dev-server.mjs         # Arranque local, solo 127.0.0.1
tests/
  unit/                  # Dominio y validación
  integration/           # Coordinación de módulos y servidor HTTP
  e2e/                   # Navegador real, teclado y responsive
```

La UI no es fuente de verdad para precios ni disponibilidad. El dominio valida la selección usando el catálogo validado. Los registros se copian y congelan para evitar mutaciones accidentales. La carga no introduce demoras ni fallos artificiales; las contingencias se prueban mediante dependencias inyectadas.

## Ejecutar

Requiere Node.js 24 o posterior y pnpm. Solo se instalan herramientas de desarrollo; no se descargan fuentes, imágenes ni bibliotecas durante el uso del prototipo.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm dev
```

Abrir `http://127.0.0.1:4173`. El servidor sirve `dist/`, por lo que hay que reconstruir después de modificar fuentes. Para cambiar el puerto: `PORT=4174 pnpm dev`.

## Pruebas de navegador

```sh
pnpm build
pnpm test:e2e
```

Las pruebas usan Playwright y Chrome instalado, sin descargar un navegador al ejecutar. Se puede indicar un ejecutable mediante `CHROME_EXECUTABLE_PATH`; si no existe un navegador compatible, la prueba debe reportar el fallo, no considerarse aprobada.

Las pruebas arrancan y cierran su propio servidor local, aislado del servidor de demostración. Las capturas, cuando se generan, quedan en `test-results/` y no forman parte del producto.

## Publicación en GitHub Pages

El proyecto incluye una copia estática en `docs/` para publicar desde la rama `main`, carpeta `/docs`. No requiere servidor de negocio ni instalar herramientas para visitar la demo.

Para actualizar la versión publicable tras cambiar el código:

```sh
pnpm build
pnpm prepare:pages
```

La preparación copia exclusivamente HTML, CSS y JavaScript compilados, junto con `.nojekyll`. Comprueba que no haya enlaces simbólicos ni archivos ajenos al build. `docs/` es contenido generado; las fuentes editables están en `src/`.

El carrito sigue siendo temporal y privado de cada página abierta: no comparte selecciones entre visitantes. El sitio público mantiene el aviso de simulación y no realiza pagos. La CSP del documento se conserva; las cabeceras específicas del servidor local dependen del alojamiento.

## Seguridad y privacidad

- No se solicitan datos personales ni credenciales.
- No se usa almacenamiento persistente ni se llama a APIs.
- Los datos se insertan como texto, sin interpretar HTML del catálogo.
- La CSP restringe los recursos al origen local y bloquea conexiones externas, objetos y formularios.
- El servidor acepta GET/HEAD, limita tipos de archivo y rechaza rutas que escapen de su raíz.
- Los errores inesperados no muestran detalles internos al usuario.

Estos controles son apropiados para esta demo. No sustituyen las validaciones de servidor, autenticación ni revisión de seguridad que requeriría una tienda real.

## Accesibilidad y aceptación

El recorrido usa etiquetas visibles, selección por radio, texto para agotados, foco visible, enlace para saltar al contenido y regiones estables para anunciar éxito o error. La navegación entre pantallas lleva el foco al título; agregar conserva el contexto del botón.

Criterios de aceptación del corte:

- Tres productos y precios ficticios visibles.
- Ningún tono preseleccionado.
- Un tono agotado no puede seleccionarse ni agregarse, incluso omitiendo la UI.
- El carrito refleja producto, tono, una unidad y precio correctos.
- Sin duplicados ni reemplazos silenciosos.
- Errores de carga y agregado recuperables sin perder la selección válida.
- Recorrido usable con teclado y sin desbordamiento horizontal en los tamaños comprobados.

**No se afirma conformidad WCAG 2.2 AA completa.** Las pruebas incluidas no reemplazan una auditoría con lectores de pantalla, ampliación y medición sistemática de todos los contrastes y estados.

## Fuera de alcance y riesgos pendientes

Política de varias variantes y cantidades, persistencia, pagos, entrega, condiciones comerciales, despliegue y operación real. Los resultados de pruebas deben leerse como evidencia del prototipo, no como validación de demanda o viabilidad comercial.

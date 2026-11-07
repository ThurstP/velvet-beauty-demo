# Evidencia de validación del prototipo

Fecha: 6 de noviembre de 2026. Proyecto académico local Velvet Beauty.

## Resultado ejecutado

| Verificación | Resultado real |
| --- | --- |
| TypeScript `tsc --noEmit` con configuración estricta | Aprobado, salida 0 |
| `node scripts/build.mjs` | Aprobado, salida 0; generado `dist/` |
| Pruebas unitarias del dominio | 23 aprobadas |
| Integración del controlador y dominio | 20 aprobadas |
| Integración HTTP y cabeceras de seguridad | 9 aprobadas |
| Navegador real con Playwright y Chrome instalado | 13 aprobadas |
| Total de pruebas finales | **65 aprobadas; 0 fallos; 0 omitidas** |
| Comprobación HTTP del servidor de demostración | HTTP 200, título correcto y cabecera CSP presente |

Las pruebas se ejecutaron con Node 24.22.1 del entorno de trabajo. La comprobación de tipos y el build utilizaron TypeScript 5.9.3; las pruebas de navegador, Playwright 1.62.1 y Chrome instalado.

## Comandos efectivamente ejecutados

Se utilizó la ruta absoluta del ejecutable Node disponible en el entorno; se abrevia aquí como `node`:

```sh
node node_modules/typescript/bin/tsc --noEmit
node scripts/build.mjs
node --test tests/unit/catalog.test.mjs tests/unit/cart.test.mjs tests/integration/controller.test.mjs tests/integration/server.test.mjs
node --test tests/e2e/app.test.mjs
```

La ejecución final de pruebas unitarias/integración terminó con 52 aprobadas. La ejecución final de navegador terminó con 13 aprobadas.

El primer intento de abrir Chrome fue bloqueado por el entorno. Se repitió con la autorización correspondiente. En la primera ejecución funcional, 12 pruebas pasaron y una comprobación del test no encontraba una región de error ya vacía y oculta. Se corrigió el selector de esa comprobación; la suite completa se repitió y aprobó las 13 pruebas. No se omitieron pruebas para obtener el resultado.

## Criterios de aceptación comprobados

- Catálogo con tres productos ficticios y aviso de simulación.
- Detalle sin tono preseleccionado; agregado deshabilitado hasta seleccionar.
- Tonos agotados identificados y bloqueados.
- Producto, tono, cantidad y subtotal correctos al agregar.
- Confirmación sin cambio automático de pantalla y conservación del foco en agregar.
- Reintentos sin duplicados y sin reemplazo silencioso de la selección existente.
- Carrito vacío real y pérdida esperada de su contenido al recargar.
- Selección mediante teclado, barra espaciadora, flechas, Tab y Enter.
- Catálogo, detalle y carrito sin desbordamiento horizontal a 320, 360, 768 y 1280 px.
- Error de carga, reintento y catálogo vacío probados mediante servicios inyectados.
- Error de agregado conserva el tono y permite reintentar, comprobado en integración.
- Precios y disponibilidad validados en dominio, no tomados del DOM.
- Nombres con HTML mostrados como texto literal, sin crear elementos ejecutables.
- CSP presente; recorrido sin solicitudes a terceros ni errores de consola en la prueba.
- HTTP restringido a GET/HEAD, extensiones admitidas y raíz estática.

Las capturas `test-results/desktop.png` y `test-results/mobile.png` se generaron en Chrome y se inspeccionaron visualmente: disposición legible y sin recortes apreciables en esas vistas.

## Límites de aceptación

El resultado acepta el **corte de prototipo MS-01 a MS-03**, no el MVP comercial completo. El carrito permite una selección de una unidad y solo vive en memoria. La política comercial de múltiples artículos continúa pendiente.

No hay backend, pagos, envío, administración, almacenamiento persistente ni publicación. No se modificó código previo: la carpeta estaba vacía al comenzar.

No se ha realizado una auditoría completa WCAG 2.2 AA, una revisión con lector de pantalla, pruebas de carga ni una evaluación de seguridad de producción. La revisión de seguridad efectuada corresponde al alcance estático y local de esta simulación.

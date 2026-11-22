# Agencia Creativa Visual — PWA para GitHub Pages

Versión para **demostración académica** preparada a partir del proyecto original. Solo contiene archivos públicos de frontend; no incluye claves, configuraciones de servidor ni información de suscripciones.

## Cómo publicar sin pagar hosting

1. Entra a https://github.com y crea/inicia sesión.
2. Selecciona **New repository**, nómbralo `agencia-pwa`, marca **Public**, y crea el repositorio.
3. Dentro del repositorio, selecciona **Add file → Upload files**.
4. Extrae el archivo ZIP descargado. Sube el contenido de la carpeta `PWA_Agencia_GitHub_Pages` (NO el ZIP ni la carpeta contenedora). Al cargar, `index.html`, `sw.js` y `manifest.webmanifest` deben quedar en la raíz del repositorio, junto con `assets/` e `icons/`.
5. Selecciona **Commit changes** para guardar.
6. En **Settings → Pages**, elige **Deploy from a branch**. En **Branch**, selecciona `main`, carpeta `/(root)` y **Save**.
7. Abre la dirección que GitHub muestre, normalmente `https://TUUSUARIO.github.io/agencia-pwa/`.

## Pruebas sugeridas

- Comprueba página y navegación, filtro de portafolio, menú móvil.
- Crea, edita y elimina borradores; recarga y verifica persistencia de IndexedDB.
- Abre DevTools → Application → Service Workers y verifica el registro.
- Carga el sitio una vez en línea, activa **Offline** en DevTools → Network, recarga y verifica el funcionamiento previsto.
- Verifica el manifiesto, los iconos y, si el dispositivo/navegador lo permite, la instalación.
- Ejecuta Lighthouse y guarda capturas con fecha, URL y versiones de navegador/dispositivo.

## Alcance de esta versión

La cotización **solo guarda borradores locales**: no envía solicitudes. Se omitieron del paquete público la consola administrativa, las notificaciones que requieren un servicio de envío y todos los archivos privados. Estas limitaciones deben quedar documentadas en el informe académico. La instalación PWA depende de las condiciones del navegador/dispositivo.

⚠️ No subas el ZIP original completo a un repositorio público: contiene configuración y material privado.

/**
 * Archivo OPCIONAL: mejora progresiva del portafolio público.
 * No depende de app.js ni de IndexedDB. No es necesario para la rúbrica.
 *
 * PENDIENTE DE INTEGRACIÓN: si tu compañero crea botones de filtro,
 * debe usar data-portfolio-filter="todos|fotografia|3d".
 * Cada tarjeta del portafolio lleva data-portfolio-category="fotografia|3d".
 * Si no hay botones ni tarjetas, el script no hace nada y no rompe la Home.
 */
(function () {
  function iniciarFiltros() {
    const botones = [...document.querySelectorAll('[data-portfolio-filter]')];
    const tarjetas = [...document.querySelectorAll('[data-portfolio-category]')];
    if (!botones.length || !tarjetas.length) return;

    for (const boton of botones) {
      boton.addEventListener('click', () => {
        const filtro = boton.dataset.portfolioFilter;
        for (const tarjeta of tarjetas) {
          tarjeta.hidden = filtro !== 'todos' && tarjeta.dataset.portfolioCategory !== filtro;
        }
        for (const otro of botones) {
          otro.setAttribute('aria-pressed', String(otro === boton));
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarFiltros, { once: true });
  } else iniciarFiltros();
})();

/**
 * Controlador público de Agencia Creativa Visual.
 *
 * Versión pública para GitHub Pages. La página, IndexedDB y la PWA funcionan
 * sin servicios externos. Los borradores permanecen en cada dispositivo.
 */

import {
  abrirBaseDatos,
  crearCotizacion,
  listarCotizaciones,
  obtenerCotizacion,
  actualizarCotizacion,
  eliminarCotizacion
} from './db.js';

const $ = id => document.getElementById(id);
let swRegistrationPromise = null;
let editandoId = null;

function avisar(id, mensaje, tipo = 'info') {
  const nodo = $(id);
  if (nodo) {
    nodo.textContent = mensaje;
    nodo.dataset.estado = tipo;
    nodo.setAttribute('role', 'status');
  }
  if (tipo === 'error') console.warn(mensaje);
}

function mensajeError(error) {
  if (!navigator.onLine || error instanceof TypeError) {
    return 'No hay conexión con el servidor. Las cotizaciones locales siguen disponibles.';
  }
  return error?.message || 'Ocurrió un error inesperado.';
}

function actualizarConexion() {
  const conectado = navigator.onLine;
  avisar('connection-status', conectado ? 'Con conexión' : 'Sin conexión — puedes guardar borradores', conectado ? 'ok' : 'offline');
}

/** El registro del SW es independiente de IndexedDB. */
async function registrarSW() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Este navegador no admite Service Workers.');
  }
  if (!window.isSecureContext) {
    throw new Error('La PWA requiere HTTPS o localhost.');
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(() => navigator.serviceWorker.ready)
      .catch(error => {
        swRegistrationPromise = null;
        throw error;
      });
  }
  return swRegistrationPromise;
}

async function iniciarPWA() {
  actualizarConexion();
  window.addEventListener('online', actualizarConexion);
  window.addEventListener('offline', actualizarConexion);

  try {
    await registrarSW();
    avisar('pwa-status', 'Aplicación preparada para uso sin conexión tras guardar los recursos.','ok');
  } catch (error) {
    avisar('pwa-status', `Service Worker: ${error.message}`, 'error');
  }
}

function camposCotizacion() {
  return {
    servicio: $('quote-service')?.value || '',
    descripcion: $('quote-description')?.value || '',
    nombre: $('quote-name')?.value || '',
    email: $('quote-email')?.value || '',
    presupuesto: $('quote-budget')?.value || '',
    fechaEntrega: $('quote-deadline')?.value || ''
  };
}

function elemento(etiqueta, texto, clase = '') {
  const nodo = document.createElement(etiqueta);
  if (texto !== undefined) nodo.textContent = String(texto);
  if (clase) nodo.className = clase;
  return nodo;
}

async function pintarCotizaciones() {
  const lista = $('quote-list');
  if (!lista) return;
  const registros = await listarCotizaciones();
  lista.replaceChildren();

  if (registros.length === 0) {
    lista.append(elemento('p', 'Todavía no tienes borradores de cotización.'));
    return;
  }

  for (const item of registros) {
    const articulo = elemento('article', undefined, 'cotizacion-card');
    const titulo = elemento('h3', item.servicio);
    const descripcion = elemento('p', item.descripcion);
    const etiqueta = elemento('small', 'Borrador local · No enviado a la agencia');
    const acciones = elemento('div', undefined, 'cotizacion-acciones');

    const editar = elemento('button', 'Editar');
    editar.type = 'button';
    editar.dataset.action = 'edit';
    editar.dataset.id = item.id;
    const borrar = elemento('button', 'Eliminar');
    borrar.type = 'button';
    borrar.dataset.action = 'delete';
    borrar.dataset.id = item.id;

    acciones.append(editar, borrar);
    articulo.append(titulo, descripcion, etiqueta, acciones);
    lista.append(articulo);
  }
}

async function inicializarCotizaciones() {
  try {
    await abrirBaseDatos();
    await pintarCotizaciones();
  } catch (error) {
    avisar('quote-feedback', `IndexedDB: ${error.message}`, 'error');
    return;
  }

  const formulario = $('quote-form');
  if (formulario) {
    formulario.addEventListener('submit', async event => {
      event.preventDefault();
      const boton = formulario.querySelector('[type="submit"]');
      if (boton) boton.disabled = true;
      try {
        const datos = camposCotizacion();
        if (editandoId !== null) {
          await actualizarCotizacion(editandoId, datos);
          avisar('quote-feedback', 'Borrador actualizado en este dispositivo.', 'ok');
        } else {
          await crearCotizacion(datos);
          avisar('quote-feedback', 'Borrador guardado localmente. Todavía NO fue enviado a la agencia.', 'ok');
        }
        editandoId = null;
        formulario.reset();
        await pintarCotizaciones();
      } catch (error) {
        avisar('quote-feedback', error.message, 'error');
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  $('quote-list')?.addEventListener('click', async event => {
    const boton = event.target.closest('button[data-action][data-id]');
    if (!boton) return;
    const id = Number(boton.dataset.id);
    try {
      if (boton.dataset.action === 'delete') {
        if (!window.confirm('¿Eliminar este borrador guardado?')) return;
        await eliminarCotizacion(id);
        if (editandoId === id) editandoId = null;
        avisar('quote-feedback', 'Borrador eliminado.', 'ok');
        await pintarCotizaciones();
      } else if (boton.dataset.action === 'edit') {
        const datos = await obtenerCotizacion(id);
        if (!datos) throw new Error('No se encontró el borrador.');
        if (!$('quote-form') || !$('quote-service') || !$('quote-description')) {
          throw new Error('Falta el formulario de edición en index.html.');
        }
        for (const [campo, valor] of Object.entries({
          'quote-service': datos.servicio,
          'quote-description': datos.descripcion,
          'quote-name': datos.nombre,
          'quote-email': datos.email,
          'quote-budget': datos.presupuesto,
          'quote-deadline': datos.fechaEntrega
        })) {
          if ($(campo)) $(campo).value = valor ?? '';
        }
        editandoId = id;
        avisar('quote-feedback', 'Editando borrador. Guarda los cambios para actualizarlo.');
        $('quote-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      avisar('quote-feedback', error.message, 'error');
    }
  });

  $('quote-cancel-edit')?.addEventListener('click', () => {
    editandoId = null;
    $('quote-form')?.reset();
    avisar('quote-feedback', 'Edición cancelada.');
  });
}

function inicializarInstalacion() {
  const boton = $('install-button'); // Opcional, lo creará tu compañero si quiere.
  if (!boton) return;
  boton.hidden = true;
  let eventoInstalacion = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    eventoInstalacion = event;
    boton.hidden = false;
  });
  boton.addEventListener('click', async () => {
    if (!eventoInstalacion) return;
    eventoInstalacion.prompt();
    await eventoInstalacion.userChoice;
    eventoInstalacion = null;
    boton.hidden = true;
  });
  window.addEventListener('appinstalled', () => { boton.hidden = true; });
}

function iniciar() {
  // No bloquear una función porque otra falle.
  void iniciarPWA();
  void inicializarCotizaciones();
  inicializarInstalacion();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}

// Edición estática para pruebas y despliegue en GitHub Pages.

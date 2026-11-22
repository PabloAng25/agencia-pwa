/**
 * IndexedDB — Borradores de cotización de Agencia Creativa Visual.
 *
 * Este archivo NO depende de index.php, app.js ni del servidor PHP.
 * Los borradores se guardan solamente en ESTE navegador/dispositivo;
 * no se envían automáticamente a la agencia.
 *
 * PENDIENTE DE INTEGRACIÓN: el formulario final de index.php debe usar
 * los identificadores indicados en GUIA_INTEGRACION.md.
 */

const DB_NAME = 'agencia_visual_db';
const DB_VERSION = 1;
const STORE = 'cotizaciones';

let pendingOpen = null;

export function abrirBaseDatos() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Este navegador no admite IndexedDB.'));
  }

  if (!pendingOpen) {
    pendingOpen = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('por_fecha', 'actualizadoEn');
          store.createIndex('por_servicio', 'servicio');
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          pendingOpen = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
      request.onblocked = () => console.warn('Cierra otras pestañas antiguas para actualizar IndexedDB.');
    }).catch(error => {
      pendingOpen = null;
      throw error;
    });
  }
  return pendingOpen;
}

function stringValue(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function datosValidos(datos) {
  const servicio = stringValue(datos?.servicio, 80);
  const descripcion = stringValue(datos?.descripcion, 2000);

  if (!servicio || !descripcion) {
    throw new Error('Indica el servicio y describe tu proyecto.');
  }
  return {
    servicio,
    descripcion,
    nombre: stringValue(datos?.nombre, 120),
    email: stringValue(datos?.email, 180),
    presupuesto: stringValue(datos?.presupuesto, 100),
    fechaEntrega: stringValue(datos?.fechaEntrega, 20),
    estado: 'borrador'
  };
}

/** Espera a que la transacción se COMPLETE, no solo al éxito de la petición. */
async function ejecutarTransaccion(modo, accion) {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo);
    const store = tx.objectStore(STORE);
    let resultado;
    try {
      const request = accion(store);
      request.onsuccess = () => { resultado = request.result; };
      request.onerror = () => { /* tx.onerror se ocupa del rechazo */ };
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error || new Error('No se pudo completar la operación local.'));
    tx.onabort = () => reject(tx.error || new Error('La operación local fue cancelada.'));
  });
}

/** Crea una cotización local y devuelve su id numérico. */
export async function crearCotizacion(datos) {
  const ahora = new Date().toISOString();
  const nueva = {
    ...datosValidos(datos),
    creadoEn: ahora,
    actualizadoEn: ahora
  };
  return ejecutarTransaccion('readwrite', store => store.add(nueva));
}

/** Devuelve todos los borradores, del más recientemente modificado al más antiguo. */
export async function listarCotizaciones() {
  const registros = await ejecutarTransaccion('readonly', store => store.getAll());
  return (registros || []).sort((a, b) =>
    String(b.actualizadoEn).localeCompare(String(a.actualizadoEn))
  );
}

export async function obtenerCotizacion(id) {
  const numero = Number(id);
  if (!Number.isSafeInteger(numero) || numero < 1) return null;
  return (await ejecutarTransaccion('readonly', store => store.get(numero))) || null;
}

/** Actualiza una cotización existente sin cambiar su fecha de creación. */
export async function actualizarCotizacion(id, datos) {
  const anterior = await obtenerCotizacion(id);
  if (!anterior) throw new Error('El borrador que intentas editar ya no existe.');
  const actualizado = {
    ...anterior,
    ...datosValidos(datos),
    actualizadoEn: new Date().toISOString()
  };
  await ejecutarTransaccion('readwrite', store => store.put(actualizado));
  return actualizado;
}

/** Elimina un borrador local. */
export async function eliminarCotizacion(id) {
  const numero = Number(id);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw new Error('Identificador de cotización inválido.');
  }
  await ejecutarTransaccion('readwrite', store => store.delete(numero));
  return true;
}

// PENDIENTE FUTURO (opcional): si crean api/quote.php, aquí se podría
// incorporar un estado 'pendiente_de_envio' y sincronización autorizada.
// NO implementar envío automático sin consentimiento ni backend funcional.

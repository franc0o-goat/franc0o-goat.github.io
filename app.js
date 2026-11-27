'use strict';
/**
 * app.js — Interfaz de Ruta Académica (v4).
 * Estado, persistencia (localStorage + respaldo JSON), dibujado (render) y eventos.
 * No contiene fórmulas: el cálculo vive en `Calc` (calculos.js), los datos referenciales en
 * `REF` (datos-referencia.js) y la extracción de notas desde texto en `Importador` (importador.js).
 */

/* (v25) Dependencias: si datos-referencia.js, calculos.js o importador.js no cargaron (archivo faltante,
 * caché a medias en GitHub Pages, error de sintaxis), se muestra un aviso claro en vez de una página en blanco. */
(() => {
  const faltan = [];
  const R = typeof REF === 'object' && REF ? REF : null;
  const C = typeof Calc === 'object' && Calc ? Calc : null;
  const I = typeof Importador === 'object' && Importador ? Importador : null;
  if (!R) faltan.push('datos-referencia.js');
  else for (const k of ['NIVELES_ESCOLARES', 'ESCALAS_PAES', 'PRUEBAS_ENSAYO', 'CATALOGO_CORTES', 'GRUPOS_NEM', 'NEM_OFICIAL', 'AÑOS_MEDIA', 'TONO_ETAPA',
    'METODOS_ESTUDIO', 'GUIA_EVALUACION', 'FRASES', 'CITAS', 'FERIADOS_CHILE', 'HITOS_REFERENCIA', 'UNIVERSIDADES_INFO']) if (!(k in R)) faltan.push(`REF.${k}`);
  if (!C) faltan.push('calculos.js');
  else for (const k of ['analizarAsignatura', 'priorizar', 'promedioGeneral', 'redondear', 'parsearNota', 'peso']) if (typeof C[k] !== 'function') faltan.push(`Calc.${k}`);
  if (!I) faltan.push('importador.js');
  else for (const k of ['normalizar', 'parsearTexto', 'parsearInforme']) if (typeof I[k] !== 'function') faltan.push(`Importador.${k}`);
  if (!faltan.length) return;
  const aviso = document.createElement('div');
  aviso.setAttribute('role', 'alert');
  aviso.style.cssText = 'position:fixed;inset:16px;z-index:9999;display:grid;place-content:center;gap:10px;padding:24px;border-radius:14px;background:#111114;color:#f4f4f5;border:1px solid #2e2e37;font:16px system-ui;text-align:center';
  aviso.textContent = `Ruta Académica no pudo cargar completa (faltan: ${faltan.join(', ')}). Recarga con Ctrl+F5. Tus datos siguen guardados en este navegador.`;
  document.body.appendChild(aviso);
  throw new Error(`Dependencias faltantes: ${faltan.join(', ')}`);
})();

/* =========================================================
 * 1. Modelo de datos, perfiles y migración
 * ========================================================= */

const CLAVE_V1 = 'rutaAcademica.v1';
const CLAVE_V2 = 'rutaAcademica.v2';
const CLAVE_V3 = 'rutaAcademica.v3';
const CLAVE_V4 = 'rutaAcademica.v4';
const DIAS_PAPELERA = [7, 15, 30];
const MS_DIA = 86400000;
const ESCALA_DEFECTO = { min: 1, max: 7, aprobacion: 4 };
const REGIMENES = {
  semestral:  { etiqueta: 'Semestral',  nombre: 'Semestre',  cantidad: 2 },
  trimestral: { etiqueta: 'Trimestral', nombre: 'Trimestre', cantidad: 3 },
  bimestral:  { etiqueta: 'Bimestral',  nombre: 'Bimestre',  cantidad: 4 },
  anual:      { etiqueta: 'Anual',      nombre: 'Año',       cantidad: 1 },
};
const MODALIDADES = { ch: 'Escolar Científico-Humanista', tp: 'Escolar Técnico-Profesional', uni: 'Universitario' };
/* (v26) Variantes de fondo. La clave es el valor de data-theme en <html>; 'auto' sigue al sistema (claro u oscuro).
 * Lista ESTRICTA: cualquier otro valor guardado o importado vuelve a 'dark'. */
const TEMAS = {
  light:   { nombre: 'Claro',      detalle: 'Día: gris claro y descansado' },
  pizarra: { nombre: 'Pizarra',    detalle: 'Carbón suave' },
  dark:    { nombre: 'Oscuro',     detalle: 'El clásico de Ruta Académica' },
  onyx:    { nombre: 'Medianoche', detalle: 'Negro profundo (pantallas OLED)' },
  auto:    { nombre: 'Automático', detalle: 'Sigue el tema de tu sistema' },
};
const CLAVE_TEMA = 'rutaAcademica.tema';   // copia del tema para pintarlo antes de cargar app.js (sin destello)
const MAX_SNAPSHOTS = 20;                  // (v26) puntos de control por perfil: cuida la cuota de localStorage
const URL_TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
// Lector de PDF (pdf.js de Mozilla, versión fija): se descarga solo al subir un PDF; el archivo no sale del equipo
const URL_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const URL_PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
// v25: hashes SRI de esas versiones exactas (si el CDN sirviera otro archivo, el navegador lo rechaza)
const SRI_TESSERACT = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F';
const SRI_PDFJS = 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e';
const SRI_PDFJS_WORKER = 'sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2';

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clonar = x => JSON.parse(JSON.stringify(x));

function crearPeriodos(regimen, cantidad) {
  const r = REGIMENES[regimen];
  return Array.from({ length: cantidad ?? r.cantidad }, (_, i) => ({ id: uid(), nombre: `${r.nombre} ${i + 1}` }));
}

/**
 * Perfil:
 * { id, nombre, modalidad, nivel, especialidad, uni: { universidad, carrera, anio, semestre, malla },
 *   escala, regimen, periodos[], periodoActivo, metaGeneral, nem, admision: { puntajes, seleccion }, seleccionada,
 *   asignaturas: [{ id, nombre, meta, periodoId, checklist[], evaluaciones[], decimas[], cerrada?, creditos? }] }
 * (v8) El orden de `periodos` es el orden en pantalla; `creditos` (opcional, universitario) pondera el general.
 * Evaluación simple:  { id, tipo: 'simple', nombre, nota|null, pendiente, peso }
 * Bloque de controles: { id, tipo: 'bloque', nombre, peso, controles: [{ id, nombre, nota|null }] }
 */
function nuevoPerfil(nombre = 'Perfil Principal') {
  const periodos = crearPeriodos('semestral');
  return {
    id: uid(), nombre, modalidad: 'ch', nivel: '1M', especialidad: '',
    uni: { universidad: '', carrera: '', anio: 1, semestre: 1, malla: null },
    escala: { ...ESCALA_DEFECTO }, regimen: 'semestral', periodos, periodoActivo: periodos[0].id,
    asignaturas: [], metaGeneral: { global: null, periodos: {} },
    nem: { grupo: null, manual: {} }, admision: { puntajes: {}, seleccion: null }, seleccionada: null,
    unidadPeso: 'pct',            // cómo se ven/escriben las ponderaciones: 'pct' (25) o 'dec' (0,25); se guardan en %
    carreraPreferida: '',         // motivación vocacional (libre o del catálogo)
    // v14: un perfil recién creado ya trae TODO lo que la vista necesita (antes faltaban el
    // calendario y los ensayos, y la pantalla no se actualizaba hasta recargar con F5)
    calendario: migrarCalendario(null),
    ensayos: [],
    snapshots: [],                // v26: puntos de control (resúmenes para comparar)
  };
}

/* ---------- Validación estricta de datos (v25) ----------
 * Todo lo que viene de localStorage, de un respaldo JSON o de una tabla importada pasa por aquí:
 * tipos, rangos y largos explícitos (nada de mezclar objetos a ciegas). Lo inválido se descarta o se
 * reemplaza por un valor seguro, y se cuenta en `saneo.ajustes` para avisar al usuario.
 */
const saneo = { ajustes: 0 };
const ajuste = valor => { saneo.ajustes++; return valor; };
const esObjeto = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const lista = x => (Array.isArray(x) ? x : []);
/** Identificadores: solo letras, números, guion y guion bajo (así nunca rompen un atributo HTML ni un selector). */
const RE_ID = /^[A-Za-z0-9_-]{1,160}$/;
const idSano = x => (typeof x === 'string' && RE_ID.test(x) ? x : null);
/** Texto: sin caracteres de control y con largo máximo. */
function textoSano(x, max, def = '') {
  if (x === null || x === undefined) return def;
  if (typeof x !== 'string' && typeof x !== 'number') return ajuste(def);
  const t = String(x).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (t.length > max) ajuste();
  return t.slice(0, max);
}
/** Número finito dentro de [min, max]; si no, null. */
function numSano(x, min, max) {
  if (x === null || x === undefined || x === '') return null;
  const n = typeof x === 'number' ? x : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return ajuste(null);
  return n;
}
/** Fecha 'AAAA-MM-DD' que existe en el calendario (rechaza 2026-02-31). */
function fechaSana(x) {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return x ? ajuste('') : '';
  const [a, m, d] = x.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d ? x : ajuste('');
}
const LIMITE_ITEMS = 500;   // tope de elementos por lista: evita respaldos gigantes que congelen la página
const listaAcotada = (x, max = LIMITE_ITEMS) => { const l = lista(x); if (l.length > max) ajuste(); return l.slice(0, max); };
/** Id válido y no repetido dentro de su lista (si choca o es inválido, se genera uno nuevo). */
function idUnico(x, usados) {
  let id = idSano(x);
  if (!id || usados.has(id)) { if (x !== undefined) ajuste(); id = uid(); }
  usados.add(id);
  return id;
}

function escalaSana(e) {
  if (!esObjeto(e)) return { ...ESCALA_DEFECTO };
  const min = numSano(e.min, -1000, 1000), max = numSano(e.max, -1000, 1000), apr = numSano(e.aprobacion, -1000, 1000);
  if (min === null || max === null || apr === null || !(min < max) || apr < min || apr > max) return ajuste({ ...ESCALA_DEFECTO });
  return { min, max, aprobacion: apr };
}
/** Nota dentro de la escala; fuera de rango o no numérica → null (queda pendiente, no rompe promedios). */
const notaSana = (x, E) => numSano(x, E.min, E.max);

function normalizarEvaluacion(ev, E = ESCALA_DEFECTO, usados = new Set()) {
  if (!esObjeto(ev)) return null;
  const base = {
    id: idUnico(ev.id, usados), nombre: textoSano(ev.nombre, 80, 'Evaluación') || 'Evaluación',
    peso: numSano(ev.peso, 0, 1000),
  };
  if (ev.fecha) base.fecha = fechaSana(ev.fecha);
  if (typeof ev.origen === 'string' && /^[a-z-]{1,20}$/.test(ev.origen)) base.origen = ev.origen;
  if (ev.tipo === 'bloque') {
    const usadosC = new Set();
    return { ...base, tipo: 'bloque', controles: listaAcotada(ev.controles, 100).filter(esObjeto).map(c => ({
      id: idUnico(c.id, usadosC), nombre: textoSano(c.nombre, 80, 'Control') || 'Control', nota: notaSana(c.nota, E),
    })) };
  }
  const nota = notaSana(ev.nota, E);
  return { ...base, tipo: 'simple', nota, pendiente: nota === null };
}

function decimaSana(d, usados) {
  if (!esObjeto(d)) return null;
  const valor = numSano(d.valor, 0, 2);
  if (valor === null) return ajuste(null);
  return {
    id: idUnico(d.id, usados), motivo: textoSano(d.motivo, 60, 'Décimas') || 'Décimas', valor,
    estado: d.estado === 'potencial' ? 'potencial' : 'obtenida', evalId: idSano(d.evalId),
  };
}

function asignaturaSana(a, E, periodos, usados) {
  if (!esObjeto(a)) return null;
  const usadosEv = new Set(), usadosCh = new Set(), usadosD = new Set();
  const asig = {
    id: idUnico(a.id, usados),
    nombre: textoSano(a.nombre, 80, 'Asignatura') || 'Asignatura',
    meta: notaSana(a.meta, E),
    periodoId: periodos.some(x => x.id === a.periodoId) ? a.periodoId : periodos[0].id,
    evaluaciones: listaAcotada(a.evaluaciones, 200).map(ev => normalizarEvaluacion(ev, E, usadosEv)).filter(Boolean),
    checklist: listaAcotada(a.checklist, 200).filter(esObjeto).map(c => ({
      id: idUnico(c.id, usadosCh), texto: textoSano(c.texto, 200, 'Tarea') || 'Tarea', hecho: c.hecho === true,
    })),
    decimas: listaAcotada(a.decimas, 100).map(d => decimaSana(d, usadosD)).filter(Boolean),
  };
  if (a.cerrada === true) asig.cerrada = true;
  // v8: créditos opcionales (perfil universitario); un valor inválido se descarta
  const c = numSano(a.creditos, 0.5, 60);
  if (c !== null) asig.creditos = c;
  return asig;
}

/** Malla universitaria: { universidad, carrera, fuente, version, actualizada, semestres: [{ nombre, ramos: [{ nombre, creditos? }] }] } */
function mallaSana(m) {
  if (!esObjeto(m)) return m == null ? null : ajuste(null);
  return {
    universidad: textoSano(m.universidad, 120), carrera: textoSano(m.carrera, 120),
    fuente: textoSano(m.fuente, 200), version: textoSano(m.version, 20), actualizada: textoSano(m.actualizada, 20),
    semestres: listaAcotada(m.semestres, 20).filter(esObjeto).map((s, i) => ({
      nombre: textoSano(s.nombre, 40, `Semestre ${i + 1}`) || `Semestre ${i + 1}`,
      ramos: listaAcotada(s.ramos, 30).filter(esObjeto).map(r => {
        const ramo = { nombre: textoSano(r.nombre, 80) };
        const cr = numSano(r.creditos, 0, 60);
        if (cr !== null) ramo.creditos = cr;
        return ramo;
      }),
    })),
  };
}

const NIVELES_VALIDOS = new Set([...REF.NIVELES_ESCOLARES.map(([k]) => k), ...(REF.NIVELES_TP || []).map(x => (Array.isArray(x) ? x[0] : x))]);

/** Completa y valida un perfil (datos de versiones anteriores, respaldos o edición manual). */
function normalizarPerfil(p) {
  if (!esObjeto(p)) p = ajuste({});
  const base = nuevoPerfil(textoSano(p.nombre, 60, 'Perfil') || 'Perfil');
  const r = base;
  r.id = idSano(p.id) || ajuste(base.id);
  r.modalidad = MODALIDADES[p.modalidad] ? p.modalidad : (p.modalidad === undefined ? base.modalidad : ajuste(base.modalidad));
  r.nivel = typeof p.nivel === 'string' && (NIVELES_VALIDOS.has(p.nivel) || /^[A-Za-z0-9]{1,4}$/.test(p.nivel)) ? p.nivel : base.nivel;
  r.especialidad = textoSano(p.especialidad, 80);
  r.carreraPreferida = textoSano(p.carreraPreferida, 120);
  const u = esObjeto(p.uni) ? p.uni : {};
  r.uni = {
    universidad: textoSano(u.universidad, 120), carrera: textoSano(u.carrera, 120),
    anio: Number.isInteger(u.anio) && u.anio >= 1 && u.anio <= 7 ? u.anio : 1,
    semestre: Number.isInteger(u.semestre) && u.semestre >= 1 && u.semestre <= 2 ? u.semestre : 1,
    malla: mallaSana(u.malla),
  };
  r.escala = escalaSana(p.escala);
  const E = r.escala;
  r.regimen = REGIMENES[p.regimen] ? p.regimen : base.regimen;
  r.unidadPeso = ['pct', 'dec'].includes(p.unidadPeso) ? p.unidadPeso : 'pct';
  // v8: el orden del arreglo de períodos ES el orden visible (se reordena arrastrando); nombres siempre texto
  const usadosP = new Set();
  // v26: se guardan los períodos por defecto ANTES de sobrescribir (r y base son el mismo objeto): un perfil
  // sin períodos válidos antes quedaba con la lista vacía y la validación se caía en r.periodos[0].id
  const periodosBase = base.periodos;
  r.periodos = listaAcotada(p.periodos, 12).filter(x => esObjeto(x) && idSano(x.id) && !usadosP.has(x.id) && usadosP.add(x.id))
    .map(x => ({ id: x.id, nombre: textoSano(x.nombre, 40, 'Período') || 'Período' }));
  if (!r.periodos.length) r.periodos = periodosBase;
  const usadosA = new Set();
  r.asignaturas = listaAcotada(p.asignaturas, 300).map(a => asignaturaSana(a, E, r.periodos, usadosA)).filter(Boolean);
  r.periodoActivo = p.periodoActivo === 'todos' || r.periodos.some(x => x.id === p.periodoActivo) ? p.periodoActivo : r.periodos[0].id;
  r.seleccionada = r.asignaturas.some(a => a.id === p.seleccionada) ? p.seleccionada : null;
  // Meta general: global y por período, siempre dentro de la escala
  const mg = esObjeto(p.metaGeneral) ? p.metaGeneral : {};
  r.metaGeneral = { global: notaSana(mg.global, E), periodos: {} };
  for (const [k, v] of Object.entries(esObjeto(mg.periodos) ? mg.periodos : {})) {
    const n = notaSana(v, E);
    if (n !== null && r.periodos.some(x => x.id === k)) r.metaGeneral.periodos[k] = n;
  }
  // NEM: grupo A/B/C y promedios manuales 1,0–7,0 por año de media (1M–4M)
  const nem = esObjeto(p.nem) ? p.nem : {};
  r.nem = { grupo: REF.GRUPOS_NEM[nem.grupo] ? nem.grupo : null, manual: {} };
  for (const [k, v] of Object.entries(esObjeto(nem.manual) ? nem.manual : {})) {
    const n = numSano(v, 1, 7);
    if (n !== null && REF.AÑOS_MEDIA.includes(k)) r.nem.manual[k] = n;
  }
  // Admisión: puntajes 0–1000 por componente y carrera seleccionada del catálogo
  const adm = esObjeto(p.admision) ? p.admision : {};
  r.admision = { puntajes: {}, seleccion: idSano(adm.seleccion) };
  for (const [k, v] of Object.entries(esObjeto(adm.puntajes) ? adm.puntajes : {})) {
    const n = numSano(v, 0, 1000);
    if (n !== null && /^[a-z0-9_]{1,20}$/i.test(k)) r.admision.puntajes[k] = n;
  }
  r.calendario = migrarCalendario(p.calendario);
  // v13: ensayos PAES del perfil [{ id, nombre, fecha, prueba, correctas|null, puntajeManual|null }]
  const pruebas = new Set((REF.PRUEBAS_ENSAYO || []).map(x => x.id ?? x.clave ?? x[0]).filter(Boolean));
  const usadosE = new Set();
  r.ensayos = listaAcotada(p.ensayos, 300).filter(e => esObjeto(e) && typeof e.prueba === 'string' && (!pruebas.size || pruebas.has(e.prueba)))
    .map(e => ({
      id: idUnico(e.id, usadosE), nombre: textoSano(e.nombre, 60, 'Ensayo') || 'Ensayo',
      fecha: fechaSana(e.fecha),
      prueba: e.prueba,
      correctas: Number.isInteger(e.correctas) && e.correctas >= 0 && e.correctas <= 200 ? e.correctas : null,
      puntajeManual: Number.isInteger(e.puntajeManual) && e.puntajeManual >= 100 && e.puntajeManual <= 1000 ? e.puntajeManual : null,
      escala: REF.ESCALAS_PAES.some(x => x.id === e.escala) ? e.escala : REF.ESCALAS_PAES[0].id,
    }));
  const usadosS = new Set();
  r.snapshots = listaAcotada(p.snapshots, MAX_SNAPSHOTS).map(x => snapshotSano(x, usadosS)).filter(Boolean);
  if (Number.isFinite(p.eliminadoEn)) r.eliminadoEn = p.eliminadoEn;
  return r;
}

/**
 * (v26) Punto de control: solo un RESUMEN para comparar (nunca una copia de las notas).
 * { id, etiqueta ≤60, creado (ms), origen 'manual'|'auto', escala {min,max,aprobacion},
 *   general|null, nem { prom 1–7|null, puntaje 0–1000|null }, ponderado 0–1000|null, carrera ≤160,
 *   paes { prueba: 100–1000 } (≤ 20), asignaturas [{ clave, nombre, promedio|null }] (≤ 80) }
 */
const RE_CLAVE_PAES = /^[a-z0-9_]{1,30}$/;
function snapshotSano(s, usados = new Set()) {
  if (!esObjeto(s)) return ajuste(null);
  const creado = numSano(s.creado, 0, 8.64e15);
  if (creado === null) return ajuste(null);
  const E = escalaSana(s.escala);
  const nem = esObjeto(s.nem) ? s.nem : {};
  const paes = {};
  for (const [k, v] of Object.entries(esObjeto(s.paes) ? s.paes : {}).slice(0, 20)) {
    const n = numSano(v, 100, 1000);
    if (n !== null && RE_CLAVE_PAES.test(k)) paes[k] = n;
  }
  const claves = new Set();
  return {
    id: idUnico(s.id, usados),
    etiqueta: textoSano(s.etiqueta, 60, 'Punto de control') || 'Punto de control',
    creado,
    origen: s.origen === 'auto' ? 'auto' : 'manual',
    escala: E,
    general: numSano(s.general, E.min, E.max),
    nem: { prom: numSano(nem.prom, 1, 7), puntaje: numSano(nem.puntaje, 0, 1000) },
    ponderado: numSano(s.ponderado, 0, 1000),
    carrera: textoSano(s.carrera, 160),
    paes,
    asignaturas: listaAcotada(s.asignaturas, 80).filter(esObjeto).map(a => ({
      clave: textoSano(a.clave, 80), nombre: textoSano(a.nombre, 80, 'Asignatura') || 'Asignatura', promedio: numSano(a.promedio, E.min, E.max),
    })).filter(a => a.clave && !claves.has(a.clave) && claves.add(a.clave)),
  };
}

/**
 * (v9) Fechas clave del perfil: { eventos: [{ id, nombre, fecha 'AAAA-MM-DD' | '', tipo, origen, nota? }],
 * versionRef, quitadosRef[] }. La primera vez (o al subir REF.VERSION_FECHAS) se copian los feriados
 * e hitos de referencia que el estudiante no tenga ni haya borrado; lo editado nunca se pisa.
 */
const TIPOS_FECHA = { feriado: 'Feriado', hito: 'Hito académico', evaluacion: 'Evaluación', otro: 'Otro' };
function migrarCalendario(c) {
  const fuente = esObjeto(c) ? c : {};
  const cal = {
    versionRef: Number.isInteger(fuente.versionRef) ? fuente.versionRef : 0,
    quitadosRef: listaAcotada(fuente.quitadosRef, 1000).filter(idSano),
    eventos: [],
  };
  const usados = new Set();
  cal.eventos = listaAcotada(fuente.eventos, 1000).filter(e => esObjeto(e) && idSano(e.id)).map(e => {
    const ev = {
      id: idUnico(e.id, usados),
      nombre: textoSano(e.nombre, 80, 'Fecha') || 'Fecha',
      fecha: fechaSana(e.fecha),
      tipo: TIPOS_FECHA[e.tipo] ? e.tipo : 'otro',
    };
    if (e.origen === 'ref') ev.origen = 'ref';
    if (e.nota) ev.nota = textoSano(e.nota, 200);
    return ev;
  });
  if (cal.versionRef < REF.VERSION_FECHAS) {
    const ids = new Set(cal.eventos.map(e => e.id));
    for (const e of [...REF.HITOS_REFERENCIA, ...REF.FERIADOS_CHILE]) {
      if (!ids.has(e.id) && !cal.quitadosRef.includes(e.id)) cal.eventos.push({ ...e, origen: 'ref' });
    }
    cal.versionRef = REF.VERSION_FECHAS;
  }
  return cal;
}

/** Tema elegido antes de la v26 (se guardaba solo en su propia clave): 'light' o 'dark'. */
function temaLegado() {
  try { const t = localStorage.getItem(CLAVE_TEMA); return Object.hasOwn(TEMAS, t) ? t : 'dark'; } catch { return 'dark'; }
}

function storeVacio() {
  const p = nuevoPerfil();
  return {
    version: 4, perfilActivo: p.id, perfiles: [p], papelera: [], tablasNEM: {}, vista: 'notas', subvista: 'nem',
    catalogoCortes: clonar(REF.CATALOGO_CORTES), config: { ocrTesseract: false, diasPapelera: 30, novedadesLeidas: [], tema: temaLegado() },
  };
}

/** Carrera del catálogo de cortes: textos acotados, ponderaciones 0–100 y puntajes 0–1000. */
function carreraCatalogoSana(c, usados) {
  if (!esObjeto(c)) return null;
  const pond = {};
  for (const [k, v] of Object.entries(esObjeto(c.ponderaciones) ? c.ponderaciones : {})) {
    const n = numSano(v, 0, 100);
    if (n !== null && /^[a-z0-9_]{1,20}$/i.test(k)) pond[k] = n;
  }
  return {
    id: idUnico(c.id, usados),
    universidad: textoSano(c.universidad, 160), carrera: textoSano(c.carrera, 160, 'Carrera') || 'Carrera',
    ponderaciones: pond,
    corte: numSano(c.corte, 0, 1000), ponderadoMinimo: numSano(c.ponderadoMinimo, 0, 1000),
    anio: textoSano(c.anio, 10), notas: textoSano(c.notas, 400), fuente: textoSano(c.fuente, 300),
  };
}

/** Tabla NEM importada: pares [promedio 1,0–7,0, puntaje 100–1000], ordenados y sin repetir promedio. */
function tablaNEMSana(t) {
  if (!esObjeto(t)) return null;
  const vistos = new Set();
  const tabla = listaAcotada(t.tabla, 2000).filter(par => Array.isArray(par) && par.length >= 2)
    .map(([prom, pts]) => [numSano(prom, 1, 7), numSano(pts, 0, 1000)])
    .filter(([prom, pts]) => prom !== null && pts !== null && !vistos.has(prom) && vistos.add(prom))
    .sort((a, b) => a[0] - b[0]);
  return tabla.length >= 2 ? { tabla, fecha: fechaSana(t.fecha) || new Date().toISOString().slice(0, 10) } : ajuste(null);
}

/** Normaliza un store completo (v2, v3, v4 o respaldo importado) validando cada campo. */
function normalizarStore(s) {
  if (!esObjeto(s)) s = ajuste({});
  const base = storeVacio();
  const r = { version: 4 };
  const usados = new Set();
  r.perfiles = listaAcotada(s.perfiles, 100).filter(esObjeto).map(normalizarPerfil)
    .map(p => { if (usados.has(p.id)) { ajuste(); p.id = uid(); } usados.add(p.id); return p; });
  if (!r.perfiles.length) r.perfiles = base.perfiles;
  r.perfilActivo = r.perfiles.some(p => p.id === s.perfilActivo) ? s.perfilActivo : r.perfiles[0].id;
  // Papelera de perfiles (v4): cada perfil conserva la fecha en que se envió (`eliminadoEn`, timestamp)
  r.papelera = listaAcotada(s.papelera, 100).filter(esObjeto)
    .map(p => ({ ...normalizarPerfil(p), eliminadoEn: numSano(p.eliminadoEn, 0, 8.64e15) ?? Date.now() }));
  r.tablasNEM = {};
  for (const [g, t] of Object.entries(esObjeto(s.tablasNEM) ? s.tablasNEM : {})) {
    const tabla = REF.GRUPOS_NEM[g] ? tablaNEMSana(t) : ajuste(null);
    if (tabla) r.tablasNEM[g] = tabla;
  }
  const cfg = esObjeto(s.config) ? s.config : {};
  r.config = {
    ocrTesseract: cfg.ocrTesseract === true,
    diasPapelera: DIAS_PAPELERA.includes(cfg.diasPapelera) ? cfg.diasPapelera : base.config.diasPapelera,
    novedadesLeidas: listaAcotada(cfg.novedadesLeidas, 500).filter(x => typeof x === 'string' && x.length <= 80),
    // v26: variante de fondo; solo valores de la lista TEMAS (un respaldo antiguo sin tema toma el guardado aparte)
    tema: Object.hasOwn(TEMAS, cfg.tema) ? cfg.tema : (cfg.tema === undefined ? temaLegado() : ajuste('dark')),
  };
  const usadosC = new Set();
  r.catalogoCortes = Array.isArray(s.catalogoCortes)
    ? listaAcotada(s.catalogoCortes, 3000).map(c => carreraCatalogoSana(c, usadosC)).filter(Boolean)
    : clonar(REF.CATALOGO_CORTES);
  const versionCatalogo = Number.isInteger(cfg.versionCatalogo) ? cfg.versionCatalogo : 1;
  if (versionCatalogo < REF.VERSION_CATALOGO) r.catalogoCortes = migrarCatalogo(r.catalogoCortes, versionCatalogo);
  r.config.versionCatalogo = REF.VERSION_CATALOGO;
  r.vista = s.vista === 'nem' ? 'admision' : s.vista;
  if (!['notas', 'admision', 'paes', 'universidades', 'estudio'].includes(r.vista)) r.vista = 'notas';
  r.subvista = s.subvista === 'cortes' ? 'cortes' : 'nem';
  if (['ensayos', 'escalas', 'info'].includes(s.paesSub)) r.paesSub = s.paesSub;
  return r;
}

let avisoMigracion = '';
let primerInicio = false;

/**
 * Catálogo v3 (cortes Admisión 2026). Respeta lo que el estudiante editó o agregó:
 *  - entradas de plantilla SIN editar (fuente ilustrativa, sin corte): se actualizan con los datos de REF
 *    o, si eran genéricas de la v2 (ids "ref2-…") sin equivalente, se quitan;
 *  - entradas editadas o propias: se conservan tal cual;
 *  - se agregan las carreras nuevas que aún no estén (por id).
 */
function migrarCatalogo(catalogo, desde) {
  const ref = new Map(REF.CATALOGO_CORTES.map(c => [c.id, c]));
  const sinEditar = c => c.fuente === REF.FUENTE_ILUSTRATIVA && c.corte === null;
  const resultado = [];
  for (const c of catalogo) {
    if (sinEditar(c) && ref.has(c.id)) resultado.push(clonar(ref.get(c.id)));
    else if (sinEditar(c) && String(c.id).startsWith('ref2-')) continue;
    else resultado.push(c);
  }
  const ids = new Set(resultado.map(c => c.id));
  for (const c of REF.CATALOGO_CORTES) if (!ids.has(c.id)) resultado.push(clonar(c));
  if (desde < 3) avisoMigracion = [avisoMigracion, 'Catálogo actualizado con los puntajes de corte 2026'].filter(Boolean).join('. ');
  return resultado;
}

/** Migración v1 → "Perfil Principal" con un único Semestre 1. */
function perfilDesdeV1(v1) {
  const p = nuevoPerfil('Perfil Principal');
  p.escala = escalaSana(esObjeto(v1.escala) ? { ...ESCALA_DEFECTO, ...v1.escala } : ESCALA_DEFECTO);
  p.asignaturas = lista(v1.asignaturas).filter(esObjeto).map(a => ({ checklist: [], ...a, periodoId: p.periodos[0].id }));
  p.seleccionada = v1.seleccionada ?? null;
  return normalizarPerfil(p);
}

/** Lee v4; si no existe, migra desde v3, v2 o v1 (las claves antiguas se conservan como respaldo). */
const CLAVE_CORRUPTO = 'rutaAcademica.v4.ilegible';
let almacenamientoBloqueado = false;
/** Lee una clave sin lanzar errores (almacenamiento bloqueado o en modo privado → null). */
function leerClave(clave) {
  try { return localStorage.getItem(clave); }
  catch { almacenamientoBloqueado = true; return null; }
}
/** JSON.parse que no lanza: si el texto está dañado, lo aparta en otra clave para no perderlo. */
function parsearGuardado(raw, clave) {
  try { return JSON.parse(raw); }
  catch (e) {
    console.warn(`Datos ilegibles en ${clave}`, e);
    try { localStorage.setItem(CLAVE_CORRUPTO, raw); } catch { /* sin espacio: queda solo el aviso */ }
    avisoMigracion = [avisoMigracion, 'Tus datos guardados estaban dañados y no se pudieron leer. Apartamos una copia (rutaAcademica.v4.ilegible) para no perderla; si tienes un respaldo, impórtalo desde “Más”'].filter(Boolean).join('. ');
    return undefined;
  }
}
function leerStoreGuardado() {
  saneo.ajustes = 0;
  const conAviso = s => {
    if (saneo.ajustes) avisoMigracion = [avisoMigracion, `Se corrigieron ${saneo.ajustes} dato(s) guardados que estaban fuera de rango o mal formados`].filter(Boolean).join('. ');
    return s;
  };
  try {
    const raw4 = leerClave(CLAVE_V4);
    if (raw4) {
      const s = parsearGuardado(raw4, CLAVE_V4);
      if (esObjeto(s)) return conAviso(normalizarStore(s));
      // Ilegible: se parte de cero (la copia dañada ya quedó apartada en otra clave)
      return storeVacio();
    }
    for (const [clave, version] of [[CLAVE_V3, 3], [CLAVE_V2, 2]]) {
      const raw = leerClave(clave);
      if (!raw) continue;
      const s = parsearGuardado(raw, clave);
      if (s && Array.isArray(s.perfiles)) { avisoMigracion = `Tus perfiles se actualizaron de la versión ${version} a la 4`; return conAviso(normalizarStore(s)); }
    }
    const raw1 = leerClave(CLAVE_V1);
    if (raw1) {
      const v1 = parsearGuardado(raw1, CLAVE_V1);
      if (v1 && Array.isArray(v1.asignaturas)) {
        const s = storeVacio();
        s.perfiles = [perfilDesdeV1(v1)];
        s.perfilActivo = s.perfiles[0].id;
        avisoMigracion = 'Tus datos anteriores se migraron al “Perfil Principal”';
        return conAviso(s);
      }
    }
  } catch (e) {
    // Un error inesperado al migrar no debe dejar la app en blanco: se informa y se parte con un perfil vacío
    console.error('No se pudieron leer los datos guardados', e);
    avisoMigracion = [avisoMigracion, 'No pudimos leer tus datos guardados; si tienes un respaldo, impórtalo desde “Más”'].filter(Boolean).join('. ');
    return storeVacio();
  }
  if (almacenamientoBloqueado) avisoMigracion = 'Este navegador bloquea el almacenamiento local: tus cambios no se guardarán al cerrar la página. Exporta un respaldo desde “Más”';
  else primerInicio = true;   // v14: no había nada guardado → se ofrece crear el perfil en un paso
  return storeVacio();
}

/** Elimina definitivamente los perfiles que llevan en la papelera más días que el plazo configurado. */
function purgarPapelera(s, ahora = Date.now()) {
  const plazo = s.config.diasPapelera * MS_DIA;
  const antes = s.papelera.length;
  s.papelera = s.papelera.filter(p => ahora - p.eliminadoEn < plazo);
  return antes - s.papelera.length;
}

/** Carga al iniciar: lee (o migra) los datos y aplica la autolimpieza de la papelera. */
function cargarStore() {
  const s = leerStoreGuardado();
  const purgados = purgarPapelera(s);
  if (purgados) {
    avisoMigracion = [avisoMigracion, `Se eliminaron definitivamente ${purgados} perfil(es) con más de ${s.config.diasPapelera} días en la papelera`].filter(Boolean).join('. ');
    try { localStorage.setItem(CLAVE_V4, JSON.stringify(s)); } catch { /* almacenamiento no disponible */ }
  }
  return s;
}

let store = cargarStore();

/** Estado temporal de la interfaz (no se guarda). */
let sim = {};                       // sim[idAsignatura][idEvaluacionOControl] = nota hipotética
let simNEM = null;                  // promedio simulado del año en curso
let metaGeneralAbierta = false;
const bloquesCerrados = new Set();  // bloques de controles colapsados
let busquedaCatalogo = '';
let importacion = null;             // estado del asistente "Importar desde foto"
let fraseDesplazamiento = 0;        // "Otra frase": desplazamiento sobre la frase del día (no se guarda)
let gestion = { tab: 'perfiles', sel: new Set() }; // diálogo de gestión de perfiles / papelera

const perfil = () => store.perfiles.find(p => p.id === store.perfilActivo) || store.perfiles[0];
const escala = () => perfil().escala;
const esEscolar = (p = perfil()) => p.modalidad === 'ch' || p.modalidad === 'tp';
const esConsolidado = () => perfil().periodoActivo === 'todos';

let ultimoAvisoGuardado = 0;
/** Guarda en localStorage. Si falla (sin espacio, modo privado, bloqueado) avisa —sin repetir el aviso en cada tecla— y ofrece exportar. */
function guardar() {
  try { localStorage.setItem(CLAVE_V4, JSON.stringify(store)); return true; }
  catch (e) {
    console.error('No se pudo guardar', e);
    if (Date.now() - ultimoAvisoGuardado > 15000) {
      ultimoAvisoGuardado = Date.now();
      const sinEspacio = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014;
      toast(sinEspacio
        ? 'No queda espacio para guardar en este navegador. Exporta un respaldo y libera espacio (por ejemplo, vacía la papelera de perfiles).'
        : 'Este navegador no permite guardar: tus cambios se perderán al cerrar. Exporta un respaldo.',
      { etiqueta: 'Exportar respaldo', fn: () => exportarRespaldo(false) }, { duracion: 12000 });
    }
    return false;
  }
}

/** Guarda y redibuja. Se difiere un instante para conservar el foco del siguiente campo. */
function actualizar() {
  guardar();
  setTimeout(render, 0);
}

/**
 * Ejecuta una modificación destructiva ofreciendo "Deshacer" en el toast durante unos segundos.
 * Se guarda UNA copia serializada del estado previo; deja de existir cuando el toast se cierra
 * (accionToast = null), así que no se acumulan copias en memoria. Si la modificación falla a medias,
 * se restaura esa copia para no dejar datos inconsistentes.
 */
function conDeshacer(mensaje, mutar) {
  const antes = JSON.stringify(store);
  try { mutar(); }
  catch (e) {
    console.error(e);
    store = normalizarStore(JSON.parse(antes));
    toast('No se pudo completar la acción; tus datos quedaron como estaban.');
    setTimeout(render, 0);
    return;
  }
  actualizar();
  toast(mensaje, {
    etiqueta: 'Deshacer',
    fn: () => { store = normalizarStore(JSON.parse(antes)); sim = {}; actualizar(); toast('Cambio deshecho'); },
  });
}

/* =========================================================
 * 2. Utilidades de presentación
 * ========================================================= */

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** (v25) URL para href/src: solo http(s) o rutas relativas; javascript:, data:, vbscript: y otros esquemas → "#". Ya escapada para atributo. */
function urlSegura(u) {
  const t = String(u ?? '').trim();
  if (!t) return '#';
  try {
    const url = new URL(t, location.href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '#';
  } catch { return '#'; }
  return esc(t);
}
const opts = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(t)}</option>`).join('');

const dec = () => (escala().max - escala().min > 20 ? 1 : 2);
const fmt = (x, d = dec()) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Calc.redondear(x, d).toFixed(d));
/**
 * (v20) Nota necesaria "práctica": nunca se sugiere una nota absurda.
 *  - ≤ nota mínima → la meta ya está asegurada (no se muestra un “1.0”).
 *  - bajo la nota de aprobación → basta con aprobar (no se sugiere un “2.3”).
 *  - si no, la nota real redondeada hacia arriba a 1 decimal.
 * corto = para celdas y títulos; largo = para frases.
 */
function textoNecesaria(v, largo = false) {
  const E = escala();
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (v <= E.min + Calc.EPS) return largo ? 'nada más: tu meta ya está asegurada' : (seguroTono()?.logro || '¡Meta asegurada!');
  if (v < E.aprobacion - Calc.EPS) return largo ? `aprobar (${fmt(E.aprobacion, 1)})` : `Basta aprobar (${fmt(E.aprobacion, 1)})`;
  if (v > E.max + Calc.EPS) return largo ? 'más que la nota máxima' : 'Fuera de alcance';
  return Calc.redondearArriba(v, 1).toFixed(1);
}

/** La nota necesaria se redondea hacia arriba a 1 decimal (nunca subestima lo requerido). */
const fmtNec = x => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Calc.redondearArriba(x, 1).toFixed(1));
const fmtPct = x => `${Calc.redondear(x, 2)}%`;
const fmtPts = x => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Calc.redondear(x, 1).toFixed(1));
const paso = () => (escala().max - escala().min > 20 ? 1 : 0.1);
/** Fecha LOCAL "AAAA-MM-DD" (no UTC: en Chile, de noche, el UTC ya es el día siguiente). */
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Ponderaciones en la unidad elegida por el perfil (se guardan siempre en %). */
const unidadPeso = () => perfil().unidadPeso || 'pct';
const fmtPesoInput = w => Calc.formatearPeso(w, unidadPeso());
const fmtPesoTexto = w => (unidadPeso() === 'dec' ? Calc.formatearPeso(w, 'dec') : `${Calc.formatearPeso(w, 'pct')}%`);
const sufijoPeso = () => (unidadPeso() === 'dec' ? '0–1' : '%');
const ayudaPeso = () => (unidadPeso() === 'dec' ? 'Ej. 0,25 · 1/4 · 25%' : 'Ej. 25 · 0,25 · 1/4');
const leerPesoUsuario = texto => Calc.parsearPeso(texto, unidadPeso());
/** Carrera preferida del perfil (motivación recurrente). */
// v8: en etapa universitaria no aplica (ya cursa su carrera): se usa su formación profesional
const carreraPreferida = () => (perfil().modalidad === 'uni' ? '' : (perfil().carreraPreferida || '').trim());
const fraseCarrera = plantilla => plantilla.replace(/\{carrera\}/g, carreraPreferida());
const alAzar = lista => lista[Math.floor(Math.random() * lista.length)];
/** Elemento estable durante el día (para textos que se redibujan seguido). */
const alAzarDiario = lista => lista[Calc.indiceDiario(hoy(), lista.length, 7)];

/**
 * Feedback inmediato al registrar una nota: felicitación si es excelente (tramo superior de la
 * escala, ≈ 6,5 en 1–7) o mensaje motivador y constructivo si no; con el impacto en el promedio.
 */
/** Frase al azar sin repetir la última usada de esa misma lista (evita “déjà vu” al cargar varias notas). */
const ultimasFrases = {};
function fraseSinRepetir(clave) {
  const lista = REF.FEEDBACK_NOTA[clave] || [];
  if (lista.length < 2) return lista[0] || '';
  let i;
  do { i = Math.floor(Math.random() * lista.length); } while (i === ultimasFrases[clave]);
  ultimasFrases[clave] = i;
  return lista[i];
}

/** Última nota registrada ANTES de la evaluación/control indicado (en el orden de la lista). */
function notaPrevia(asig, idHasta) {
  let ultima = null;
  for (const ev of asig.evaluaciones) {
    if (ev.id === idHasta) return ultima;
    if (ev.tipo === 'bloque') {
      for (const c of ev.controles) { if (c.id === idHasta) return ultima; if (typeof c.nota === 'number') ultima = c.nota; }
    } else if (typeof ev.nota === 'number') ultima = ev.nota;
  }
  return ultima;
}

/**
 * (v8) Feedback al registrar una nota, armado por capas para variar y no repetirse:
 *  1) tono según la nota (excelente / buena / ajustada / baja) o “perfecta” si es la máxima;
 *  2) un matiz de contexto: primera nota, mejora o caída respecto de la anterior, cruce de meta o cierre;
 *  3) el impacto en el promedio;
 *  4) motivación vocacional solo a veces (≈ 1 de 4, y solo con buenas noticias); en perfiles
 *     universitarios se habla de su formación y su futuro ejercicio profesional.
 */
function feedbackNota(asig, nota, promedioAntes, extra = {}) {
  const E = escala(), r = E.max - E.min;
  const tipo = nota >= E.max - r / 12 - Calc.EPS ? 'excelente'   // 1–7 → ≥ 6,5
    : nota >= Math.max(tieneMeta(asig) ? asig.meta : 0, E.min + 0.75 * r) - Calc.EPS ? 'buena'
    : nota >= E.aprobacion - Calc.EPS ? 'ajustada' : 'baja';
  const notaTexto = (dec() === 1 ? String(Calc.redondear(nota, 1)) : nota.toFixed(Number.isInteger(nota * 10) ? 1 : 2)).replace('.', ',');
  const rellenar = t => t.replace(/\{nota\}/g, notaTexto).replace(/\{asig\}/g, asig.nombre);
  const perfecta = nota >= E.max - Calc.EPS;
  let msg = rellenar(fraseSinRepetir(perfecta ? 'perfecta' : tipo));

  const analisis = Calc.analizarAsignatura(asig, E);
  const despues = analisis.actual;
  const cerro = ['lograda', 'no-lograda'].includes(analisis.estado) && extra.estadoAntes && !['lograda', 'no-lograda'].includes(extra.estadoAntes);
  const cruzaMeta = tieneMeta(asig) && despues !== null && despues >= asig.meta - Calc.EPS && (promedioAntes === null || promedioAntes < asig.meta - Calc.EPS);
  const umbral = r / 12;   // en 1–7 ≈ 0,5 puntos
  // Un solo matiz de contexto (el más relevante)
  let matiz = '';
  if (cerro) matiz = 'cierre';
  else if (cruzaMeta) matiz = 'sobreMeta';
  else if (promedioAntes === null) matiz = 'primera';
  else if (typeof extra.previa === 'number' && nota - extra.previa >= umbral - Calc.EPS) matiz = 'mejora';
  else if (typeof extra.previa === 'number' && extra.previa - nota >= umbral - Calc.EPS && tipo !== 'excelente') matiz = 'caida';
  else if (tieneMeta(asig) && despues !== null && despues < asig.meta - Calc.EPS && tipo !== 'baja' && Math.random() < 0.5) matiz = 'bajoMeta';
  if (matiz) msg += ` ${rellenar(fraseSinRepetir(matiz))}`;

  if (despues !== null) {
    if (promedioAntes !== null && Math.abs(despues - promedioAntes) >= 0.005) {
      msg += ` Tu promedio ${despues > promedioAntes ? 'sube' : 'pasa'} de ${fmt(promedioAntes)} a ${fmt(despues)}.`;
    } else if (promedioAntes === null) {
      msg += ` Tu promedio parte en ${fmt(despues)}.`;
    }
  }
  const buenaNoticia = ['excelente', 'buena'].includes(tipo) || ['mejora', 'sobreMeta', 'cierre'].includes(matiz);
  if (buenaNoticia && Math.random() < 0.25) {
    const p = perfil();
    if (p.modalidad === 'uni') msg += ` ${fraseSinRepetir('profesion').replace(/\{carrera\}/g, p.uni.carrera || 'tu carrera')}`;
    else if (carreraPreferida()) msg += ` ${fraseCarrera(fraseSinRepetir('carrera'))}`;
  }
  if (avisoNotaEscalada) { msg = `${avisoNotaEscalada} ${msg}`; avisoNotaEscalada = ''; }
  setTimeout(() => toast(msg, null, { clase: tipo === 'excelente' || perfecta ? 'celebra' : 'animo', duracion: 7000 }), 30);
}
const etiquetaComponente = k => REF.COMPONENTES_ADMISION.find(([c]) => c === k)?.[1] ?? k;

function asigSeleccionada() {
  return perfil().asignaturas.find(a => a.id === perfil().seleccionada) || null;
}
function nombrePeriodo(id) {
  return perfil().periodos.find(x => x.id === id)?.nombre ?? '—';
}
function etiquetaNivel(p) {
  return REF.NIVELES_ESCOLARES.find(([k]) => k === p.nivel)?.[1] ?? p.nivel;
}
function contextoPerfil(p = perfil()) {
  if (p.modalidad === 'uni') {
    const partes = ['Universitario'];
    if (p.uni.carrera) partes.push(p.uni.carrera);
    partes.push(`Año ${p.uni.anio} · Sem. ${p.uni.semestre}`);
    return partes.join(' · ');
  }
  const base = `${p.modalidad === 'tp' ? 'TP' : 'CH'} · ${etiquetaNivel(p)}`;
  return p.modalidad === 'tp' && p.especialidad ? `${base} · ${p.especialidad}` : base;
}
function metaPorDefecto(p = perfil()) {
  return Calc.redondear(Math.min(p.escala.max, p.escala.aprobacion + (p.escala.max - p.escala.aprobacion) / 2), 1);
}

function posEscala(x) {
  const { min, max } = escala();
  return Calc.limitar(((x - min) / (max - min)) * 100, 0, 100);
}

/** Calificativo honesto (umbrales relativos a la escala: en 1–7 → ≥6,0 · ≥5,5 · ≥5,0). */
function calificativo(n) {
  const E = escala(), r = E.max - E.min;
  if (n >= E.min + 0.833 * r) return 'un resultado excelente';
  if (n >= E.min + 0.75 * r) return 'un muy buen resultado';
  if (n >= E.min + 0.667 * r) return 'un buen resultado';
  if (n >= E.aprobacion) return 'un resultado aprobatorio';
  return 'un avance concreto respecto de hoy';
}

const ESTADOS = {
  'sin-datos':    { chip: '',     texto: 'Sin evaluaciones' },
  'sin-pesos':    { chip: 'warn', texto: 'Falta ponderación' },
  'lograda':      { chip: 'ok',   texto: 'Meta lograda' },
  'no-lograda':   { chip: 'info', texto: 'Finalizada · Bajo meta' },
  'asegurada':    { chip: 'ok',   texto: 'Meta asegurada' },
  'encaminado':   { chip: 'ok',   texto: 'Bien encaminado' },
  'subir-ritmo':  { chip: 'warn', texto: 'Subir el ritmo' },
  'inalcanzable': { chip: 'info', texto: 'Meta por ajustar' },
  'sin-meta':     { chip: 'info', texto: 'Sin meta' },
};

/**
 * Estado que se MUESTRA (lista lateral, encabezado del detalle y resumen): si la asignatura se cerró
 * a mano, el chip lo dice siempre ("Cerrada · Meta lograda" / "Cerrada · Bajo meta").
 */
function estadoVisual(a) {
  if (!a.cerradaManual) return ESTADOS[a.estado];
  switch (a.estado) {
    case 'lograda': return { chip: 'ok', texto: '🔒 Cerrada · Meta lograda' };
    case 'no-lograda': return { chip: 'info', texto: '🔒 Cerrada · Bajo meta' };
    case 'sin-pesos': return { chip: 'warn', texto: '🔒 Cerrada · Falta %' };
    default: return { chip: '', texto: '🔒 Cerrada · Sin notas' };
  }
}

/** (v8) Elementos recién creados que deben entrar con una animación breve en el próximo render. */
const animar = { asig: null, eval: null, decima: null, fecha: null };
const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function marcarAnimaciones() {
  if (animar.eval) { document.querySelector(`[data-eval="${CSS.escape(animar.eval)}"]`)?.classList.add('aparece'); animar.eval = null; }
  if (animar.decima) { document.querySelector(`[data-decima="${CSS.escape(animar.decima)}"]`)?.classList.add('aparece'); animar.decima = null; }
}
/** Anima la salida de los elementos y luego ejecuta fn (inmediato si hay movimiento reducido). */
function salirYLuego(selectores, fn) {
  const els = document.querySelectorAll(selectores);
  if (!els.length || movimientoReducido()) { fn(); return; }
  els.forEach(el => el.classList.add('sale'));
  setTimeout(fn, 170);
}

let temporizadorToast;
let accionToast = null;
/** Toast con acción opcional (ej. "Deshacer"). */
function toast(msg, accion, opciones = {}) {
  const t = $('#toast');
  t.innerHTML = `${opciones.clase === 'celebra' ? '<span class="toast-emoji" aria-hidden="true">🎉</span>' : ''}<span>${esc(msg)}</span>${accion ? `<button class="toast-btn" data-action="toast-accion">${esc(accion.etiqueta)}</button>` : ''}`;
  accionToast = accion?.fn ?? null;
  // v26: con un diálogo modal abierto, todo lo de afuera queda inerte y el botón "Deshacer" no se podía
  // pulsar (ni con teclado). El aviso se mueve DENTRO del diálogo abierto y vuelve al <body> al cerrarlo.
  const modal = [...document.querySelectorAll('dialog[open]')].filter(d => d.matches(':modal')).at(-1);
  const destino = modal || document.body;
  if (t.parentElement !== destino) { destino.appendChild(t); void t.offsetWidth; }
  t.className = `toast visible ${opciones.clase || ''}`;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => { t.classList.remove('visible'); accionToast = null; }, opciones.duracion ?? (accion ? 7000 : 3200));
}

// v26: al cerrarse el diálogo que contenía el aviso, el aviso vuelve al <body> (sigue visible si aún no vence)
document.addEventListener('close', e => {
  const t = $('#toast');
  if (t && e.target instanceof HTMLDialogElement && e.target.contains(t)) document.body.appendChild(t);
}, true);

/** Ejecuta fn conservando el foco del campo activo (por su data-key). */
function preservarFoco(fn) {
  const k = document.activeElement?.dataset?.key;
  fn();
  if (k) document.querySelector(`[data-key="${CSS.escape(k)}"]`)?.focus();
}

function descargarJSON(nombreArchivo, datos) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const slug = s => Importador.normalizar(s).replace(/\s+/g, '-').slice(0, 40) || 'perfil';

/* =========================================================
 * 3. Render principal
 * ========================================================= */

/** Dibujo completo. v25: un error fuera de las secciones (p. ej. al calcular) tampoco deja la app congelada. */
function render() { seguro(renderInterno); }
function renderInterno() {
  preservarFoco(() => {
    const p = perfil();
    renderTopbar();
    if ($('#dlg-perfiles').open) renderGestion();
    if ($('#dlg-snapshots').open) renderSnapshots();   // v26: tras "Deshacer" o al cambiar de perfil
    const enAdmision = store.vista === 'admision';
    const enPaes = store.vista === 'paes';
    const enUni = store.vista === 'universidades';
    const enEstudio = store.vista === 'estudio';
    $('#vista-notas').hidden = enAdmision || enPaes || enUni || enEstudio;
    $('#vista-estudio').hidden = !enEstudio;
    $('#vista-admision').hidden = !enAdmision;
    $('#vista-paes').hidden = !enPaes;
    $('#vista-universidades').hidden = !enUni;
    document.querySelectorAll('.tab[data-vista]').forEach(b => {
      b.classList.toggle('activa', b.dataset.vista === store.vista);
      if (b.dataset.vista === store.vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#tab-nem-badge').hidden = !esEscolar();
    if (enAdmision) { $('#vista-admision').dataset.sub = store.subvista === 'cortes' ? 'cortes' : 'nem'; seguro(renderAdmision, '#vista-admision'); seguro(aplicarPlegables); return; }
    if (enPaes) { seguro(renderPaes, '#vista-paes'); return; }
    if (enUni) { seguro(renderUniversidades, '#vista-universidades'); return; }
    if (enEstudio) { seguro(renderEstudio, '#vista-estudio'); return; }

    const todos = p.asignaturas.map(a => Calc.analizarAsignatura(a, p.escala));
    const visibles = esConsolidado() ? todos : todos.filter(a => a.asig.periodoId === p.periodoActivo);
    const prioridades = Calc.priorizar(visibles, p.escala);
    const idPrioritaria = prioridades[0]?.asig.id ?? null;
    if (!visibles.some(a => a.asig.id === p.seleccionada)) p.seleccionada = visibles[0]?.asig.id ?? null;

    // v15: sin materias, la vista se concentra en "Empieza tu ruta" (se ocultan resúmenes vacíos)
    $('#vista-notas').classList.toggle('modo-inicio', !visibles.length);
    // v14: cada bloque se dibuja por separado; si uno falla, los demás (lista, notas) igual se actualizan
    seguro(renderPeriodos, '#periodos');
    seguro(renderFrase, '#frase-dia');
    seguro(() => renderResumen(visibles, todos, prioridades), '#resumen');
    seguro(() => renderPromocion(todos), '#promocion');
    seguro(() => renderMetaGeneral(visibles));
    seguro(() => renderWidgetDia(visibles, prioridades), '#widget-dia');
    seguro(() => renderConsolidadoAsignaturas(todos), '#consolidado-asig');
    seguro(() => renderLista(visibles, idPrioritaria), '#lista');
    seguro(() => renderDetalle(visibles, idPrioritaria), '#detalle');
    seguro(marcarAnimaciones);
    seguro(aplicarPlegables);
  });
}

/* ---------- Celular (v17): bloques secundarios plegables ---------- */

const esMovil = () => matchMedia('(max-width: 860px)').matches;
// Abiertos por defecto: lo principal (evaluaciones, camino). Plegados: lo que se consulta de vez en cuando.
const plegados = new Set(matchMedia('(max-width: 860px)').matches ? ['decimas', 'checklist', 'guia', 'camino', 'promocion', 'consolidado', 'catalogo'] : ['decimas']);

/** Marca cada bloque plegable según lo que la persona abrió o cerró (solo tiene efecto visual en el celular). */
function aplicarPlegables() {
  document.querySelectorAll('[data-plegable]').forEach(el => {
    const cerrado = plegados.has(el.dataset.plegable);
    el.classList.toggle('plegado', cerrado);
    const cab = el.querySelector(':scope > .seccion-cab, :scope > .promocion-cab');
    if (cab) {
      cab.setAttribute('role', 'button');
      cab.setAttribute('tabindex', '0');
      cab.setAttribute('aria-expanded', String(!cerrado));
    }
  });
}

/** Etiqueta flotante breve con el nombre de la sección (en el celular la barra inferior muestra solo íconos). */
let temporizadorEtiqueta;
function mostrarEtiquetaSeccion(texto) {
  const el = $('#etiqueta-seccion');
  if (!el || !texto) return;
  el.textContent = texto;
  el.hidden = false;
  el.classList.remove('visible'); void el.offsetWidth; el.classList.add('visible');
  clearTimeout(temporizadorEtiqueta);
  temporizadorEtiqueta = setTimeout(() => { el.classList.remove('visible'); setTimeout(() => { el.hidden = true; }, 200); }, 1300);
}

/** (v14) Meta de una asignatura para mostrar: "6,0" o "sin meta". */
const tieneMeta = asig => typeof asig.meta === 'number' && Number.isFinite(asig.meta);
const textoMeta = asig => (tieneMeta(asig) ? String(asig.meta).replace('.', ',') : 'sin meta');

/** Ejecuta una parte del dibujo sin que un error en ella bloquee el resto de la pantalla. */
/**
 * Dibuja una sección aislando sus errores (v14). v25: si falla, la sección muestra un aviso en vez de quedar
 * en blanco o desactualizada, y se avisa una vez con un toast (los datos no se tocan).
 */
let avisoErrorDibujo = 0;
function seguro(fn, contenedor) {
  try { fn(); return true; }
  catch (e) {
    console.error('Error al dibujar una sección:', e);
    const el = contenedor ? document.querySelector(contenedor) : null;
    if (el) { el.hidden = false; el.innerHTML = '<p class="aviso-seccion" role="alert">No se pudo mostrar esta sección. Tus datos están a salvo: recarga la página y, si sigue, exporta un respaldo desde “Más”.</p>'; }
    if (Date.now() - avisoErrorDibujo > 10000) { avisoErrorDibujo = Date.now(); toast('Una sección no se pudo mostrar. Tus datos están a salvo.'); }
    return false;
  }
}
// Errores no capturados (promesas incluidas): quedan en la consola y no congelan la interfaz
addEventListener('unhandledrejection', e => { console.error('Promesa rechazada sin manejar:', e.reason); });

/* ---------- Tema y variantes de fondo (v10 → v26) ---------- */

// v26: cuatro fondos (Claro, Pizarra, Oscuro, Medianoche) + Automático. La elección vive en store.config.tema
// (se valida en normalizarStore y viaja en el respaldo); CLAVE_TEMA guarda una copia para pintar sin destello.
const consultaOscuro = matchMedia('(prefers-color-scheme: dark)');
/** Tema efectivo (valor de data-theme): 'auto' se resuelve según el sistema. */
const resolverTema = t => (t === 'auto' ? (consultaOscuro.matches ? 'dark' : 'light') : (Object.hasOwn(TEMAS, t) ? t : 'dark'));
const temaActual = () => resolverTema(document.documentElement.dataset.theme);
const ICONO_TEMA = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2Zm-5.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>';
const ICONO_AUTO = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 4V1L8 5l4 4V6a6 6 0 0 1 5.7 7.9l1.5 1.5A8 8 0 0 0 12 4Zm0 14a6 6 0 0 1-5.7-7.9L4.8 8.6A8 8 0 0 0 12 20v3l4-4-4-4v3Z"/></svg>';
const ICONO_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.5 16.2-3.7-3.7-1.4 1.4 5.1 5.1L20.6 8l-1.4-1.4z"/></svg>';

/** Botón del pie: abre el selector de fondos. */
function renderBotonTema() {
  const b = $('#btn-tema');
  if (!b) return;
  const elegido = store.config.tema;
  const texto = `Tema: ${TEMAS[elegido]?.nombre || 'Oscuro'} (cambiar fondo)`;
  if (!b.dataset.icono) { b.innerHTML = ICONO_TEMA; b.dataset.icono = '1'; }
  b.title = texto;
  b.setAttribute('aria-label', texto);
  if (!$('#panel-tema').hidden) renderPanelTema();
}

/** (v26) Selector estilo "temas predeterminados": muestras cuadradas con un ✓ en la elegida. */
function renderPanelTema() {
  const elegido = store.config.tema;
  $('#panel-tema').innerHTML = `
    <div class="tema-cab"><strong id="tema-titulo">Fondo de la app</strong><small class="muted">${esc(TEMAS[elegido]?.detalle || '')}</small></div>
    <div class="tema-muestras" role="radiogroup" aria-labelledby="tema-titulo">
      ${Object.entries(TEMAS).map(([k, t]) => `
        <button type="button" class="tema-muestra" data-action="elegir-tema" data-tema="${k}" role="radio" aria-checked="${k === elegido}"
          title="${esc(`${t.nombre}: ${t.detalle}`)}" aria-label="${esc(t.nombre)}">
          <span class="tema-chip tema-chip-${k}" aria-hidden="true">${k === 'auto' ? ICONO_AUTO : ''}</span>
          ${k === elegido ? `<span class="tema-check" aria-hidden="true">${ICONO_CHECK}</span>` : ''}
          <span class="tema-nombre">${esc(t.nombre)}</span>
        </button>`).join('')}
    </div>`;
}

/** Pone data-theme sin transición (carga, deshacer, importar respaldo o cambio del sistema en modo Automático). */
function sincronizarTema() {
  const efectivo = resolverTema(store.config.tema);
  if (document.documentElement.dataset.theme !== efectivo) document.documentElement.dataset.theme = efectivo;
}
consultaOscuro.addEventListener?.('change', () => { if (store.config.tema === 'auto') sincronizarTema(); });

/** Cambia el fondo de toda la app con un fundido suave y recuerda la elección. */
let temaDestino = null;   // tema pedido cuya transición aún no termina (clics seguidos: manda el último)
function elegirTema(elegido, origen) {
  if (!Object.hasOwn(TEMAS, elegido)) return;
  const nuevo = resolverTema(elegido);
  const anterior = temaActual();
  store.config.tema = elegido;
  guardar();
  try { localStorage.setItem(CLAVE_TEMA, elegido); } catch { /* sin almacenamiento: dura esta sesión */ }
  renderBotonTema();
  temaDestino = nuevo;
  const aplicar = () => {
    if (temaDestino !== nuevo) return;   // llegó un clic posterior: manda el más reciente
    temaDestino = null;
    document.documentElement.dataset.theme = nuevo;
  };
  if (nuevo === anterior) { aplicar(); return; }
  // v13.2: el cambio de tema es un FUNDIDO (sin desplazamientos ni zoom), apto también con
  // "reducir movimiento"; en ese caso solo se omite el desenfoque.
  const reducido = movimientoReducido();
  void origen;
  // v13.1: fundido cruzado de 0,6 s: el tema nuevo aparece atenuado y recupera su brillo poco a poco,
  // así al pasar a un fondo claro la vista no se ilumina de golpe y no encandila.
  const DURACION = 600;
  const haciaClaro = nuevo === 'light';

  if (document.startViewTransition && !document.hidden) {
    const vt = document.startViewTransition(aplicar);
    vt.ready.then(() => {
      const raiz = document.documentElement;
      const curva = 'cubic-bezier(.45, 0, .2, 1)';
      const sinBlur = lista => (reducido ? lista.map(v => v.replace(/\s*blur\([^)]*\)/g, '') || 'none') : lista);
      raiz.animate(
        { opacity: [1, 0], filter: sinBlur(['blur(0px)', 'blur(2px)']) },
        { duration: DURACION * 0.85, easing: curva, fill: 'forwards', pseudoElement: '::view-transition-old(root)' });
      raiz.animate(
        {
          opacity: [0, 0.35, 1],
          filter: sinBlur(haciaClaro
            ? ['brightness(.45) saturate(.8) blur(2px)', 'brightness(.7) saturate(.9) blur(1px)', 'brightness(1) saturate(1) blur(0px)']
            : ['brightness(1.15) blur(2px)', 'brightness(1.05) blur(1px)', 'brightness(1) blur(0px)']),
          offset: [0, 0.45, 1],
        },
        { duration: DURACION, easing: curva, pseudoElement: '::view-transition-new(root)' });
    }).catch(() => { /* si el navegador cancela la transición, el tema ya quedó aplicado */ });
    return;
  }
  // Navegadores sin View Transitions: colores que se funden en ~0,5 s (clase temporal)
  const html = document.documentElement;
  html.classList.add('tema-transicion');
  aplicar();
  setTimeout(() => html.classList.remove('tema-transicion'), DURACION);
}


function renderTopbar() {
  sincronizarTema();   // v26: tras deshacer o importar un respaldo, el fondo sigue a store.config.tema
  renderBotonTema();
  renderAtajoNotas();
  // v15: el selector solo cambia de perfil; crear uno nuevo tiene su propio botón ("＋ Nuevo")
  $('#sel-perfil').innerHTML = opts(store.perfiles.map(p => [p.id, p.nombre]), store.perfilActivo);
  $('#contexto-perfil').textContent = contextoPerfil();
  $('#contexto-perfil').title = contextoPerfil();   // texto completo si se recorta
  const ctxMovil = $('#contexto-perfil-movil');
  if (ctxMovil) ctxMovil.textContent = contextoPerfil();
  const n = store.papelera.length;
  $('#n-papelera').textContent = n;
  $('#n-papelera').hidden = !n;
  renderCampana();
}

/* ---------- Frase del día (determinista por fecha) ---------- */

/**
 * (v8) Repertorio según la etapa: frases propias + citas de autores; en perfiles universitarios se
 * suman frases sobre formación profesional y se omiten las que hablan del colegio o de la escala 1–7.
 */
let fraseAnimar = false;
function repertorioFrases() {
  const uni = perfil().modalidad === 'uni';
  const propias = uni ? REF.FRASES.filter(t => !/1 al 7|colegio/i.test(t)).concat(REF.FRASES_UNI) : REF.FRASES;
  // Las citas se intercalan para que no aparezcan todas seguidas en días consecutivos
  const lista = [];
  const n = Math.max(propias.length, REF.CITAS.length * 2);
  for (let i = 0; i < n; i++) {
    if (i < propias.length) lista.push(propias[i]);
    if (i % 2 === 1 && REF.CITAS[(i - 1) / 2]) lista.push(REF.CITAS[(i - 1) / 2]);
  }
  return lista;
}

function renderFrase() {
  const frases = repertorioFrases();
  const f = frases[Calc.indiceDiario(hoy(), frases.length, fraseDesplazamiento)];
  const cita = typeof f === 'object';
  const largo = (cita ? f.texto : f).length > 95;
  $('#frase-dia').classList.toggle('larga', largo);
  $('#frase-dia').innerHTML = `
    <span class="frase-icono" aria-hidden="true">“</span>
    <figure class="frase-cuerpo">
      <blockquote>${esc(cita ? f.texto : f)}</blockquote>
      ${cita ? `<figcaption>— ${esc(f.autor)}${f.obra ? `, <cite>${esc(f.obra)}</cite>` : ''}</figcaption>` : ''}
    </figure>
    <button class="btn ghost sm" data-action="otra-frase" title="Ver otra frase">Otra frase ↻</button>`;
  // Microanimación al cambiar de frase (no en el primer dibujo del día)
  if (fraseAnimar) { $('#frase-dia .frase-cuerpo').classList.add('aparece'); fraseAnimar = false; }
}

/* ---------- Fechas clave: feriados y cuenta regresiva (v9) ---------- */

let fechasVerPasadas = false;
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "2026-12-08" → "mar 8 dic" (con el año si no es el actual). */
function fechaLegible(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = DIAS_SEMANA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dia} ${d} ${MESES_CORTOS[m - 1]}${String(y) !== hoy().slice(0, 4) ? ` ${y}` : ''}`;
}
const textoDias = n => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : `hace ${-n} días`);

/** Eventos con fecha, ordenados, con los días que faltan (negativo = ya pasó). */
function eventosConDias(p = perfil()) {
  const h = hoy();
  return p.calendario.eventos.filter(e => e.fecha).map(e => ({ ...e, dias: Calc.diasEntre(h, e.fecha) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Bloque al costado de la frase: próximo hito (cuenta regresiva), próximo feriado y la próxima
 * evaluación de la asignatura prioritaria. Ocupa poco y se apila bajo la frase en móvil.
 */
function renderWidgetDia(visibles, prioridades) {
  const p = perfil();
  const futuros = eventosConDias(p).filter(e => e.dias >= 0);
  const hito = futuros.find(e => e.tipo !== 'feriado');
  const feriado = futuros.find(e => e.tipo === 'feriado');
  const sinFecha = p.calendario.eventos.find(e => !e.fecha && e.tipo === 'hito');
  // Próxima evaluación: la primera pendiente de la asignatura prioritaria (o de cualquiera abierta)
  const top = prioridades[0] || visibles.find(a => a.asig.evaluaciones.some(ev => !Calc.estaCompleta(ev)) && !a.cerradaManual);
  const pend = top?.asig.evaluaciones.find(ev => !Calc.estaCompleta(ev));
  const filas = [];
  if (hito) filas.push(`<li class="wd-hito"><span class="wd-num">${hito.dias}</span><span><strong>${esc(hito.nombre)}</strong><small>${hito.dias === 0 ? 'es hoy' : `${hito.dias === 1 ? 'falta 1 día' : `faltan ${hito.dias} días`}`} · ${fechaLegible(hito.fecha)}</small></span></li>`);
  if (pend) filas.push(`<li><span class="wd-icono" aria-hidden="true">✎</span><span><strong>Próxima: ${esc(pend.nombre)}</strong><small>${esc(top.asig.nombre)}${top.necesaria !== null && ['encaminado', 'subir-ritmo'].includes(top.estado) ? (top.necesaria < escala().aprobacion ? ' · con aprobar te basta' : ` · apunta a ${fmtNec(Calc.limitar(top.necesaria, escala().min, escala().max))}`) : ''}</small></span></li>`);
  if (feriado) filas.push(`<li><span class="wd-icono" aria-hidden="true">☀</span><span><strong>${esc(feriado.nombre)}</strong><small>Feriado · ${textoDias(feriado.dias)} (${fechaLegible(feriado.fecha)})</small></span></li>`);
  if (!hito && sinFecha) filas.push(`<li><span class="wd-icono" aria-hidden="true">◷</span><span><strong>${esc(sinFecha.nombre)}</strong><small>Sin fecha: <button class="enlace" data-action="abrir-fechas">defínela</button></small></span></li>`);
  $('#widget-dia').innerHTML = `
    <div class="wd-cab"><span class="wd-titulo">Próximas fechas</span>
      <button class="btn ghost sm" data-action="abrir-fechas" title="Ver y editar feriados, fin de semestre y tus fechas">Editar ✎</button></div>
    ${filas.length ? `<ul class="wd-lista">${filas.slice(0, 3).join('')}</ul>` : '<p class="muted wd-vacio">Agrega el fin de tu semestre o tus pruebas para ver la cuenta regresiva.</p>'}`;
}

function abrirFechas() {
  renderFechas();
  $('#dlg-fechas').showModal();
}

/** Diálogo editable: todas las fechas del perfil (referenciales y propias), con los días que faltan. */
function renderFechas() {
  const p = perfil();
  const todos = eventosConDias(p);
  const sinFecha = p.calendario.eventos.filter(e => !e.fecha);
  const futuros = todos.filter(e => e.dias >= 0);
  const pasados = todos.filter(e => e.dias < 0);
  const fila = e => `
    <li class="fila-fecha ${e.tipo} ${animar.fecha === e.id ? 'aparece' : ''}" data-fecha-id="${e.id}">
      <span class="ff-dias ${e.dias === undefined ? 'sin' : ''}">${e.dias === undefined ? '—' : e.dias === 0 ? 'Hoy' : e.dias > 0 ? `${e.dias} d` : 'Pasó'}</span>
      <input data-fecha-campo="nombre" data-key="ff-n-${e.id}" value="${esc(e.nombre)}" maxlength="80" aria-label="Nombre">
      <input type="date" data-fecha-campo="fecha" data-key="ff-f-${e.id}" value="${e.fecha}" aria-label="Fecha">
      <select data-fecha-campo="tipo" aria-label="Tipo">${opts(Object.entries(TIPOS_FECHA), e.tipo)}</select>
      <button type="button" class="icono" data-action="fecha-quitar" data-id="${e.id}" title="Quitar" aria-label="Quitar ${esc(e.nombre)}">✕</button>
      ${e.origen === 'ref' ? '<small class="ff-origen">referencial</small>' : e.origen === 'editada' ? '<small class="ff-origen">editada por ti</small>' : ''}
      ${e.nota && e.origen === 'ref' ? `<small class="ff-nota">${esc(e.nota)}</small>` : ''}
    </li>`;
  animar.fecha = null;
  $('#fechas-cuerpo').innerHTML = `
    <div class="seccion-cab"><h2>Feriados y fechas clave</h2><button type="button" class="btn ghost sm" data-action="cerrar-dialogo">Cerrar ✕</button></div>
    <p class="nota-aviso"><strong>Todo es editable.</strong> Las fechas “referencial” vienen precargadas: ${esc(REF.FUENTE_FECHAS)}</p>
    <form class="form-fecha" data-form-fecha autocomplete="off">
      <input name="nombre" placeholder="Ej. Fin del semestre, Prueba de Física" maxlength="80" required aria-label="Nombre de la fecha">
      <input name="fecha" type="date" required aria-label="Fecha">
      <select name="tipo" aria-label="Tipo">${opts(Object.entries(TIPOS_FECHA), 'hito')}</select>
      <button class="btn primario sm" type="submit">Agregar</button>
    </form>
    ${sinFecha.length ? `<h3 class="ff-titulo">Sin fecha (complétalas)</h3><ul class="lista-fechas">${sinFecha.map(fila).join('')}</ul>` : ''}
    <h3 class="ff-titulo">Próximas · ${futuros.length}</h3>
    ${futuros.length ? `<ul class="lista-fechas">${futuros.map(fila).join('')}</ul>` : '<p class="muted">No hay fechas próximas.</p>'}
    ${pasados.length ? `<button type="button" class="enlace" data-action="fechas-pasadas">${fechasVerPasadas ? 'Ocultar' : 'Ver'} fechas pasadas (${pasados.length})</button>
      ${fechasVerPasadas ? `<ul class="lista-fechas pasadas">${pasados.slice().reverse().map(fila).join('')}</ul>` : ''}` : ''}
    <div class="fila-botones">
      ${p.calendario.quitadosRef.length ? `<button type="button" class="btn ghost sm" data-action="fechas-restaurar">Restaurar fechas de referencia (${p.calendario.quitadosRef.length})</button>` : ''}
    </div>`;
}

/* ---------- Consolidado: promedio de cada asignatura entre períodos (v9) ---------- */

/**
 * Tabla del Consolidado: una fila por asignatura emparejada por NOMBRE NORMALIZADO entre períodos
 * (no por posición), con el promedio de cada período y el general = media de los períodos con nota.
 * Marca con claridad cuando el cálculo es parcial (falta el período o su nota).
 */
function renderConsolidadoAsignaturas(todos) {
  const cont = $('#consolidado-asig');
  const p = perfil();
  if (!esConsolidado() || !todos.length) { cont.hidden = true; return; }
  // Solo los períodos que tienen alguna asignatura (en el orden elegido por el estudiante)
  const periodos = p.periodos.filter(per => todos.some(a => a.asig.periodoId === per.id));
  const grupos = Calc.promediosPorAsignatura(todos, periodos);
  const E = escala();
  const color = v => (v === null ? '' : v >= E.aprobacion - Calc.EPS ? 'ok' : 'bad');
  const filas = grupos.map(g => {
    const celdas = g.porPeriodo.map(x => `<td class="num ${x.existe ? '' : 'falta'}" title="${x.existe ? (x.actual === null ? 'Sin notas aún' : '') : 'No está en este período'}">${x.existe ? (x.actual === null ? '<small>sin notas</small>' : fmt(x.actual, 2)) : '—'}</td>`).join('');
    const faltan = g.porPeriodo.filter(x => x.actual === null).map(x => periodos.find(per => per.id === x.periodoId).nombre);
    const estado = g.conNota === 0 ? '<span class="chip">Sin notas</span>'
      : !g.parcial ? `<span class="chip ok">${periodos.length > 1 ? `Completo (${g.conNota} períodos)` : 'Único período'}</span>`
      : g.conNota === 1 ? `<span class="chip info" title="Falta: ${esc(faltan.join(', '))}">Parcial: solo ${esc(periodos.find(per => per.id === g.porPeriodo.find(x => x.actual !== null).periodoId).nombre)}</span>`
      : `<span class="chip info" title="Falta: ${esc(faltan.join(', '))}">Parcial: ${g.conNota} de ${periodos.length}</span>`;
    return `<tr><td>${esc(g.nombre)}${g.items.length > g.porPeriodo.filter(x => x.existe).length ? ' <small class="warn-texto" title="Hay una asignatura repetida en un mismo período">(repetida)</small>' : ''}</td>${celdas}
      <td class="num ${color(g.promedio)}"><strong>${fmt(g.promedio, 2)}</strong></td><td>${estado}</td></tr>`;
  }).join('');
  const conProm = grupos.filter(g => g.promedio !== null);
  const general = conProm.length ? conProm.reduce((s, g) => s + g.promedio, 0) / conProm.length : null;
  cont.hidden = false;
  cont.innerHTML = `
    <div class="seccion-cab"><h2>Promedio por asignatura ${periodos.length > 1 ? 'entre períodos' : ''}</h2><span class="chip">${grupos.length} asignatura(s)</span></div>
    <div class="tabla-scroll"><table class="tabla tabla-compacta tabla-consolidado">
      <thead><tr><th>Asignatura</th>${periodos.map(per => `<th class="num">${esc(per.nombre)}</th>`).join('')}<th class="num">Promedio</th><th>Cálculo</th></tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr><td>Promedio de las asignaturas</td>${periodos.map(() => '<td></td>').join('')}<td class="num"><strong>${fmt(general, 2)}</strong></td><td></td></tr></tfoot>
    </table></div>
    <p class="nota-aviso">Se unen por nombre, no por orden. Promedio = media de los períodos con notas. “Parcial” = falta un período.</p>`;
}

/* ---------- Ir a mis notas (v14): desde cualquier vista ---------- */

/**
 * (v26) El acceso principal dice lo que hace en cada contexto: dentro de "Mis Notas" lleva directo a
 * escribir una nota nueva (acción más frecuente); desde otra sección, vuelve a tus notas.
 */
function renderAtajoNotas() {
  const b = $('.btn-ir-notas');
  if (!b) return;
  const enNotas = store.vista === 'notas';
  const texto = enNotas ? (perfil().seleccionada ? 'Agregar nota' : 'Agregar asignatura') : 'Ir a mis notas';
  const span = b.querySelector('span');
  if (span && span.textContent !== texto) span.textContent = texto;
  b.title = enNotas ? `${texto}: salta al formulario` : 'Ir directo a tus notas (registro de evaluaciones)';
  b.setAttribute('aria-label', texto);
}

function irAMisNotas() {
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  store.vista = 'notas';
  guardar();
  render();
  const p = perfil();
  const destino = p.seleccionada ? $('#detalle .form-eval [name=nombre]') || $('#detalle') : $('#form-asignatura [name=nombre]');
  (p.seleccionada ? $('#detalle') : $('.lateral'))?.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => destino?.focus({ preventScroll: true }), movimientoReducido() ? 0 : 350);
}

/* ---------- Bienvenida del primer inicio (v14) ---------- */

function abrirBienvenida() {
  const p = perfil();
  $('#bienvenida-cuerpo').innerHTML = `
    <div class="bienvenida-sello" aria-hidden="true"><svg class="logo-svg" viewBox="0 0 68 54" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <defs><linearGradient id="logo-grad-b" x1="4" y1="46" x2="64" y2="4" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color: var(--logo-1)"/><stop offset=".55" style="stop-color: var(--logo-2)"/><stop offset="1" style="stop-color: var(--logo-3)"/>
      </linearGradient></defs>
      <g stroke="url(#logo-grad-b)" stroke-width="3.2">
        <path d="M9 14v28h15c4 0 6.5 1.6 9 4 2.5-2.4 5-4 9-4h13V24"/><path d="M5 18v28h18c4.5 0 7.5 1.4 10 4 2.5-2.6 5.5-4 10-4h16V22"/>
        <path d="M33 46V17c-2-3.3-5-5-10-5H13"/><path d="M33 17c2-3.3 5-5 9-5h3"/>
        <path class="logo-ruta" d="M9 40 19 25l12 13 31-31"/><path class="logo-ruta" d="M51 7h11v11"/>
      </g></svg></div>
    <h2 id="bienvenida-titulo">¡Bienvenido a Ruta Académica!</h2>
    <p>Solo necesitas un perfil. Puedes cambiarlo después en “Perfil”.</p>
    <label>¿Cómo se llama tu perfil? <input id="bienvenida-nombre" maxlength="40" placeholder="Ej: Franco · 3° Medio" autocomplete="off"></label>
    <label>Etapa
      <select id="bienvenida-modalidad">${opts(Object.entries(MODALIDADES), p.modalidad)}</select>
    </label>
    <p class="nota-aviso">Todo se guarda solo en este navegador. Escala de notas 1 a 7 (puedes cambiarla después).</p>
    <div class="fila-botones">
      <button type="button" class="btn ghost" data-action="bienvenida-detalles">Configurar más detalles</button>
      <button type="button" class="btn primario" data-action="bienvenida-crear">Crear mi perfil y empezar</button>
    </div>`;
  $('#dlg-bienvenida').showModal();
  setTimeout(() => $('#bienvenida-nombre')?.focus(), 50);
}

/** Crea (completa) el perfil inicial con un clic y deja a la persona lista para agregar materias. */
function crearPerfilBienvenida(conDetalles) {
  const p = perfil();
  const nombre = $('#bienvenida-nombre')?.value.trim();
  if (nombre) p.nombre = nombre.slice(0, 40);
  const mod = $('#bienvenida-modalidad')?.value;
  if (MODALIDADES[mod]) p.modalidad = mod;
  $('#dlg-bienvenida').close();
  primerInicio = false;
  guardar();
  render();
  // Igual que "Crear mi perfil y empezar": al guardar o cerrar el Perfil se abre la guía de inicio
  if (conDetalles) { guiaRetorno = { modo: 'inicio', paso: 0 }; abrirPerfil(false); return; }
  toast(`Perfil “${p.nombre}” creado. Agrega tus materias para empezar.`);
  setTimeout(() => abrirGuia('inicio'), 300);
}

/* ---------- PAES: escalas de conversión por prueba (v14) ---------- */

const paesEscala = { prueba: 'cl', escala: '' };
const GRUPOS_ESCALA = [
  ['cl', 'Competencia Lectora'], ['m1', 'Matemática M1'], ['m2', 'Matemática M2'],
  ['ciencias_biologia', 'Ciencias · Biología'], ['ciencias_fisica', 'Ciencias · Física'], ['ciencias_quimica', 'Ciencias · Química'], ['ciencias_tp', 'Ciencias · TP'],
  ['historia', 'Historia y Cs. Sociales'],
];

function htmlEscalas() {
  const esc0 = escalaPaes(paesEscala.escala || ESCALA_PAES_DEFECTO());
  const prueba = GRUPOS_ESCALA.some(([k]) => k === paesEscala.prueba) ? paesEscala.prueba : 'cl';
  const tabla = esc0.tablas[prueba] || [];
  const nombre = GRUPOS_ESCALA.find(([k]) => k === prueba)[1];
  // La tabla se muestra en columnas (correctas → puntaje), fácil de recorrer
  const filas = tabla.map(([c, pts]) => `<li><span class="num">${c}</span><strong class="num">${pts}</strong></li>`).join('');
  return `
    <div class="panel">
      <div class="seccion-cab"><h2>Escalas de conversión</h2>
        <label class="campo-linea">Tabla <select data-escala-sel>${opts(REF.ESCALAS_PAES.map(x => [x.id, x.etiqueta]), esc0.id)}</select></label></div>
      <div class="chips-pruebas" role="tablist" aria-label="Prueba">
        ${GRUPOS_ESCALA.map(([k, n], i) => `<button class="chip-prueba c${[1, 8, 5, 2, 2, 2, 2, 3][i]} ${k === prueba ? 'activa' : ''}" role="tab" aria-selected="${k === prueba}" data-action="escala-prueba" data-prueba="${k}">${esc(n)}</button>`).join('')}
      </div>
      <h3 class="escala-titulo">${esc(nombre)} <small>· ${tabla.length - 1} correctas como máximo · 100 a 1.000 puntos</small></h3>
      <ul class="escala-grid" aria-label="Respuestas correctas y puntaje PAES">${filas}</ul>
      ${prueba === 'm2' && esc0.notaM2 ? `<p class="nota-aviso">${esc(esc0.notaM2)}</p>` : ''}
      <p class="nota-aviso">Correctas → puntaje PAES. Tabla oficial: ${esc(esc0.etiqueta.replace(/^DEMRE · /, ''))}. <a href="${urlSegura(esc0.url)}" target="_blank" rel="noopener noreferrer">demre.cl ↗</a></p>
      <button class="btn sm" data-action="paes-sub" data-sub="ensayos">Registrar un ensayo con esta tabla</button>
    </div>`;
}

/* ---------- Barra lateral desplegable en pantallas medianas (v20) ---------- */

/** Entre 861 y 1.180 px la barra es una columna de íconos; ☰ la despliega encima del contenido. */
function alternarSidebar(abrir = !document.body.classList.contains('sb-abierta')) {
  document.body.classList.toggle('sb-abierta', abrir);
  $('#sb-fondo').hidden = !abrir;
  $('.btn-menu-lateral')?.setAttribute('aria-expanded', String(abrir));
  if (abrir) $('#sidebar .tab.activa')?.focus();
}
const cerrarSidebar = () => { if (document.body.classList.contains('sb-abierta')) alternarSidebar(false); };
// Elegir una sección, pulsar Esc o agrandar la ventana cierra el panel desplegado
document.addEventListener('click', e => { if (e.target.closest?.('#sidebar .tab, #sidebar .sb-atajo')) cerrarSidebar(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarSidebar(); });
addEventListener('resize', () => { if (innerWidth > 1180 || innerWidth <= 860) cerrarSidebar(); });

/* ---------- Grupos plegables de la barra lateral (v21) ---------- */

// Preferencia por navegador (comodidad, no dato académico): qué grupos dejó cerrados el usuario
const CLAVE_SB_GRUPOS = 'rutaAcademica.sbGrupos';
const sbPlegados = (() => { try { return new Set(JSON.parse(localStorage.getItem(CLAVE_SB_GRUPOS) || '[]')); } catch { return new Set(); } })();
function aplicarSbGrupos() {
  document.querySelectorAll('.sb-grupo').forEach(g => {
    const cerrado = sbPlegados.has(g.dataset.grupo);
    g.classList.toggle('plegado', cerrado);
    g.querySelector('.sb-grupo-cab')?.setAttribute('aria-expanded', String(!cerrado));
  });
}
function alternarSbGrupo(id) {
  if (sbPlegados.has(id)) sbPlegados.delete(id); else sbPlegados.add(id);
  try { localStorage.setItem(CLAVE_SB_GRUPOS, JSON.stringify([...sbPlegados])); } catch { /* sin almacenamiento: solo dura esta visita */ }
  aplicarSbGrupos();
}
aplicarSbGrupos();

/* ---------- Tono según la etapa del perfil (v20) ---------- */

/** inicial (1°–2° básico) · basica (3°–6° básico) · transicion (7° básico – 2° medio) · admision (3°–4° medio) · uni */
function etapaPerfil(p = perfil()) {
  if (p.modalidad === 'uni') return 'uni';
  const k = String(p.nivel || '');
  if (/^[12]B$/.test(k)) return 'inicial';
  if (/^[3-6]B$/.test(k)) return 'basica';
  if (k === '3M' || k === '4M') return 'admision';
  return 'transicion';
}
const tono = (p = perfil()) => REF.TONO_ETAPA[etapaPerfil(p)];
/** Tono sin romper si aún no hay perfil cargado (textos de apoyo). */
function seguroTono() { try { return tono(); } catch { return null; } }

/* ---------- Métodos de estudio por materia (v20) ---------- */

let estudioSel = null;   // { asig: id } o { grupo: clave }
/** Grupo de métodos de una asignatura según su nombre (Matemática, Física, Historia…). */
function grupoMetodos(nombre) {
  const cats = [...Importador.categoriasDe(nombre)];
  const tema = Importador.inferirTema([nombre])?.categoria;
  if (tema) cats.unshift(tema);
  for (const c of cats) if (REF.GRUPO_METODOS[c]) return REF.GRUPO_METODOS[c];
  if (/ciudadan|sociedad|geograf|econom/i.test(nombre)) return 'historia';
  return 'general';
}
/** Métodos del grupo, con la variante de la etapa (universidad o básica) al principio. */
function metodosDe(grupo) {
  const g = REF.METODOS_ESTUDIO[grupo] || REF.METODOS_ESTUDIO.general;
  const etapa = etapaPerfil();
  const extra = etapa === 'uni' ? g.uni : (etapa === 'basica' || etapa === 'inicial') ? g.basica : null;
  return [...(extra ? [{ ...extra, destacado: true }] : []), ...g.metodos];
}

function renderEstudio() {
  const p = perfil();
  const propias = p.asignaturas.filter(a => esConsolidado() || a.periodoId === p.periodoActivo);
  // Selección por defecto: la asignatura prioritaria o la primera; sin materias, técnicas generales
  if (!estudioSel || (estudioSel.asig && !p.asignaturas.some(a => a.id === estudioSel.asig))) {
    const prio = Calc.priorizar(propias.map(a => Calc.analizarAsignatura(a, p.escala)), p.escala)[0];
    estudioSel = prio ? { asig: prio.asig.id } : propias[0] ? { asig: propias[0].id } : { grupo: 'general' };
  }
  const asigSel = estudioSel.asig ? p.asignaturas.find(a => a.id === estudioSel.asig) : null;
  const grupo = asigSel ? grupoMetodos(asigSel.nombre) : estudioSel.grupo;
  const G = REF.METODOS_ESTUDIO[grupo] || REF.METODOS_ESTUDIO.general;
  const chipsAsig = propias.map(a => `<button class="chip-prueba ${asigSel?.id === a.id ? 'activa' : ''}" data-action="estudio-sel" data-asig="${a.id}">${esc(a.nombre)}</button>`).join('');
  const chipsGrupo = Object.entries(REF.METODOS_ESTUDIO).map(([k, g]) => `<button class="chip-prueba ${!asigSel && grupo === k ? 'activa' : ''}" data-action="estudio-sel" data-grupo="${k}">${g.icono} ${esc(g.nombre)}</button>`).join('');
  // v23: cada tarjeta indica la técnica con evidencia que aplica; el botón es corto y queda dentro de la tarjeta
  const T = REF.TECNICAS_ESTUDIO || {};
  const tarjetas = metodosDe(grupo).map(m => {
    const ya = asigSel && (asigSel.checklist || []).some(c => Calc.claveAsignatura(c.texto) === Calc.claveAsignatura(m.check));
    const tec = T[m.tecnica];
    return `
      <article class="metodo ${m.destacado ? 'destacado' : ''}">
        <header><h3>${esc(m.titulo)}</h3><span class="chip metodo-tiempo">${esc(m.tiempo)}</span></header>
        ${tec ? `<p class="metodo-tecnica" title="${esc(tec.corto)}">${esc(tec.nombre)}</p>` : ''}
        <p class="metodo-como">${esc(m.como)}</p>
        <p class="metodo-porque"><strong>Por qué funciona:</strong> ${esc(m.porque)}</p>
        ${asigSel ? `<button class="btn sm metodo-btn ${ya ? 'ghost' : ''}" data-action="estudio-check" data-asig="${asigSel.id}" data-check="${esc(m.check)}" ${ya ? 'disabled' : ''} title="${ya ? 'Ya está en el checklist' : `Agregar al checklist de ${esc(asigSel.nombre)}`}">${ya ? '✓ En tu checklist' : '+ Agregar al checklist'}</button>` : ''}
      </article>`;
  }).join('');
  const transversales = Object.values(T).map(t => `
      <article class="metodo">
        <header><h3>${esc(t.nombre)}</h3><span class="chip metodo-tiempo">${esc(t.corto)}</span></header>
        <p class="metodo-como">${esc(t.como)}</p>
        <p class="metodo-porque"><strong>Por qué funciona:</strong> ${esc(t.porque)}</p>
      </article>`).join('');
  $('#vista-estudio').innerHTML = `
    <div class="panel estudio-cab">
      <div class="seccion-cab"><h2>Métodos de estudio</h2><span class="chip">${esc(tono().nombre)}</span></div>
      <p class="muted">${esc(tono().estudio)}</p>
      ${propias.length ? `<p class="estudio-etq">Tus asignaturas</p><div class="chips-pruebas">${chipsAsig}</div>` : ''}
      <details class="estudio-otras" ${!propias.length ? 'open' : ''}><summary>Ver por materia</summary><div class="chips-pruebas">${chipsGrupo}</div></details>
    </div>
    <div class="panel estudio-materia">
      <div class="seccion-cab"><h2><span aria-hidden="true">${G.icono}</span> ${esc(asigSel ? asigSel.nombre : G.nombre)}</h2>${asigSel ? `<span class="chip info">Técnicas de ${esc(G.nombre)}</span>` : ''}</div>
      <p class="estudio-enfoque">${G.formato ? `<strong>${esc(G.formato)}.</strong> ` : ''}${esc(G.enfoque)}</p>
      <div class="metodos-grid">${tarjetas}</div>
    </div>
    ${grupo === 'general' ? '' : `<div class="panel estudio-generales">
      <div class="seccion-cab"><h2>★ Sirven para todo</h2><span class="chip">Con evidencia</span></div>
      <p class="estudio-enfoque">Las cinco técnicas que más ayudan a recordar y entender, en cualquier materia.</p>
      <div class="metodos-grid compacto">${transversales}</div>
    </div>`}`;
}

/* ---------- Universidades (v14): sitios oficiales con filtro rápido ---------- */

const uniFiltro = { q: '', tipo: 'todas' };
const siglaDe = nombre => (String(nombre).match(/\(([^)]+)\)\s*$/) || [])[1] || '';
function universidadesFiltradas() {
  const cuentas = {};
  for (const c of store.catalogoCortes) cuentas[c.universidad] = (cuentas[c.universidad] || 0) + 1;
  const tokens = Importador.normalizar(uniFiltro.q).split(' ').filter(Boolean);
  return REF.UNIVERSIDADES_INFO.map(u => ({ ...u, sigla: siglaDe(u.nombre), carreras: cuentas[u.nombre] || 0 }))
    .filter(u => uniFiltro.tipo === 'todas' || (uniFiltro.tipo === 'catalogo' ? u.carreras > 0 : u.tipo === uniFiltro.tipo))
    .filter(u => tokens.every(t => Importador.normalizar(`${u.nombre} ${u.sigla} ${u.tipo}`).includes(t)))
    .sort((a, b) => b.carreras - a.carreras || a.nombre.localeCompare(b.nombre, 'es'));
}
const textoCuentaUni = () => { const n = universidadesFiltradas().length; return `${n} de ${REF.UNIVERSIDADES_INFO.length} universidades`; };
function htmlTarjetasUniversidades() {
  const lista = universidadesFiltradas();
  if (!lista.length) return '<p class="muted vacio-lista">Ninguna universidad coincide. Prueba con otra palabra o quita el filtro.</p>';
  return lista.map((u, i) => `
    <article class="uni-tarjeta" style="--uni-color: var(--cat-${(i % 8) + 1})">
      <header><span class="uni-sigla">${esc(u.sigla || u.nombre.replace(/^Universidad\s+/i, '').slice(0, 4))}</span><span class="chip">${u.tipo}</span></header>
      <h3>${esc(u.nombre.replace(/\s*\([^)]*\)\s*$/, ''))}</h3>
      <p class="muted">${u.carreras ? `${u.carreras} carrera(s) con corte 2026 en el catálogo` : 'Sin carreras en el catálogo de la app'}</p>
      <div class="uni-acciones">
        <a class="btn primario sm" href="${urlSegura(u.url)}" target="_blank" rel="noopener noreferrer">Sitio oficial ↗</a>
        ${u.carreras ? `<button class="btn ghost sm" data-action="uni-ver-carreras" data-sigla="${esc(u.sigla || u.nombre)}">Ver carreras y cortes</button>` : ''}
      </div>
      <small class="uni-url">${esc(u.url.replace(/^https?:\/\//, ''))}</small>
    </article>`).join('');
}
function renderUniversidades() {
  const filtros = [['todas', 'Todas'], ['Estatal', 'Estatales'], ['Privada', 'Privadas'], ['catalogo', 'Con carreras en el catálogo']];
  $('#vista-universidades').innerHTML = `
    <div class="panel uni-cab">
      <div class="seccion-cab"><h2>Universidades</h2><span class="chip" id="uni-cuenta">${textoCuentaUni()}</span></div>
      <p class="muted">Sitios oficiales: carreras, mallas, aranceles y becas.</p>
      <div class="uni-filtros">
        <input type="search" data-uni-buscar data-key="uni-buscar" value="${esc(uniFiltro.q)}" placeholder="Buscar por nombre o sigla (ej. uc, usach, valparaíso)" aria-label="Buscar universidad">
        <div class="segmentado" role="group" aria-label="Filtrar por tipo">${filtros.map(([k, n]) => `<button class="seg ${uniFiltro.tipo === k ? 'activa' : ''}" data-action="uni-filtro" data-tipo="${k}">${n}</button>`).join('')}</div>
      </div>
    </div>
    <div id="uni-lista" class="uni-grid">${htmlTarjetasUniversidades()}</div>
    <p class="nota-aviso">Sitios comprobados el 26-11-2026. Tipo: estatal o privada. Los enlaces se abren en una pestaña nueva.</p>`;
}

/* ---------- Mis ensayos PAES (v13) ---------- */

/**
 * Pruebas que se pueden registrar. Cada una sabe a qué puntaje del simulador corresponde
 * (componente) y, si REF.CONVERSION_PAES trae su tabla oficial, convierte correctas → puntaje.
 */
const PRUEBAS_ENSAYO = () => REF.PRUEBAS_ENSAYO;
const pruebaEnsayo = id => PRUEBAS_ENSAYO().find(x => x.id === id) || null;
const ESCALA_PAES_DEFECTO = () => REF.ESCALAS_PAES[0].id;
const escalaPaes = id => REF.ESCALAS_PAES.find(x => x.id === id) || REF.ESCALAS_PAES[0];
/** Tabla oficial [[correctas, puntaje]] de una prueba en una escala; su largo − 1 es el máximo de correctas. */
const tablaEnsayo = (prueba, escala) => escalaPaes(escala).tablas[prueba] || null;
const maxCorrectas = (prueba, escala) => { const t = tablaEnsayo(prueba, escala); return t ? t.length - 1 : null; };
const nombreCortoEscala = id => (id === 'reg2025' ? 'Regular 2025' : 'Invierno 2026');
const COLOR_PRUEBA = { cl: 'c1', m1: 'c8', m2: 'c5', ciencias: 'c2', historia: 'c3' };

/** (v16) "2026-11-25" → "25/11/2026" (formato chileno). Si ya viene en DD/MM/AAAA, se deja igual. */
function aFechaCl(valor) {
  const m = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor ?? '');
}
/** (v16) "25/11/2026", "25-11-2026" o "5/3/2026" → "2026-11-25"; null si no es una fecha válida. */
function desdeFechaCl(texto) {
  const t = String(texto ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;   // ej. 31/02
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Puntaje efectivo de un ensayo: el escrito a mano manda; si no, la conversión por tabla. */
function puntajeEnsayo(e) {
  if (typeof e.puntajeManual === 'number') return { valor: e.puntajeManual, origen: 'manual' };
  const v = Calc.puntajeDesdeCorrectas(e.correctas, tablaEnsayo(e.prueba, e.escala));
  return { valor: v, origen: v === null ? 'sin' : 'tabla' };
}

let ensayoEdicion = null;   // id del ensayo que se está editando en el formulario
let ensayoBorrador = { nombre: '', fecha: '', prueba: 'cl', correctas: '', puntaje: '', escala: '' };

function htmlEnsayos() {
  const p = perfil();
  const lista = p.ensayos.map(e => ({ ...e, ...(() => { const r = puntajeEnsayo(e); return { puntaje: r.valor, origenPuntaje: r.origen }; })() }));
  // Resumen por componente (CL, M1, M2, Ciencias, Historia): los módulos de Ciencias se agrupan
  const porComponente = Calc.resumenEnsayos(lista.map(e => ({ ...e, prueba: pruebaEnsayo(e.prueba)?.componente || e.prueba })));
  const b = ensayoBorrador;
  const prSel = pruebaEnsayo(b.prueba) || PRUEBAS_ENSAYO()[0];
  const esc0 = escalaPaes(b.escala || ESCALA_PAES_DEFECTO());
  const tablaSel = tablaEnsayo(prSel.id, esc0.id);
  const maxSel = maxCorrectas(prSel.id, esc0.id);
  const correctasNum = b.correctas === '' ? null : Number(b.correctas);
  const vista = Number.isInteger(correctasNum) ? Calc.puntajeDesdeCorrectas(correctasNum, tablaSel) : null;

  const tarjetas = REF.COMPONENTES_ADMISION.filter(([k]) => ['cl', 'm1', 'm2', 'ciencias', 'historia'].includes(k)).map(([k, nombre]) => {
    const r = porComponente[k];
    if (!r) return `<article class="ens-tarjeta vacia"><h3>${esc(nombre)}</h3><p class="muted">Sin ensayos aún.</p></article>`;
    return `
      <article class="ens-tarjeta">
        <header><h3>${esc(nombre)}</h3><span class="chip">${r.n} ensayo(s)</span></header>
        <div class="ens-cifras">
          <div><span class="ens-etq">Último</span><strong class="num">${r.ultimo.puntaje}</strong></div>
          <div><span class="ens-etq">Mejor</span><strong class="num ok-texto">${r.mejor.puntaje}</strong></div>
          <div><span class="ens-etq">Promedio</span><strong class="num">${Math.round(r.promedio)}</strong></div>
        </div>
        ${htmlSparkline(r.serie.map(e => e.puntaje), COLOR_PRUEBA[k])}
        ${r.cambio !== null ? `<p class="ens-cambio ${r.cambio > 0 ? 'sube' : r.cambio < 0 ? 'baja' : ''}">${r.cambio > 0 ? '▲' : r.cambio < 0 ? '▼' : '='} ${r.cambio > 0 ? '+' : ''}${r.cambio} pts desde tu primer ensayo</p>` : ''}
      </article>`;
  }).join('');

  const filas = lista.slice().sort((a, b2) => String(b2.fecha).localeCompare(String(a.fecha))).map(e => {
    const pr = pruebaEnsayo(e.prueba);
    return `
      <tr class="${ensayoEdicion === e.id ? 'editando' : ''}">
        <td class="num">${e.fecha ? esc(aFechaCl(e.fecha)) : '—'}</td>
        <td>${esc(e.nombre || 'Ensayo')}</td>
        <td><span class="punto-prueba ${COLOR_PRUEBA[pr?.componente] || ''}"></span>${esc(pr?.nombre || e.prueba)}</td>
        <td class="num">${typeof e.correctas === 'number' ? `${e.correctas}/${maxCorrectas(e.prueba, e.escala) ?? '?'}` : '—'}</td>
        <td class="num"><strong>${e.puntaje ?? '—'}</strong></td>
        <td><small>${e.origenPuntaje === 'tabla' ? `Tabla DEMRE ${nombreCortoEscala(e.escala)}` : e.origenPuntaje === 'manual' ? 'Escrito por ti' : 'Revisa: sin conversión'}</small></td>
        <td class="acciones-fila">
          <button class="btn ghost sm" data-action="ensayo-editar" data-id="${e.id}">Editar</button>
          <button class="icono" data-action="ensayo-eliminar" data-id="${e.id}" title="Eliminar" aria-label="Eliminar ensayo">✕</button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="panel ens-form-panel">
      <div class="seccion-cab"><h2>${ensayoEdicion ? 'Editar ensayo' : 'Registrar un ensayo'}</h2>
        <span class="chip info" title="${esc(esc0.fuente)}">Tablas oficiales DEMRE</span></div>
      <form class="ens-form" data-form-ensayo autocomplete="off">
        <label>Ensayo <input name="nombre" data-ens="nombre" data-key="ens-nombre" value="${esc(b.nombre)}" maxlength="60" placeholder="Ej: Ensayo 3 del preu"></label>
        <label>Fecha <input name="fecha" type="text" inputmode="numeric" data-ens="fecha" data-key="ens-fecha" value="${esc(aFechaCl(b.fecha || hoy()))}" placeholder="DD/MM/AAAA" maxlength="10" autocomplete="off" title="Día/mes/año, ej. 25/11/2026"></label>
        <label>Prueba <select name="prueba" data-ens="prueba">${opts(PRUEBAS_ENSAYO().map(x => [x.id, x.nombre]), prSel.id)}</select></label>
        <label>Respuestas correctas <input name="correctas" type="number" inputmode="numeric" min="0" max="${maxSel ?? 80}" step="1" data-ens="correctas" data-key="ens-correctas" value="${esc(b.correctas)}" placeholder="0 a ${maxSel ?? '?'}"></label>
        <label>Puntaje PAES <small>(opcional)</small> <input name="puntaje" type="number" inputmode="numeric" min="100" max="1000" step="1" data-ens="puntaje" data-key="ens-puntaje" value="${esc(b.puntaje)}" placeholder="${vista ?? 'Si tu ensayo lo entrega'}"></label>
        <label class="ens-escala">Tabla de conversión <select name="escala" data-ens="escala">${opts(REF.ESCALAS_PAES.map(x => [x.id, x.etiqueta]), esc0.id)}</select></label>
        <div class="ens-previa" aria-live="polite">
          ${b.puntaje !== '' ? `<span>Se guardará <strong class="num">${esc(b.puntaje)}</strong> (escrito por ti)</span>`
            : vista !== null ? `<span>Equivale a <strong class="num">${vista}</strong> puntos</span>`
            : correctasNum !== null && maxSel !== null && correctasNum > maxSel ? `<span class="warn-texto">En esta tabla el máximo es ${maxSel} correctas</span>`
            : '<span class="muted">Escribe tus respuestas correctas para ver el puntaje</span>'}
        </div>
        <div class="fila-botones">
          ${ensayoEdicion ? '<button type="button" class="btn ghost" data-action="ensayo-cancelar">Cancelar</button>' : ''}
          <button type="submit" class="btn primario">${ensayoEdicion ? 'Guardar cambios' : 'Agregar ensayo'}</button>
        </div>
      </form>
      <p class="nota-aviso">Las erradas no descuentan. Conversión con la tabla oficial de DEMRE: es una referencia, cada ensayo puede variar. <a href="${urlSegura(esc0.url)}" target="_blank" rel="noopener noreferrer">Fuente ↗</a></p>
    </div>

    <h2 class="paes-subtitulo">Tu evolución por prueba</h2>
    <div class="ens-grid">${tarjetas}</div>

    <div class="panel">
      <div class="seccion-cab"><h2>Historial de ensayos</h2>
        ${lista.some(e => typeof e.puntaje === 'number') ? `
          <div class="cab-derecha">
            <button class="btn sm" data-action="ensayos-al-simulador" data-modo="mejor" title="Copia tu mejor puntaje de cada prueba al simulador de admisión (te muestra qué cambia antes de confirmar)">Usar mejores en el simulador</button>
            <button class="btn ghost sm" data-action="ensayos-al-simulador" data-modo="ultimo" title="Copia tu último puntaje de cada prueba al simulador">Usar últimos</button>
          </div>` : ''}</div>
      ${lista.length ? `<div class="tabla-scroll"><table class="tabla tabla-compacta tabla-ensayos">
        <thead><tr><th>Fecha</th><th>Ensayo</th><th>Prueba</th><th class="num">Correctas</th><th class="num">Puntaje</th><th>Cálculo</th><th></th></tr></thead>
        <tbody>${filas}</tbody></table></div>`
        : '<p class="muted vacio-lista">Agrega tu primer ensayo para ver tu evolución.</p>'}
    </div>`;
}

/** Mini gráfico de línea (SVG) con la evolución de puntajes; escala fija 100–1000 para comparar pruebas. */
function htmlSparkline(valores, color) {
  if (valores.length < 2) return '<div class="ens-spark vacio"><small class="muted">Con 2 o más ensayos verás tu evolución</small></div>';
  const W = 220, H = 56, pad = 6;
  const min = Math.max(100, Math.min(...valores) - 40), max = Math.min(1000, Math.max(...valores) + 40);
  const x = i => pad + (i * (W - 2 * pad)) / (valores.length - 1);
  const y = v => H - pad - ((v - min) / Math.max(1, max - min)) * (H - 2 * pad);
  const puntos = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="ens-spark ${color || ''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución: ${valores.join(', ')} puntos">
    <polyline points="${puntos}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${valores.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="currentColor"><title>${v} pts</title></circle>`).join('')}
  </svg>`;
}

/** Guarda (o actualiza) el ensayo del formulario. */
function guardarEnsayo() {
  const p = perfil();
  const b = ensayoBorrador;
  const pr = pruebaEnsayo(b.prueba);
  const correctas = b.correctas === '' ? null : Number(b.correctas);
  const manual = b.puntaje === '' ? null : Number(b.puntaje);
  if (!pr) { toast('Elige la prueba'); return; }
  const escala = escalaPaes(b.escala || ESCALA_PAES_DEFECTO()).id;
  const max = maxCorrectas(pr.id, escala);
  if (correctas !== null && (!Number.isInteger(correctas) || correctas < 0 || (max !== null && correctas > max))) { toast(`Las respuestas correctas deben ser un número entero entre 0 y ${max ?? 'el total de preguntas'}`); return; }
  if (manual !== null && (!Number.isInteger(manual) || manual < 100 || manual > 1000)) { toast('El puntaje PAES debe ser un entero entre 100 y 1.000'); return; }
  if (correctas === null && manual === null) { toast('Escribe las respuestas correctas o el puntaje'); return; }
  if (manual === null && Calc.puntajeDesdeCorrectas(correctas, tablaEnsayo(pr.id, escala)) === null) { toast('No se pudo convertir: escribe el puntaje que te entregó el ensayo'); return; }
  // v16: la fecha se escribe DD/MM/AAAA y se guarda como AAAA-MM-DD (vacía = hoy)
  const fechaIso = String(b.fecha || '').trim() === '' ? hoy() : desdeFechaCl(b.fecha);
  if (!fechaIso) { toast('Escribe la fecha como DD/MM/AAAA (ej. 25/11/2026)'); $('#paes-cuerpo [data-key="ens-fecha"]')?.focus(); return; }
  const datos = { nombre: b.nombre.trim().slice(0, 60) || 'Ensayo', fecha: fechaIso, prueba: pr.id, correctas, puntajeManual: manual, escala };
  if (ensayoEdicion) {
    Object.assign(p.ensayos.find(e => e.id === ensayoEdicion) || {}, datos);
    toast('Ensayo actualizado');
  } else {
    p.ensayos.push({ id: uid(), ...datos });
    toast(`Ensayo agregado: ${pr.nombre}, ${puntajeEnsayo(datos).valor} puntos`);
  }
  ensayoEdicion = null;
  ensayoBorrador = { nombre: datos.nombre, fecha: datos.fecha, prueba: pr.id, correctas: '', puntaje: '', escala };   // listo para el siguiente del mismo ensayo
  actualizar();
}

/**
 * Lleva los mejores (o últimos) puntajes de ensayo al simulador de "NEM y Admisión".
 * Nunca sobrescribe en silencio: muestra qué valores escritos a mano cambiarían y pide confirmar.
 */
function ensayosAlSimulador(modo) {
  const p = perfil();
  const lista = p.ensayos.map(e => ({ ...e, puntaje: puntajeEnsayo(e).valor, prueba: pruebaEnsayo(e.prueba)?.componente || e.prueba }));
  const res = Calc.resumenEnsayos(lista);
  const cambios = Object.entries(res).map(([k, r]) => ({ k, nuevo: (modo === 'mejor' ? r.mejor : r.ultimo).puntaje, actual: p.admision.puntajes[k] ?? null }))
    .filter(c => c.nuevo !== c.actual);
  if (!cambios.length) { toast('El simulador ya tiene esos puntajes'); return; }
  const reemplaza = cambios.filter(c => c.actual !== null);
  const texto = cambios.map(c => `• ${etiquetaComponente(c.k)}: ${c.actual === null ? 'vacío' : c.actual} → ${c.nuevo}`).join('\n');
  if (reemplaza.length && !confirm(`Se actualizarán estos puntajes del simulador con tus ${modo === 'mejor' ? 'mejores' : 'últimos'} ensayos:\n\n${texto}\n\n${reemplaza.length} valor(es) que escribiste a mano se reemplazarán (podrás deshacerlo).`)) return;
  conDeshacer(`Simulador actualizado con tus ${modo === 'mejor' ? 'mejores' : 'últimos'} ensayos (${cambios.length} prueba(s))`, () => {
    cambios.forEach(c => { p.admision.puntajes[c.k] = c.nuevo; });
  });
}

/* ---------- Sección PAES (v8) ---------- */

let paesAbierta = null;   // id de la prueba desplegada en el temario (se conserva entre renders)

/** (v13) Sección PAES: “Mis ensayos” (registro y conversión de puntajes) e “Información y temarios”. */
function renderPaes() {
  const cont = $('#vista-paes');
  const sub = ['info', 'escalas'].includes(store.paesSub) ? store.paesSub : 'ensayos';
  cont.innerHTML = `
    <div class="subtabs segmentado" aria-label="Secciones de PAES">
      <button class="seg ${sub === 'ensayos' ? 'activa' : ''}" data-action="paes-sub" data-sub="ensayos">Mis ensayos</button>
      <button class="seg ${sub === 'escalas' ? 'activa' : ''}" data-action="paes-sub" data-sub="escalas">Escalas</button>
      <button class="seg ${sub === 'info' ? 'activa' : ''}" data-action="paes-sub" data-sub="info">Información y temarios</button>
    </div>
    <div id="paes-cuerpo" class="vista-paes-cuerpo">${sub === 'ensayos' ? htmlEnsayos() : sub === 'escalas' ? htmlEscalas() : htmlPaesInfo()}</div>`;
}

/** Información general, pruebas y temarios (contenido v8). */
function htmlPaesInfo() {
  const P = REF.PAES;
  const tarjetas = P.pruebas.map(pr => `
    <article class="paes-prueba">
      <header><h3>${esc(pr.nombre)}</h3><span class="chip ${pr.caracter.startsWith('Obligatoria') ? 'ok' : 'info'}">${esc(pr.caracter)}</span></header>
      <dl class="paes-datos">
        <div><dt>Formato</dt><dd>${esc(pr.preguntas)}</dd></div>
        <div><dt>Duración</dt><dd>${esc(pr.duracion)}</dd></div>
        <div><dt>Contenidos de</dt><dd>${esc(pr.niveles)}</dd></div>
        <div><dt>Habilidades</dt><dd>${esc(pr.habilidades)}</dd></div>
      </dl>
    </article>`).join('');
  const temarios = P.pruebas.map(pr => `
    <details class="paes-temario" data-paes="${pr.id}" ${paesAbierta === pr.id ? 'open' : ''}>
      <summary><strong>${esc(pr.nombre)}</strong><small>${pr.ejes.length} ejes · ${pr.ejes.reduce((s, e) => s + e.temas.length, 0)} temas</small></summary>
      ${pr.nota ? `<p class="nota-aviso">${esc(pr.nota)}</p>` : ''}
      <div class="paes-ejes">${pr.ejes.map(e => `
        <section class="paes-eje"><h4>${esc(e.nombre)}</h4><ul>${e.temas.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>`).join('')}
      </div>
    </details>`).join('');
  return `
    <div class="panel paes-intro">
      <div class="seccion-cab"><h2>PAES · ${esc(P.proceso)}</h2><span class="chip">Información de referencia</span></div>
      <p class="paes-lead">${esc(P.queEs)}</p>
      <h3>¿Cómo funciona?</h3>
      <ul class="paes-lista">${P.dinamica.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
      <h3>Calendario</h3>
      <ul class="paes-lista">${P.calendario.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    </div>
    <h2 class="paes-subtitulo">Las pruebas</h2>
    <div class="paes-grid">${tarjetas}</div>
    <div class="panel">
      <div class="seccion-cab"><h2>Temarios por prueba y eje</h2>
        <button class="btn ghost sm" data-action="vista" data-vista="admision" title="Simular tu puntaje ponderado con tus puntajes PAES">Simular mi postulación</button></div>
      <p class="nota-aviso">Resumen. El detalle está en el PDF de DEMRE.</p>
      ${temarios}
    </div>
    <div class="panel paes-fuente">
      <p><strong>DEMRE actualiza temarios y fechas cada año:</strong> confírmalos antes de inscribirte.</p>
      <p class="nota-aviso">Fuente: ${esc(P.fuente)}</p>
      <div class="fila-botones inicio">
        <a class="btn sm" href="${urlSegura(P.urlTemarios)}" target="_blank" rel="noopener noreferrer">Temarios oficiales (DEMRE) ↗</a>
        <a class="btn ghost sm" href="${urlSegura(P.urlFechas)}" target="_blank" rel="noopener noreferrer">Fechas y horarios ↗</a>
        <a class="btn ghost sm" href="${urlSegura(P.urlM2)}" target="_blank" rel="noopener noreferrer">Carreras que exigen M2 ↗</a>
        <a class="btn ghost sm" href="${urlSegura(P.urlFaq)}" target="_blank" rel="noopener noreferrer">Preguntas frecuentes ↗</a>
      </div>
    </div>`;
}

/* ---------- Reordenar y renombrar períodos (v8) ---------- */

/** Mueve un período delta posiciones (−1 izquierda, +1 derecha). */
function moverPeriodo(id, delta) {
  const p = perfil();
  const i = p.periodos.findIndex(x => x.id === id);
  const j = Calc.limitar(i + delta, 0, p.periodos.length - 1);
  if (i < 0 || i === j) return;
  reordenarPeriodo(id, j);
}

/** Lleva el período a la posición "destino" (índice final), lo guarda y anima el cambio (FLIP). */
function reordenarPeriodo(id, destino) {
  const p = perfil();
  const i = p.periodos.findIndex(x => x.id === id);
  if (i < 0 || i === destino) return;
  const antes = posicionesPeriodos();
  const [per] = p.periodos.splice(i, 1);
  p.periodos.splice(destino, 0, per);
  actualizar();
  animarFLIP(antes);
  $(`#periodos [data-periodo="${CSS.escape(id)}"]`)?.focus();
  toast(`“${per.nombre}” ahora es el período ${destino + 1} de ${p.periodos.length}`);
}

const posicionesPeriodos = () => new Map([...document.querySelectorAll('#periodos [data-periodo]')].map(b => [b.dataset.periodo, b.getBoundingClientRect().left]));

/** Anima cada botón desde su posición anterior a la nueva (se omite con movimiento reducido). */
function animarFLIP(antes) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('#periodos [data-periodo]').forEach(b => {
    const x0 = antes.get(b.dataset.periodo);
    if (x0 === undefined) return;
    const dx = x0 - b.getBoundingClientRect().left;
    if (Math.abs(dx) < 1) return;
    b.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 200, easing: 'cubic-bezier(.2,.7,.3,1)' });
  });
}

let menuPeriodo = { id: null, modo: 'acciones', abiertoEn: 0, ancla: null, punto: null };

/** Menú contextual de un período: renombrar, mover a la izquierda/derecha, eliminar. */
function abrirMenuPeriodo(id, ancla, modo = 'acciones', punto = null) {
  const p = perfil();
  const per = p.periodos.find(x => x.id === id);
  if (!per) return;
  const i = p.periodos.indexOf(per);
  const previo = menuPeriodo;
  menuPeriodo = { id, modo, abiertoEn: Date.now(), ancla: ancla || previo.ancla, punto: punto || (ancla ? null : previo.punto) };
  const m = $('#menu-contextual');
  m.innerHTML = modo === 'renombrar'
    ? `<form class="menu-renombrar" data-menu-form>
        <label>Nombre del período <input id="menu-nombre-periodo" value="${esc(per.nombre)}" maxlength="40" required></label>
        <div class="fila-botones"><button type="button" class="btn ghost sm" data-action="menu-cerrar">Cancelar</button><button type="submit" class="btn primario sm">Guardar</button></div>
      </form>`
    : `<div class="menu-titulo">${esc(per.nombre)}</div>
      <button role="menuitem" data-action="menu-renombrar">✎ Renombrar…</button>
      <button role="menuitem" data-action="menu-mover" data-delta="-1" ${i === 0 ? 'disabled' : ''}>← Mover a la izquierda</button>
      <button role="menuitem" data-action="menu-mover" data-delta="1" ${i === p.periodos.length - 1 ? 'disabled' : ''}>→ Mover a la derecha</button>
      <hr>
      <button role="menuitem" class="peligro" data-action="menu-eliminar">Eliminar período…</button>
      <p class="menu-pista">También puedes arrastrarlo para reordenar.</p>`;
  m.setAttribute('role', modo === 'renombrar' ? 'dialog' : 'menu');
  m.setAttribute('aria-label', `Opciones de ${per.nombre}`);
  m.hidden = false;
  // Posición: junto al puntero (clic derecho) o bajo el botón; siempre dentro de la ventana
  const anclaViva = menuPeriodo.ancla?.isConnected ? menuPeriodo.ancla : $(`#periodos [data-periodo="${CSS.escape(id)}"]`);
  const r = anclaViva?.getBoundingClientRect();
  const ref = menuPeriodo.punto || (r ? { x: r.left, y: r.bottom + 4 } : { x: 16, y: 16 });
  m.style.left = `${Calc.limitar(ref.x, 8, Math.max(8, innerWidth - m.offsetWidth - 8))}px`;
  m.style.top = `${Calc.limitar(ref.y, 8, Math.max(8, innerHeight - m.offsetHeight - 8))}px`;
  m.classList.remove('entra'); void m.offsetWidth; m.classList.add('entra');
  if (modo === 'renombrar') { const inp = $('#menu-nombre-periodo'); inp.focus(); inp.select(); }
  else m.querySelector('button:not([disabled])')?.focus();
}

function cerrarMenuPeriodo(devolverFoco = true) {
  const m = $('#menu-contextual');
  if (!m || m.hidden) return;
  m.hidden = true;
  const id = menuPeriodo.id;
  menuPeriodo = { id: null, modo: 'acciones', abiertoEn: 0, ancla: null, punto: null };
  if (devolverFoco && id) $(`#periodos [data-periodo="${CSS.escape(id)}"]`)?.focus();
}

function guardarNombrePeriodo() {
  const per = perfil().periodos.find(x => x.id === menuPeriodo.id);
  const nombre = $('#menu-nombre-periodo')?.value.trim();
  if (!per || !nombre) return;
  const anterior = per.nombre;
  per.nombre = nombre.slice(0, 40);
  cerrarMenuPeriodo(false);
  actualizar();
  $(`#periodos [data-periodo="${CSS.escape(per.id)}"]`)?.focus();
  if (anterior !== per.nombre) toast(`Período renombrado: “${per.nombre}”`);
}

/* ---------- Barra de períodos ---------- */

function renderPeriodos() {
  const p = perfil();
  const botones = p.periodos.map(x =>
    `<button class="seg seg-periodo ${p.periodoActivo === x.id ? 'activa' : ''}" data-action="periodo" data-id="${x.id}" data-periodo="${x.id}" draggable="true"
      title="Arrastra para reordenar · clic derecho (o mantén presionado) para renombrar · Alt+← / Alt+→ para mover" aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Shift+F10">${esc(x.nombre)}</button>`).join('');
  // v14: la carga desde el currículum / malla vive junto al formulario de "Agregar materias"
  const accionContexto = '';
  $('#agregar-curriculo').innerHTML = p.modalidad === 'uni'
    ? `<button class="btn sm btn-curriculo" data-action="abrir-malla">＋ Añadir ramos desde la malla${p.uni.malla ? '' : ' (buscar)'}</button>
       <small>Varios ramos de una vez. Arriba, uno a mano.</small>`
    : `<button class="btn sm btn-curriculo" data-action="abrir-curriculo">＋ Añadir materias desde el currículum</button>
       <small>Varias de una vez. Arriba, una a mano.</small>`;
  $('#periodos').innerHTML = `
    <div class="segmentado" aria-label="Períodos">
      <button class="seg ${esConsolidado() ? 'activa' : ''}" data-action="periodo" data-id="todos" title="Ver todos los períodos juntos (promedio general acumulado)">Consolidado</button>
      ${botones}
      <button class="seg mas" data-action="agregar-periodo" title="Agregar un período nuevo (ej. Semestre 3)" aria-label="Agregar período">+</button>
    </div>
    <div class="periodos-acciones">
      ${esConsolidado() ? '' : `
        <button class="btn ghost sm" data-action="menu-periodo" data-id="${esc(p.periodoActivo)}" aria-haspopup="menu" title="Renombrar, mover o eliminar este período (también con clic derecho sobre él)"><svg class="ico-periodo" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2ZM5 9v10h14V9H5Zm2 2h4v4H7v-4Z"/></svg> Período ▾</button>`}
      ${accionContexto}
      <button class="btn ghost sm btn-importar" data-action="abrir-foto" title="Leer notas desde una foto, un PDF o texto pegado. Siempre revisas antes de guardar"><span aria-hidden="true">⇪</span> Importar notas</button>
    </div>`;
  const sel = $('#form-asignatura [name=periodo]');
  sel.innerHTML = opts(p.periodos.map(x => [x.id, x.nombre]), p.periodos.at(-1).id);
  sel.hidden = !esConsolidado();
  const meta = $('#form-asignatura [name=meta]');
  meta.min = escala().min; meta.max = escala().max; meta.step = paso();
}

/* ---------- (v26) Palanca de impacto: dónde rinde más el mismo esfuerzo ---------- */

/** Unidad fija de mejora: +0,3 en escalas 1–7 (o similares); +5 en escalas amplias (ej. 0–100). */
const pasoMejora = () => (escala().max - escala().min > 20 ? 5 : 0.3);
/** Decimales para mostrar cambios pequeños del promedio. */
const decDelta = () => (dec() === 1 ? 1 : 2);

/**
 * Cuánto cambia el puntaje NEM si el promedio del año en curso sube `deltaAnual`.
 * Solo perfiles escolares de 1°–4° Medio cuyo promedio del año se calcula con sus notas (si lo
 * escribiste a mano, tus notas no lo mueven). NEM = media de los años disponibles → sube deltaAnual / n.
 * Devuelve { deltaProm, deltaPts } o null.
 */
function efectoNEM(deltaAnual) {
  const p = perfil();
  if (!esEscolar(p) || !REF.AÑOS_MEDIA.includes(p.nivel) || !(deltaAnual > 0) || !Number.isFinite(deltaAnual)) return null;
  const anuales = promediosAnualesEfectivos();
  const delAño = anuales.find(x => x.año === p.nivel);
  if (!delAño || delAño.valor === null || delAño.origen === 'manual') return null;
  const vals = anuales.filter(x => typeof x.valor === 'number');
  if (!vals.length) return null;
  const prom = vals.reduce((s, x) => s + x.valor, 0) / vals.length;
  const deltaProm = deltaAnual / vals.length;
  const tabla = tablaNEM(grupoNEM()).tabla;
  const antes = Calc.puntajeNEM(prom, tabla);
  const despues = Calc.puntajeNEM(Math.min(7, prom + deltaProm), tabla);
  if (antes === null || despues === null) return null;
  return { deltaProm, deltaPts: despues - antes, años: vals.length };
}

/** Tarjeta "Mayor impacto" del resumen: el ramo donde subir la misma nota mueve más tu promedio. */
function htmlPalancaNotas(visibles, todos) {
  const p = perfil();
  const paso = pasoMejora();
  const lista = Calc.palancaNotas(visibles, p.escala, { paso });
  if (!lista.length) {
    const motivo = !visibles.length ? 'Agrega asignaturas y evaluaciones para ver dónde rinde más tu esfuerzo.'
      : 'No queda margen en lo pendiente: tus asignaturas están cerradas, sin evaluaciones pendientes con ponderación o ya en la nota máxima.';
    return `<div class="stat-titulo">—</div><div class="stat-sub">${motivo}</div>`;
  }
  const d = decDelta();
  const top = lista[0];
  const ambito = esConsolidado() ? 'tu promedio consolidado' : `tu promedio de ${nombrePeriodo(p.periodoActivo)}`;
  const subida = top.limitada ? `llegas a la nota máxima (${fmtSigno(top.subida, 1)})` : `subes ${fmtSigno(paso, 1)} sobre tu ritmo actual`;
  const foco = top.evalTop && top.evalTop.pesoPct < 99.5
    ? ` Lo que más pesa: <strong>${esc(top.evalTop.nombre)}</strong> (${Calc.redondear(top.evalTop.pesoPct, 0)}% del ramo).` : '';
  // NEM: el año escolar completo (todas las asignaturas del perfil), no solo el período visible
  const enAño = Calc.palancaNotas(todos, p.escala, { paso }).find(x => x.id === top.id);
  const nem = enAño ? efectoNEM(enAño.deltaGeneral) : null;
  const textoNem = nem && nem.deltaPts >= 1 ? ` ≈ <strong>+${Calc.redondear(nem.deltaPts, 0)} pts NEM</strong>.` : '';
  const siguen = lista.slice(1, 3).map(x => `${esc(x.nombre)} (${fmtSigno(x.deltaGeneral, d)})`).join(' · ');
  return `
    <button type="button" class="stat-titulo palanca-ramo" data-action="seleccionar" data-id="${esc(top.id)}" title="Abrir ${esc(top.nombre)}">${esc(top.nombre)}</button>
    <div class="stat-sub">Si en lo que queda ${subida}, sumas <strong class="palanca-delta">${fmtSigno(top.deltaGeneral, d)}</strong> a ${esc(ambito)} (${fmtSigno(top.deltaAsignatura, d)} en el ramo).${textoNem}${foco}</div>
    ${siguen ? `<div class="stat-sub palanca-siguen">Le siguen: ${siguen}</div>` : ''}`;
}

/**
 * Bloque "Dónde rinde más tu esfuerzo" en Admisión: el mismo esfuerzo (+30 puntos en una prueba PAES,
 * o +0,3 en tu promedio del año para el NEM) comparado en puntos ponderados para la carrera elegida.
 */
const PASO_PAES = 30;
function htmlPalancaAdmision(sel, ef) {
  const extra = [];
  const ing = perfil().admision.puntajes || {};
  const nem = efectoNEM(pasoMejora());
  if (nem && nem.deltaPts > 0 && typeof ef.nem === 'number') {
    // Ranking vacío = igual al NEM (como en el simulador): sube junto con él
    const mod = { ...ef, nem: Math.min(1000, ef.nem + nem.deltaPts) };
    if (typeof ing.ranking !== 'number' && typeof ef.ranking === 'number') mod.ranking = Math.min(1000, ef.ranking + nem.deltaPts);
    const delta = Calc.puntajePonderado(mod, sel.ponderaciones).parcial - Calc.puntajePonderado(ef, sel.ponderaciones).parcial;
    extra.push({ k: 'nem', delta, sube: nem.deltaPts, detalle: `${fmtSigno(pasoMejora(), 1)} en tu promedio de este año (≈ +${Calc.redondear(nem.deltaPts, 0)} pts NEM${typeof ing.ranking !== 'number' ? ' y Ranking' : ''}${nem.años < 4 ? `; con ${nem.años} año${nem.años === 1 ? '' : 's'} de Media cargado${nem.años === 1 ? '' : 's'}, por eso pesa tanto` : ''})` });
  }
  const r = Calc.palancaAdmision(ef, sel.ponderaciones, { paso: PASO_PAES, extra });
  if (r.motivo === 'sin-ponderaciones') return '<p class="aviso">Esta carrera no tiene ponderaciones definidas: edítala en el catálogo para ver qué prueba suma más.</p>';
  if (!r.items.length) {
    return r.motivo === 'sin-puntajes'
      ? '<p class="nota-aviso">Ingresa tus puntajes (o regístralos en Ensayos) para ver qué prueba suma más a tu ponderado.</p>'
      : '<p class="nota-aviso">Tus pruebas ponderadas ya están en el puntaje máximo: no queda margen por mejorar aquí.</p>';
  }
  const etiqueta = x => (x.k === 'nem' ? 'NEM' : etiquetaComponente(x.k));
  const detalle = x => x.detalle || (x.limitado ? `+${Calc.redondear(x.sube, 0)} pts (hasta 1000)` : `+${PASO_PAES} pts en la prueba`);
  const top = r.items[0];
  return `
    <div class="palanca palanca-adm">
      <div class="palanca-cab"><span class="palanca-icono" aria-hidden="true">⚡</span><strong>Dónde rinde más tu esfuerzo</strong></div>
      <p><strong>${esc(etiqueta(top))}</strong>: ${esc(detalle(top))} suma <strong class="palanca-delta">+${fmtPts(top.delta)}</strong> a tu ponderado.</p>
      ${r.items.length > 1 ? `<p class="palanca-siguen">Le siguen:</p><ol class="palanca-lista">${r.items.slice(1).map(x => `
        <li><span>${esc(etiqueta(x))} <small>${esc(detalle(x))}</small></span><span class="num">+${fmtPts(x.delta)}</span></li>`).join('')}</ol>` : ''}
      ${r.sinDato.length ? `<p class="nota-aviso">Sin puntaje para comparar: ${r.sinDato.map(k => esc(etiquetaComponente(k))).join(', ')}. Ingrésalo arriba para incluirla.</p>` : ''}
      <p class="nota-aviso">Mismo esfuerzo para todas: +${PASO_PAES} puntos por prueba${extra.length ? ` o ${fmtSigno(pasoMejora(), 1)} en tu promedio del año` : ''}, con las ponderaciones de esta carrera. Es una estimación.</p>
    </div>`;
}

/* ---------- Resumen superior (franja compacta) ---------- */

function renderResumen(visibles, todos, prioridades) {
  const p = perfil();
  const E = escala();
  const promVista = Calc.promedioGeneral(visibles);
  const acumulado = Calc.promedioAcumulado(todos);
  const metaG = p.metaGeneral.global;
  const color = v => (v === null ? '' : v >= E.aprobacion ? 'ok' : 'bad');

  const top = prioridades[0];
  let htmlPrioridad;
  if (top) {
    const motivo = top.estado === 'inalcanzable'
      ? `Aún puedes cerrar con ${fmt(top.finalMaximo)}, ${calificativo(top.finalMaximo)}. Ajusta su meta y enfócate aquí.`
      : top.necesaria < escala().aprobacion ? `Te basta con aprobar lo que queda (meta ${top.asig.meta}).` : `Necesitas ${fmtNec(top.necesaria)} en el ${fmtPct(top.pesos.pendiente)} que queda (meta ${top.asig.meta}).`;
    htmlPrioridad = `<div class="stat-titulo">${esc(top.asig.nombre)}</div><div class="stat-sub">${motivo}</div>`;
  } else {
    htmlPrioridad = '<div class="stat-titulo">—</div><div class="stat-sub">Sin asignaturas en riesgo por ahora.</div>';
  }

  let subAcum = `${todos.filter(a => a.actual !== null).length} asignatura(s) · ${p.periodos.length} período(s)`;
  if (metaG !== null && acumulado !== null) {
    subAcum = acumulado + Calc.EPS >= metaG ? `Sobre tu meta general (${metaG})` : `A ${fmt(metaG - acumulado)} de tu meta general (${metaG})`;
  }

  $('#resumen').innerHTML = `
    <div class="stat">
      <div class="stat-etiqueta">${esConsolidado() ? 'Promedio consolidado' : `Promedio · ${esc(nombrePeriodo(p.periodoActivo))}`}</div>
      <div class="stat-valor num ${color(promVista)}">${fmt(promVista)}</div>
      <div class="stat-sub">${visibles.filter(a => a.actual !== null).length} asignatura(s) con notas${(() => { const c = visibles.filter(a => a.cerradaManual).length; return c ? ` · ${c} cerrada(s) 🔒` : ''; })()}</div>
    </div>
    <div class="stat">
      <div class="stat-etiqueta">General acumulado</div>
      <div class="stat-valor num ${color(acumulado)}">${fmt(acumulado)}</div>
      <div class="stat-sub">${subAcum}</div>
    </div>
    <div class="stat stat-prioridad">
      <div class="stat-etiqueta">Prioridad de estudio</div>
      ${htmlPrioridad}
    </div>
    <div class="stat stat-palanca">
      <div class="stat-etiqueta" title="Dónde el mismo esfuerzo (${fmtSigno(pasoMejora(), 1)} en lo pendiente) sube más tu promedio"><span aria-hidden="true">⚡</span> Mayor impacto</div>
      ${htmlPalancaNotas(visibles, todos)}
    </div>
    <div class="stat stat-mensaje">
      <div class="stat-etiqueta">Tu progreso</div>
      ${htmlProgreso(visibles, top)}
    </div>`;
}

/* ---------- Tu progreso (v8: compacto con muchas asignaturas) ---------- */

let progresoAbierto = false;
/** Grupos de estado para resumir: orden = de mejor a lo que pide atención. */
const GRUPOS_PROGRESO = [
  { id: 'ok', icono: '✓', etiqueta: 'Meta asegurada o lograda', estados: ['asegurada', 'lograda'], clase: 'ok' },
  { id: 'encaminado', icono: '↗', etiqueta: 'Bien encaminadas', estados: ['encaminado'], clase: 'ok' },
  { id: 'subir', icono: '⚠', etiqueta: 'Subir el ritmo', estados: ['subir-ritmo'], clase: 'warn' },
  { id: 'ajustar', icono: '◎', etiqueta: 'Meta por ajustar', estados: ['inalcanzable', 'no-lograda'], clase: 'info' },
  { id: 'pesos', icono: '%', etiqueta: 'Falta ponderación', estados: ['sin-pesos'], clase: 'warn' },
  { id: 'sin-meta', icono: '◌', etiqueta: 'Sin meta definida', estados: ['sin-meta'], clase: 'info' },
  { id: 'sin', icono: '·', etiqueta: 'Sin notas', estados: ['sin-datos'], clase: '' },
];

/** "Semestre 2" → "S2", "Trimestre 1" → "T1", otro nombre → sus primeras 6 letras. */
const abreviarPeriodo = nombre => {
  const m = String(nombre).match(/^\s*(\p{L})\p{L}*\s*(\d+)\s*$/u);
  return m ? `${m[1].toUpperCase()}${m[2]}` : String(nombre).slice(0, 6);
};

/**
 * (v9) Avance por período (en el orden en que el estudiante los dejó): asignaturas, cuántas con meta
 * asegurada o lograda, % del peso rendido y promedio. Solo períodos con asignaturas visibles.
 */
function desglosePeriodos(analisis) {
  return perfil().periodos.map(per => {
    const lista = analisis.filter(a => a.asig.periodoId === per.id);
    if (!lista.length) return null;
    const total = lista.reduce((s, a) => s + a.pesos.total, 0);
    return {
      per, n: lista.length,
      aseguradas: lista.filter(a => a.estado === 'asegurada' || a.estado === 'lograda').length,
      pct: total > 0 ? Math.round((lista.reduce((s, a) => s + a.pesos.calificado, 0) / total) * 100) : null,
      promedio: Calc.promedioGeneral(lista),
    };
  }).filter(Boolean);
}

function htmlProgreso(visibles, top) {
  if (!visibles.length) return `<p>${mensajeProgreso(visibles, top)}</p>`;
  const desglose = desglosePeriodos(visibles);
  if (desglose.length > 1) {
    // Varios períodos: una fila por período en vez de una barra que mezcla semestres
    return `
      <ul class="progreso-periodos">${desglose.map(d => `
        <li>
          <span class="pp-nombre">${esc(d.per.nombre)}</span>
          <span class="progreso-barra" role="img" aria-label="${esc(d.per.nombre)}: ${d.pct ?? 0}% rendido"><span style="width:${d.pct ?? 0}%"></span></span>
          <span class="pp-dato">${d.pct === null ? 'sin %' : `${d.pct}% rendido`} · ${d.aseguradas}/${d.n} metas · prom. ${fmt(d.promedio, 1)}</span>
        </li>`).join('')}
      </ul>
      ${htmlProgresoCuerpo(visibles, top)}`;
  }
  const pesoTotal = visibles.reduce((s, a) => s + a.pesos.total, 0);
  const pct = pesoTotal > 0 ? Math.round((visibles.reduce((s, a) => s + a.pesos.calificado, 0) / pesoTotal) * 100) : null;
  return `
    ${pct !== null ? `<div class="progreso-fila"><div class="progreso-barra" role="img" aria-label="Has rendido el ${pct}% del peso total"><span style="width:${pct}%"></span></div><span class="progreso-pct num">${pct}% rendido</span></div>` : ''}
    ${htmlProgresoCuerpo(visibles, top)}`;
}

function htmlProgresoCuerpo(visibles, top) {
  const grupos = GRUPOS_PROGRESO.map(g => ({ ...g, items: visibles.filter(a => g.estados.includes(a.estado)) })).filter(g => g.items.length);
  const muchas = visibles.length > 4;
  const etiquetaAsig = a => `${esc(a.asig.nombre)}${esConsolidado() ? ` <small>${esc(abreviarPeriodo(nombrePeriodo(a.asig.periodoId)))}</small>` : ''}`;
  return `
    ${(() => { const puntos = mensajeProgreso(visibles, top, true); return puntos.length ? `<ul class="progreso-puntos">${puntos.map(t => `<li>${t}</li>`).join('')}</ul>` : ''; })()}
    ${muchas ? `
      <div class="progreso-chips">${grupos.map(g => `<span class="chip ${g.clase}" title="${esc(g.items.map(a => a.asig.nombre).join(', '))}">${g.icono} ${g.items.length} ${esc(g.etiqueta.toLowerCase())}</span>`).join('')}</div>
      <details id="progreso-detalle" class="progreso-detalle" ${progresoAbierto ? 'open' : ''}>
        <summary>Ver por asignatura (${visibles.length})</summary>
        ${grupos.map(g => `
          <div class="progreso-grupo"><div class="progreso-grupo-titulo">${g.icono} ${esc(g.etiqueta)} · ${g.items.length}</div>
            <ul>${g.items.map(a => `<li><button class="enlace" data-action="seleccionar" data-id="${a.asig.id}">${etiquetaAsig(a)}</button><span class="num">${fmt(a.actual, 1)}</span></li>`).join('')}</ul>
          </div>`).join('')}
      </details>` : ''}
    <p class="progreso-tono">${esc(tono().progreso)}</p>
    ${lineaMotivacion()}`;
}

/**
 * (v8) Motivación vocacional medida: aparece 1 de cada 3 días (determinista) para no saturar.
 * Escolar: carrera preferida. Universitario: su formación y su futuro ejercicio profesional.
 */
function lineaMotivacion() {
  if (Calc.indiceDiario(hoy(), 3, 11) !== 0) return '';
  const p = perfil();
  if (p.modalidad === 'uni') {
    const frase = alAzarDiario(REF.FEEDBACK_NOTA.profesion).replace(/\{carrera\}/g, p.uni.carrera || 'tu carrera');
    return `<span class="carrera-linea">🎓 ${esc(frase)}</span>`;
  }
  const carrera = carreraPreferida();
  return carrera ? `<span class="carrera-linea">🎯 ${esc(alAzarDiario(REF.FEEDBACK_NOTA.carrera).replace(/\{carrera\}/g, carrera))}</span>` : '';
}

/** Mensaje de progreso construido SOLO con datos reales (máx. 3 frases), tono constructivo. */
function mensajeProgreso(analisis, top, comoLista = false) {
  if (!analisis.length) return comoLista ? ['Agrega asignaturas para ver tu progreso.'] : 'Agrega asignaturas a este período (o cárgalas desde el currículum o una foto) para ver tu progreso.';
  const E = escala();
  const frases = [];
  const desglose = desglosePeriodos(analisis);
  const varios = desglose.length > 1;   // consolidado con más de un período con asignaturas
  const pesoTotal = analisis.reduce((s, a) => s + a.pesos.total, 0);
  const pesoRendido = analisis.reduce((s, a) => s + a.pesos.calificado, 0);
  // Con varios períodos el % rendido se muestra por período (barras), no como un total que mezcla semestres
  // En modo lista el % ya va junto a la barra
  if (pesoTotal > 0 && !varios && !comoLista) frases.push(`Has rendido el ${Math.round((pesoRendido / pesoTotal) * 100)}% del peso total de tus evaluaciones${esConsolidado() ? '' : ` de ${esc(nombrePeriodo(perfil().periodoActivo))}`}.`);

  const aseguradas = analisis.filter(a => a.estado === 'asegurada' || a.estado === 'lograda');
  const encaminadas = analisis.filter(a => a.estado === 'encaminado');
  if (varios && aseguradas.length) {
    // v9: desglose exacto por período en vez de "X de Y" que mezcla semestres
    const partes = desglose.map(d => `<strong>${d.aseguradas} de ${d.n}</strong> en ${esc(d.per.nombre)}`);
    frases.push(`Meta asegurada o lograda: ${partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0]}.`);
  } else if (aseguradas.length > 3) {
    // Un solo período: se dice cuál, con la cuenta exacta
    const ambito = esConsolidado() ? (desglose[0] ? ` de ${esc(desglose[0].per.nombre)}` : '') : ` de ${esc(nombrePeriodo(perfil().periodoActivo))}`;
    frases.push(aseguradas.length === analisis.length
      ? `Tienes la meta asegurada o lograda en <strong>todas</strong> las asignaturas${ambito} (${analisis.length}).`
      : `Tienes la meta asegurada o lograda en <strong>${aseguradas.length} de ${analisis.length}</strong> asignaturas${ambito}.`);
  } else if (aseguradas.length) {
    frases.push(`En ${nombres(aseguradas)} ya tienes la meta asegurada.`);
  } else if (encaminadas.length) {
    const mejor = encaminadas.reduce((m, a) => (a.actual - a.necesaria > m.actual - m.necesaria ? a : m));
    frases.push(mejor.necesaria < E.aprobacion ? `En ${esc(mejor.asig.nombre)} te basta con aprobar lo que queda (promedias ${fmt(mejor.actual)}).` : `En ${esc(mejor.asig.nombre)} te basta un ${fmtNec(mejor.necesaria)} y hoy promedias ${fmt(mejor.actual)}: mantén ese ritmo.`);
  }
  const inalcanzables = analisis.filter(a => a.estado === 'inalcanzable');
  if (inalcanzables.length) {
    const a = inalcanzables[0];
    const aprueba = a.finalMinimo !== null && a.finalMinimo >= E.aprobacion ? ' y la aprobación ya está asegurada' : '';
    frases.push(`En ${esc(a.asig.nombre)} aún puedes llegar a un ${fmt(a.finalMaximo)}, ${calificativo(a.finalMaximo)}${aprueba}: ajusta la meta y sigue.`);
  } else if (top && top.estado === 'subir-ritmo') {
    frases.push(`Enfócate en ${esc(top.asig.nombre)}: necesitas subir de ${fmt(top.actual)} a ${fmtNec(top.necesaria)} en lo que falta.`);
  }
  const sinPesos = analisis.filter(a => a.estado === 'sin-pesos');
  if (sinPesos.length && frases.length < 3) frases.push(sinPesos.length > 3 ? `Define la ponderación en ${sinPesos.length} asignaturas para calcular su camino.` : `Define la ponderación en ${nombres(sinPesos)} para calcular su camino.`);
  return comoLista ? frases.slice(0, 3) : frases.slice(0, 3).join(' ');
}

function nombres(lista) {
  const n = lista.map(a => `<strong>${esc(a.asig.nombre)}</strong>`);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0];
}

/* ---------- Meta de promedio general (cálculo cruzado) ---------- */

function metaGeneralVista() {
  const p = perfil();
  return esConsolidado() ? p.metaGeneral.global : (p.metaGeneral.periodos[p.periodoActivo] ?? null);
}

function analisisVisibles() {
  const p = perfil();
  return p.asignaturas.filter(a => esConsolidado() || a.periodoId === p.periodoActivo).map(a => Calc.analizarAsignatura(a, p.escala));
}

/**
 * (v14) Si el promedio de las metas por asignatura es MENOR que la meta promedio general,
 * aunque cumplas cada meta no llegarías a la general: se avisa con la diferencia.
 */
function infoMetas(visibles, G) {
  if (G === null || G === undefined) return null;
  const pm = Calc.promedioMetas(visibles.map(a => a.asig));
  if (!pm || pm.promedio >= G - Calc.EPS) return null;
  return { ...pm, diferencia: G - pm.promedio };
}
function htmlAvisoMetas(visibles, G) {
  const im = infoMetas(visibles, G);
  if (!im) return '';
  // v16: el aviso trae su propio botón para corregirlo en el mismo lugar
  return `<div class="aviso-metas" role="alert">
    <p>⚠ Tus metas promedian <strong class="num">${fmt(im.promedio)}</strong>, bajo tu meta general (${String(G).replace('.', ',')}).</p>
    <button type="button" class="btn primario sm" data-action="aplicar-metas-sugeridas" title="Cambia la meta de cada asignatura abierta por la sugerida (podrás deshacerlo)">Aplicar metas sugeridas</button>
  </div>`;
}

function renderMetaGeneral(visibles) {
  const E = escala();
  const G = metaGeneralVista();
  const ambito = esConsolidado() ? 'general acumulado' : `de ${esc(nombrePeriodo(perfil().periodoActivo))}`;
  const plan = G === null ? null : Calc.planMetaGeneral(visibles, G, E);
  const cont = $('#meta-general');

  let resumen, cuerpo = '';
  if (!visibles.length) {
    resumen = 'Agrega asignaturas para usar la meta general.';
  } else if (G === null) {
    resumen = 'Define una meta de promedio general y te sugiero metas equilibradas por asignatura.';
  } else {
    switch (plan.estado) {
      case 'alcanzable':
        resumen = plan.x < escala().aprobacion - Calc.EPS
          ? `¡Vas bien! Para un ${G} te basta con <strong>aprobar</strong> lo que queda en cada asignatura abierta.`
          : `Para un ${G} necesitas, en promedio, un <strong>${fmtNec(plan.x)}</strong> en lo que queda de cada asignatura abierta.`;
        break;
      case 'asegurada':
        resumen = `Tu meta de ${G} ya está asegurada aunque saques la nota mínima en todo lo pendiente.`;
        break;
      case 'inalcanzable':
        resumen = `Con lo que queda aún puedes llegar a un <strong>${fmt(plan.maxGeneral)}</strong>, ${calificativo(plan.maxGeneral)}.`;
        cuerpo += `<p class="aviso-constructivo">La meta de ${G} quedó fuera de alcance por lo ya rendido. Trabajar con un objetivo real te ayuda a priorizar.
          <button class="btn primario sm" data-action="ajustar-meta-general-max">Ajustar meta general a ${plan.metaMaximaGeneral.toFixed(1)}</button></p>`;
        break;
      case 'lograda':
        resumen = `¡Meta general cumplida! Todas las asignaturas están cerradas sobre ${G}.`;
        break;
      case 'no-lograda':
        resumen = `Todas las asignaturas están cerradas; el promedio quedó bajo ${G}. Úsalo de base para tu próxima meta.`;
        break;
    }
    cuerpo = htmlAvisoMetas(visibles, G) + cuerpo;
    cuerpo += htmlTablaAportes(visibles, G, plan);
  }
  if (visibles.length && G === null) cuerpo += htmlTablaAportes(visibles, null, null);

  cont.open = metaGeneralAbierta;
  cont.innerHTML = `
    <summary><span class="etiqueta-meta">Meta de promedio ${ambito}${G !== null ? ` · ${G}` : ''}</span><span class="resumen-meta">${resumen}${infoMetas(visibles, G) ? ' <span class="chip warn">⚠ Tus metas por asignatura no alcanzan esta meta</span>' : ''}</span></summary>
    <div class="meta-general-cuerpo">
      <label class="campo-linea">Meta general
        <input type="text" inputmode="decimal" data-meta-general data-key="meta-general" step="${paso()}" min="${E.min}" max="${E.max}" value="${fmtNota(G)}" placeholder="ej. 6,0">
      </label>
      ${cuerpo}
    </div>`;
}

/** Número con signo; si es prácticamente cero muestra "±0" (sin color) para no sugerir un aporte que no existe. */
function fmtSigno(x, d) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  const r = Calc.redondear(x, d);
  if (Math.abs(r) < 10 ** -d / 2) return `±${(0).toFixed(d)}`;
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(d)}`;
}
const claseSigno = (x, d) => (x === null || Math.abs(Calc.redondear(x, d)) < 10 ** -d / 2 ? 'neutro' : x > 0 ? 'ok' : 'bad');

/**
 * (v8) Tabla de aporte de cada asignatura al promedio general:
 *  - "Aporta": puntos del general que pone esa asignatura (la suma da el promedio general).
 *  - "Efecto": cuánto cambia el general por incluirla (general con ella − general sin ella).
 *  - Si hay meta general: meta actual y meta sugerida (reparto parejo del esfuerzo).
 * El efecto se muestra con un decimal más que las notas: con muchas asignaturas es pequeño, pero real.
 */
function htmlTablaAportes(visibles, G, plan) {
  const lista = Calc.aportesAlGeneral(visibles, G);
  if (!lista.length) return '';
  const aportes = Object.fromEntries(lista.map(x => [x.id, x]));
  const dEf = dec() + 1;
  const general = Calc.promedioGeneral(visibles);
  const conCreditos = visibles.some(a => Calc.pesoAsignatura(a.asig) !== 1);
  const filas = visibles.map(a => {
    const ap = aportes[a.asig.id];
    const s = plan?.sugerencias.find(x => x.id === a.asig.id);
    const sug = !s ? '' : s.abierta ? Calc.redondearArriba(s.metaSugerida, 1).toFixed(1)
      : a.estado === 'sin-pesos' ? '<small title="Asigna % a sus pendientes">falta %</small>' : '<small>cerrada</small>';
    return `<tr>
      <td>${esc(a.asig.nombre)}${esConsolidado() ? `<br><small>${esc(nombrePeriodo(a.asig.periodoId))}</small>` : ''}${conCreditos ? `<br><small>${Calc.pesoAsignatura(a.asig)} crédito(s)</small>` : ''}</td>
      <td class="num">${fmt(a.actual)}</td>
      <td class="num">${ap ? fmt(ap.parte) : '—'}</td>
      <td class="num ${ap ? claseSigno(ap.efecto, dEf) : ''}" title="${ap ? `Sin esta asignatura tu promedio sería ${fmt(general - ap.efecto)}` : 'Aún sin notas'}">${ap ? fmtSigno(ap.efecto, dEf) : '—'}</td>
      ${G !== null ? `<td class="num">${tieneMeta(a.asig) ? a.asig.meta : '<small>sin meta</small>'}</td><td class="num"><strong>${sug}</strong></td>` : ''}
    </tr>`;
  }).join('');
  const sens = lista[0].sensibilidad;
  return `
    <div class="tabla-scroll"><table class="tabla tabla-aportes">
      <thead><tr><th>Asignatura</th><th>Promedio</th>
        <th title="Puntos del promedio general que pone esta asignatura (la suma da ${fmt(general)})">Aporta al general</th>
        <th title="Promedio general con ella − promedio general sin ella">Efecto en el general</th>
        ${G !== null ? '<th>Meta actual</th><th>Meta sugerida</th>' : ''}</tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr><td>Promedio general</td><td></td><td class="num"><strong>${fmt(general)}</strong></td><td></td>${G !== null ? '<td></td><td></td>' : ''}</tr></tfoot>
    </table></div>
    <p class="nota-aviso"><strong>Aporta</strong>: lo que pone cada asignatura al promedio (suman ${fmt(general)}). <strong>Efecto</strong>: cuánto lo sube o baja.${G !== null ? ' Las metas sugeridas piden la misma nota en todo lo pendiente.' : ''}</p>
    ${plan && ['alcanzable', 'asegurada'].includes(plan.estado) && !infoMetas(visibles, G) ? '<button class="btn primario sm" data-action="aplicar-metas-sugeridas" title="Cambia la meta de cada asignatura abierta por la sugerida (podrás deshacerlo)">Aplicar metas sugeridas</button>' : ''}`;
}

/* ---------- Lista lateral ---------- */

function renderLista(visibles, idPrioritaria) {
  const cont = $('#lista');
  if (!visibles.length) {
    cont.innerHTML = `<p class="muted vacio-lista">${esConsolidado() ? 'Aún no tienes asignaturas.' : 'Este período no tiene asignaturas.'}</p>`;
    return;
  }
  const nuevaId = animar.asig;
  animar.asig = null;
  const item = a => {
    const e = estadoVisual(a);
    return `
      <button class="item-asig ${a.asig.id === perfil().seleccionada ? 'activa' : ''} ${a.asig.id === nuevaId ? 'aparece' : ''}" data-action="seleccionar" data-id="${a.asig.id}">
        <span class="nombre">${esc(a.asig.nombre)}</span>
        <span class="prom num">${fmt(a.actual)}</span>
        <span class="detalle-mini">
          ${a.asig.id === idPrioritaria ? '<span class="chip top">★ Prioridad</span>' : ''}
          <span class="chip ${e.chip}">${e.texto}</span>
          <span>${tieneMeta(a.asig) ? `meta ${a.asig.meta}` : a.estado === 'sin-meta' ? '' : '<em>sin meta</em>'}</span>
        </span>
      </button>`;
  };
  // Aviso de asignaturas repetidas (mismo nombre sin tildes/mayúsculas en un mismo período)
  const ids = new Set(visibles.map(a => a.asig.id));
  const dups = gruposDuplicados().filter(g => g.some(a => ids.has(a.id)));
  const aviso = dups.map(g => `
    <div class="aviso-duplicada" role="note">
      <span>“${esc(g[0].nombre)}” aparece ${g.length} veces en ${esc(nombrePeriodo(g[0].periodoId))}.</span>
      <button class="btn sm" data-action="unificar-duplicadas" data-ids="${g.map(a => a.id).join(',')}" title="Junta sus evaluaciones, checklist y décimas en la primera (podrás deshacerlo)">Unificar</button>
    </div>`).join('');
  if (!esConsolidado()) { cont.innerHTML = aviso + visibles.map(item).join(''); return; }
  cont.innerHTML = aviso + perfil().periodos.map(per => {
    const grupo = visibles.filter(a => a.asig.periodoId === per.id);
    if (!grupo.length) return '';
    return `<div class="grupo-periodo"><div class="grupo-titulo">${esc(per.nombre)} · ${fmt(Calc.promedioGeneral(grupo))}</div>${grupo.map(item).join('')}</div>`;
  }).join('');
}

/* ---------- Detalle de asignatura ---------- */

/**
 * (v15) "Empieza tu ruta": inicio guiado cuando el período (o el perfil) no tiene materias.
 * Es una secuencia real (materias → metas → notas), por eso va numerada; el paso 1 trae
 * las tres formas de agregar materias y los demás se explican sin distraer.
 */
function htmlEmpiezaTuRuta(p, visibles) {
  const uni = p.modalidad === 'uni';
  const sinNada = !p.asignaturas.length;
  const ambito = esConsolidado() ? 'tu perfil' : nombrePeriodo(p.periodoActivo);
  const principal = uni
    ? `<button class="btn primario btn-grande" data-action="abrir-malla">Añadir ramos desde la malla</button>`
    : `<button class="btn primario btn-grande" data-action="abrir-curriculo">Añadir materias desde el currículum</button>`;
  if (visibles.length) {
    return `<div class="panel vacio"><h2>Elige una asignatura</h2><p>Selecciónala en la lista para ver sus notas y su camino a la meta.</p></div>`;
  }
  return `
    <section class="inicio-ruta" aria-labelledby="inicio-titulo">
      <div class="inicio-cab">
        <p class="inicio-perfil">${esc(p.nombre)} · ${esc(contextoPerfil(p))}</p>
        <h2 id="inicio-titulo">Empieza tu ruta</h2>
        <p class="inicio-lead">${sinNada
          ? esc(tono(p).inicioLead)
          : `${esc(ambito)} aún no tiene materias.`}</p>
      </div>
      <ol class="inicio-pasos">
        <li class="paso activo">
          <span class="paso-num" aria-hidden="true">1</span>
          <div class="paso-cuerpo">
            <h3>Agrega tus materias</h3>
            <p>${esc(tono(p).paso1)}</p>
            <div class="paso-acciones">
              ${principal}
              <button class="btn" data-action="enfocar-nueva-materia">Escribir una materia</button>
              <button class="btn" data-action="abrir-foto">Importar notas (foto o PDF)</button>
            </div>
          </div>
        </li>
        <li class="paso">
          <span class="paso-num" aria-hidden="true">2</span>
          <div class="paso-cuerpo">
            <h3>Define tus metas <small>(opcional)</small></h3>
            <p>${esc(tono(p).paso2)}</p>
          </div>
        </li>
        <li class="paso">
          <span class="paso-num" aria-hidden="true">3</span>
          <div class="paso-cuerpo">
            <h3>Registra tus notas</h3>
            <p>${esc(tono(p).paso3)}</p>
          </div>
        </li>
      </ol>
      <ul class="inicio-tips" aria-label="Lo que también puedes hacer">
        <li><span aria-hidden="true">☰</span><div><strong>Navega</strong><p>${esc(tono(p).tips.nav)}</p></div></li>
        <li><span aria-hidden="true">💡</span><div><strong>Estudia mejor</strong><p>${esc(tono(p).tips.metodos)} <button class="enlace" data-action="vista" data-vista="estudio">Ver métodos</button></p></div></li>
        <li><span aria-hidden="true">✓</span><div><strong>Metas claras</strong><p>${esc(tono(p).tips.meta)}</p></div></li>
      </ul>
      <p class="inicio-pie">¿Solo quieres mirar? <button class="enlace" data-action="cargar-ejemplo">Ver un ejemplo</button> · <button class="enlace" data-action="abrir-guia">Guía paso a paso</button></p>
    </section>`;
}

function renderDetalle(visibles, idPrioritaria) {
  const cont = $('#detalle');
  const a = visibles.find(x => x.asig.id === perfil().seleccionada);
  const p = perfil();
  if (!a) { cont.innerHTML = htmlEmpiezaTuRuta(p, visibles); return; }
  const { asig } = a;
  const E = escala();
  cont.innerHTML = `
    <div class="panel detalle-cabecera">
      <div class="detalle-cab">
        <input class="input-titulo" data-asig-field="nombre" data-key="asig-nombre" value="${esc(asig.nombre)}" aria-label="Nombre de la asignatura" maxlength="80">
        ${asig.id === idPrioritaria ? '<span class="chip top">★ Prioritaria</span>' : ''}
        <span class="chip ${estadoVisual(a).chip}">${estadoVisual(a).texto}</span>
        <div class="cab-controles">
          <label class="campo-linea">Meta
            <input type="text" inputmode="decimal" data-asig-field="meta" data-key="asig-meta" step="${paso()}" min="${E.min}" max="${E.max}" value="${fmtNota(asig.meta)}" placeholder="Ej: 6,0" title="La nota que quieres lograr en esta asignatura. Déjala vacía si aún no la decides.">
          </label>
          ${p.modalidad === 'uni' ? `<label class="campo-linea" title="Créditos SCT o de tu universidad. Si los completas, el promedio general se pondera por créditos; vacío = todas pesan igual.">Créditos
            <input type="text" inputmode="numeric" class="input-corto" data-asig-field="creditos" data-key="asig-creditos" value="${asig.creditos ?? ''}" placeholder="—" maxlength="3">
          </label>` : ''}
          <label class="campo-linea">Período
            <select data-asig-field="periodoId" aria-label="Período de la asignatura">${opts(p.periodos.map(x => [x.id, x.nombre]), asig.periodoId)}</select>
          </label>
          <button class="btn sm ${asig.cerrada ? 'primario' : ''}" data-action="toggle-cierre" aria-pressed="${!!asig.cerrada}"
            title="${asig.cerrada ? 'Volver a calcular con las evaluaciones pendientes' : 'Dar por terminada la asignatura con lo ya rendido (sumen o no 100%)'}">${asig.cerrada ? '🔓 Reabrir asignatura' : '🔒 Cerrar asignatura'}</button>
          <button class="btn ghost peligro sm btn-eliminar-asig" data-action="eliminar-asignatura" title="Eliminar esta asignatura y sus notas (podrás deshacerlo unos segundos)"><span aria-hidden="true">🗑</span> Eliminar</button>
        </div>
      </div>
      ${htmlMetricas(a)}
    </div>
    <div class="detalle-cols">
      <div class="col">
        <div class="panel panel-evaluaciones" data-plegable="evaluaciones">${htmlEvaluaciones(a)}</div>
        <div class="panel" data-plegable="decimas">${htmlDecimas(a)}</div>
        <div class="panel" data-plegable="checklist">${htmlChecklist(asig)}</div>
      </div>
      <div class="col">
        <div class="panel" data-plegable="camino">${htmlCamino(a)}</div>
        <div class="panel guia" data-plegable="guia">${htmlGuia(a)}</div>
      </div>
    </div>`;
  actualizarSimResultado(a);
}

function htmlMetricas(a) {
  const E = escala();
  const meta = tieneMeta(a.asig) ? a.asig.meta : null;
  const claseActual = a.actual === null ? '' : meta !== null && a.actual >= meta ? 'ok' : a.actual >= E.aprobacion ? (meta === null ? 'ok' : 'warn') : 'bad';
  const claseNec = a.necesaria === null ? '' : a.necesaria > (a.actual ?? E.aprobacion) ? 'warn' : 'ok';
  const relleno = a.actual === null ? 0 : posEscala(a.actual);
  return `
    <div class="metricas">
      <div class="metrica"><div class="etiqueta" title="Solo notas reales registradas (sin décimas extra)">Promedio actual</div><div class="valor num ${claseActual}">${fmt(a.actual)}</div>${(() => { const d = Calc.impactoDecimas(a, E); return d && d.obtenidas && a.actual !== null ? `<div class="con-decimas" title="Promedio + décimas extra obtenidas">con décimas: <strong>${fmt(d.actualConObtenidas)}</strong></div>` : ''; })()}</div>
      <div class="metrica"><div class="etiqueta">Meta</div><div class="valor num">${meta === null ? '<small class="sin-meta-txt">Defínela arriba</small>' : fmt(meta)}</div></div>
      <div class="metrica"><div class="etiqueta">Necesitas en lo pendiente</div><div class="valor num ${claseNec} ${/^\d/.test(textoNecesaria(a.necesaria)) ? '' : 'valor-texto'}">${textoNecesaria(a.necesaria)}</div></div>
      <div class="metrica"><div class="etiqueta">Avance evaluado</div><div class="valor num">${Math.round(a.avance * 100)}%</div></div>
    </div>
    <div class="escala-barra" aria-hidden="true">
      <div class="escala-relleno" style="width:${relleno}%"></div>
      <div class="marcador" style="left:${posEscala(E.aprobacion)}%"><span>Aprueba ${E.aprobacion}</span></div>
      ${meta === null ? '' : `<div class="marcador meta" style="left:${posEscala(meta)}%"><span>Meta ${meta}</span></div>`}
    </div>
    <div class="escala-extremos"><span>${E.min}</span><span>${E.max}</span></div>`;
}

/* ---------- Evaluaciones (simples y bloques de controles) ---------- */

/** Celda de ponderación: texto libre (25 · 25% · 0,25 · 1/4). En modo automático muestra el peso asumido. */
function htmlCeldaPeso(ev, a, etiqueta) {
  const auto = a.modoAuto ? `auto ${fmtPesoInput(a.pesoAuto)}` : '0';
  return `<div class="input-sufijo"><input type="text" inputmode="decimal" data-field="peso" data-key="${ev.id}-peso"
            value="${fmtPesoInput(Calc.peso(ev))}" placeholder="${auto}" title="${ayudaPeso()}" aria-label="${etiqueta}"><span>${sufijoPeso()}</span></div>`;
}

function htmlFilaSimple(ev, E, a) {
  return `
    <tr data-eval="${ev.id}" class="${ev.pendiente ? 'es-pendiente' : ''}">
      <td><input data-field="nombre" data-key="${ev.id}-nombre" value="${esc(ev.nombre)}" aria-label="Nombre de la evaluación" maxlength="60"></td>
      <td class="col-nota"><input type="text" inputmode="decimal" data-field="nota" data-key="${ev.id}-nota" step="${paso()}" min="${E.min}" max="${E.max}"
            value="${fmtNota(ev.nota)}" placeholder="—" aria-label="Nota">${htmlBonoDecimas(a, ev.id)}</td>
      <td class="col-pend"><label class="check-label"><input type="checkbox" data-field="pendiente" data-key="${ev.id}-pend" ${ev.pendiente ? 'checked' : ''}> Pendiente</label></td>
      <td class="col-peso">${htmlCeldaPeso(ev, a, 'Ponderación')}</td>
      <td class="col-acc"><button class="icono" data-action="eliminar-eval" title="Eliminar evaluación" aria-label="Eliminar evaluación">✕</button></td>
    </tr>`;
}

/** Bloque de controles: fila resumen con nota efectiva + filas de controles (colapsables). */
function htmlFilaBloque(ev, E, a) {
  const nb = Calc.notaBloque(ev);
  const abierto = !bloquesCerrados.has(ev.id);
  const k = ev.controles.length;
  const pesoControl = k ? a.pesoEfectivo(ev.id) / k : 0;
  const controles = !abierto ? '' : ev.controles.map(c => `
    <tr class="fila-control" data-ctrl="${c.id}" data-bloque="${ev.id}">
      <td><input data-cfield="nombre" data-key="${c.id}-nombre" value="${esc(c.nombre)}" aria-label="Nombre del control" maxlength="40"></td>
      <td class="col-nota"><input type="text" inputmode="decimal" data-cfield="nota" data-key="${c.id}-nota" step="${paso()}" min="${E.min}" max="${E.max}"
            value="${fmtNota(c.nota)}" placeholder="—" aria-label="Nota del control"></td>
      <td class="col-pend"><small>${c.nota === null ? 'Pendiente' : 'Rendido'}</small></td>
      <td class="col-peso"><small title="Peso del control dentro de la asignatura">${fmtPct(pesoControl)}</small></td>
      <td class="col-acc"><button class="icono" data-action="eliminar-control" aria-label="Eliminar control">✕</button></td>
    </tr>`).join('') + `
    <tr class="fila-control fila-agregar" data-bloque="${ev.id}"><td colspan="5">
      <button class="btn ghost sm" data-action="agregar-control">+ Control</button>
      <small>La nota del bloque es el promedio de sus controles; cada uno vale ${fmtPct(pesoControl)} de la asignatura.</small>
    </td></tr>`;
  return `
    <tr data-eval="${ev.id}" class="fila-bloque">
      <td><div class="nombre-bloque">
        <button class="icono plegar" data-action="plegar-bloque" aria-expanded="${abierto}" aria-label="${abierto ? 'Ocultar' : 'Mostrar'} controles">${abierto ? '▾' : '▸'}</button>
        <input data-field="nombre" data-key="${ev.id}-nombre" value="${esc(ev.nombre)}" aria-label="Nombre del bloque" maxlength="60">
      </div></td>
      <td class="col-nota"><div class="nota-efectiva num" title="Nota efectiva: promedio de los controles rendidos">${fmt(nb.actual)}</div></td>
      <td class="col-pend"><span class="chip ${nb.completo ? 'ok' : ''}">Bloque · ${nb.rendidos}/${nb.total}</span></td>
      <td class="col-peso">${htmlCeldaPeso(ev, a, 'Ponderación del bloque')}</td>
      <td class="col-acc"><button class="icono" data-action="eliminar-eval" title="Eliminar bloque" aria-label="Eliminar bloque">✕</button></td>
    </tr>${controles}`;
}

function htmlEvaluaciones(a) {
  const E = escala();
  const { asig } = a;
  const filas = asig.evaluaciones.map(ev => (Calc.esBloque(ev) ? htmlFilaBloque(ev, E, a) : htmlFilaSimple(ev, E, a))).join('');
  const u = unidadPeso();
  return `
    <div class="seccion-cab">
      <h2>Evaluaciones</h2>
      <div class="cab-derecha">
        <small>Nota vacía = pendiente</small>
        <div class="segmentado mini" role="group" aria-label="Unidad de ponderación" title="Cómo ver y escribir las ponderaciones">
          <button class="seg ${u === 'pct' ? 'activa' : ''}" data-action="unidad-peso" data-unidad="pct">%</button>
          <button class="seg ${u === 'dec' ? 'activa' : ''}" data-action="unidad-peso" data-unidad="dec">0–1</button>
        </div>
      </div>
    </div>
    ${(() => {
      const mx = Calc.pesosMezclados(asig.evaluaciones);
      if (!mx) return '';
      const nombresSin = mx.sin.slice(0, 4).map(ev => `“${esc(ev.nombre)}”`).join(', ') + (mx.sin.length > 4 ? '…' : '');
      return `<div class="aviso-pesos" role="alert"><strong>⚠ Ponderaciones incompletas:</strong> ${mx.con.length} evaluación(es) tienen % y ${mx.sin.length} no (${nombresSin}).
        Las sin % no cuentan: complétalas.</div>`;
    })()}
    <table class="tabla tabla-evals">
      <thead><tr><th>Evaluación</th><th>Nota</th><th>Estado</th><th>Ponderación</th><th></th></tr></thead>
      <tbody>${filas || '<tr><td colspan="5" class="vacio-tabla">Sin evaluaciones todavía. Agrega la primera abajo o impórtalas desde una foto.</td></tr>'}</tbody>
    </table>
    <form class="form-eval" data-form="eval" data-tipo="simple" autocomplete="off">
      <select name="tipo" aria-label="Tipo de evaluación"><option value="simple">Evaluación</option><option value="bloque">Bloque de controles</option></select>
      <input name="nombre" placeholder="Nombre (ej. Prueba 2)" required maxlength="60">
      <input class="solo-simple" name="nota" type="text" inputmode="decimal" step="${paso()}" min="${E.min}" max="${E.max}" placeholder="Nota (vacío = pendiente)">
      <input class="solo-bloque" name="controles" type="number" min="1" max="20" step="1" placeholder="N° de controles" value="3">
      <input name="peso" type="text" inputmode="decimal" placeholder="${u === 'dec' ? 'Peso 0–1 (opcional)' : '% (opcional)'}" title="${ayudaPeso()}">
      <button class="btn primario" type="submit">Agregar</button>
    </form>
    ${htmlPesos(asig, a.pesos, a)}`;
}

function htmlPesos(asig, pesos, a) {
  if (!asig.evaluaciones.length) return '';
  // (E1) Ninguna evaluación tiene %: todas valen lo mismo. Es un modo válido, no un error.
  if (a.modoAuto) {
    const n = asig.evaluaciones.length;
    const anchoCal = Math.min(pesos.calificado, 100);
    return `
      <div class="pesos info">
        <div class="pesos-fila"><span class="pesos-texto">⚖ Modo equiponderado automático: todas las evaluaciones valen lo mismo
          (${n === 1 ? '100%' : `${fmtPesoTexto(a.pesoAuto)} cada una`}).</span></div>
        <div class="barra-pesos"><div class="cal" style="width:${anchoCal}%"></div><div class="pen" style="width:${100 - anchoCal}%"></div></div>
        <small>Si tu profesor definió porcentajes, escríbelos (en % o decimal, ej. 25 o 0,25) y se usarán esos.</small>
      </div>`;
  }
  const hayPendientes = asig.evaluaciones.some(ev => !Calc.estaCompleta(ev));
  let clase, texto, boton = '';
  if (pesos.exceso > Calc.EPS) {
    clase = 'bad';
    texto = `⚠ La suma es ${fmtPct(pesos.total)}: supera el 100% por ${fmtPct(pesos.exceso)}. Ajusta las ponderaciones.`;
  } else if (pesos.faltante > Calc.EPS) {
    clase = 'warn';
    const sinPeso = asig.evaluaciones.filter(ev => Calc.peso(ev) === 0).length;
    texto = `Llevas ${fmtPct(pesos.total)} asignado; faltan ${fmtPct(pesos.faltante)} para completar 100%.`
      + (sinPeso ? ` ${sinPeso} evaluación(es) sin ponderación no cuentan en el cálculo hasta que les asignes un %.` : '');
    boton = hayPendientes
      ? `<button class="btn primario sm" data-action="distribuir" title="Reparte el % faltante entre las evaluaciones pendientes y CAMBIA sus ponderaciones (podrás editarlas)">Distribuir ${fmtPct(pesos.faltante)} entre las pendientes</button>`
      : '<small>Agrega una evaluación pendiente para asignarle el resto.</small>';
  } else {
    clase = 'ok';
    texto = '✓ Ponderación completa: 100%.';
  }
  const anchoCal = Math.min(pesos.calificado, 100);
  const anchoPen = Math.min(pesos.pendiente, 100 - anchoCal);
  const anchoExc = pesos.exceso > 0 ? Math.min(pesos.exceso, 30) : 0;
  return `
    <div class="pesos ${clase}">
      <div class="pesos-fila"><span class="pesos-texto">${texto}</span>${boton}</div>
      <div class="barra-pesos">
        <div class="cal" style="width:${anchoCal}%"></div><div class="pen" style="width:${anchoPen}%"></div><div class="exc" style="width:${anchoExc}%"></div>
      </div>
      <div class="leyenda"><span><i></i>Rendido ${fmtPct(pesos.calificado)}</span><span><i class="pen"></i>Pendiente ${fmtPct(pesos.pendiente)}</span></div>
    </div>`;
}

/* ---------- Camino hacia la meta (3 escenarios) ---------- */

function htmlCamino(a) {
  const aviso = a.cerradaManual
    ? `<p class="aviso cierre-aviso">🔒 Cerraste esta asignatura: se calcula solo con lo rendido${a.asig.evaluaciones.some(ev => !Calc.estaCompleta(ev)) ? ' (las evaluaciones pendientes no cuentan)' : ''}. Puedes reabrirla cuando quieras.</p>` : '';
  return `
    <div class="seccion-cab"><h2>Camino hacia la meta</h2><small>${tieneMeta(a.asig) ? `Meta ${textoMeta(a.asig)}` : 'Sin meta'} · Aprueba ${escala().aprobacion}</small></div>
    ${aviso}
    <div class="escenarios">
      ${htmlEquilibrado(a)}
      ${htmlRealista(a)}
    </div>
    ${htmlMasAlla(a)}
    ${htmlSimulador(a)}`;
}

/** "Ir más allá": qué haría falta para superar la meta, escalón por escalón hasta la nota máxima. */
function htmlMasAlla(a) {
  const E = escala();
  if (a.cerradaManual || a.asig.meta >= E.max - Calc.EPS || !['asegurada', 'encaminado', 'subir-ritmo'].includes(a.estado)) return '';
  const amb = Calc.metaAmbiciosa(a, E);
  if (!amb || !amb.escalones.length) return '';
  const filas = amb.escalones.map(e => {
    const alcanzable = e.necesaria <= E.max + Calc.EPS;
    const texto = e.necesaria <= E.min + Calc.EPS ? 'asegurado' : e.necesaria < E.aprobacion ? 'con aprobar' : alcanzable ? `necesitas ${fmtNec(e.necesaria)}` : 'fuera de alcance';
    return `<li class="${alcanzable ? '' : 'lejos'}"><span class="num">${fmt(e.meta, 1)}</span><span>${texto}</span></li>`;
  }).join('');
  const techo = amb.techo;
  if (!amb.escalones.some(e => e.necesaria <= E.max + Calc.EPS)) {
    return `
      <div class="mas-alla">
        <div class="tag">✨ Ir más allá de tu meta</div>
        <p>Tu techo es <strong>${fmt(techo)}</strong>. Llegar a tu meta (${fmt(a.asig.meta, 1)}) ya es el desafío.</p>
      </div>`;
  }
  return `
    <div class="mas-alla">
      <div class="tag">✨ Ir más allá de tu meta</div>
      <p>Tu techo es <strong>${fmt(techo)}</strong>. Para ir más allá de tu meta (${fmt(a.asig.meta, 1)}) necesitarías:</p>
      <ul class="escalones">${filas}</ul>
    </div>`;
}

function botonAjustarMeta(a) {
  const m = Calc.metaMaximaAlcanzable(a);
  return m === null ? '' : `<button class="btn primario sm" data-action="ajustar-meta-max">Ajustar meta al máximo alcanzable (${m.toFixed(1)})</button>`;
}

function textoAprobacion(a) {
  const E = escala();
  if (a.finalMinimo === null) return '';
  if (a.finalMinimo >= E.aprobacion) return `La aprobación (${E.aprobacion}) ya está asegurada pase lo que pase.`;
  const nA = a.necesariaAprobar;
  // v23: un mínimo bajo la nota de aprobación no se muestra como cifra (sería un valor trivial)
  if (nA !== null && nA < E.aprobacion - Calc.EPS) return `Vas bien: aprobando lo que queda, apruebas el ramo.`;
  if (nA !== null && nA <= E.max) return `Para aprobar (${E.aprobacion}) te basta un ${fmtNec(nA)} en lo pendiente.`;
  return '';
}

/** Escenario 1: misma nota en todas las evaluaciones (o controles) pendientes. */
function htmlEquilibrado(a) {
  const E = escala();
  const avisoNormalizacion = a.pesos.faltante > Calc.EPS && a.pesos.total > 0
    ? `<p class="nota-aviso">Calculado sobre el ${fmtPct(a.pesos.total)} definido (faltan ${fmtPct(a.pesos.faltante)} por asignar).</p>` : '';
  let clase = '', titulo, cuerpo;
  switch (a.estado) {
    case 'sin-meta':
      clase = 'info';
      titulo = a.pesos.pendiente > Calc.EPS ? 'Define tu meta' : 'Sin evaluaciones pendientes';
      cuerpo = a.pesos.pendiente > Calc.EPS
        ? '<p>Escribe arriba la nota que quieres lograr y te diré cuánto necesitas en lo que falta.</p>'
        : `<p>Ya rendiste todo lo registrado. Tu promedio es <strong>${fmt(a.actual)}</strong>.</p>`;
      break;
    case 'sin-datos':
      titulo = 'Aún sin datos';
      cuerpo = '<p>Agrega evaluaciones para calcular qué nota necesitas.</p>';
      break;
    case 'sin-pesos':
      clase = 'warn';
      titulo = 'Falta ponderación';
      cuerpo = '<p>Tus evaluaciones pendientes no tienen porcentaje. Usa "Distribuir automáticamente" o escríbelo a mano.</p>';
      break;
    case 'lograda':
    case 'no-lograda':
      titulo = 'Asignatura cerrada';
      cuerpo = a.cerradaManual
        ? `<p>La cerraste con lo rendido. Tu promedio final es <strong>${fmt(a.actual)}</strong>.</p>`
        : `<p>No quedan evaluaciones pendientes. Tu promedio final es <strong>${fmt(a.actual)}</strong>.</p>`;
      break;
    case 'inalcanzable':
      clase = 'info';
      titulo = `Tu mejor cierre posible: ${fmt(a.finalMaximo)}`;
      cuerpo = `<div class="grande num">${fmt(a.finalMaximo)}</div>
        <p>Con ${E.max} en lo que queda llegas a un ${fmt(a.finalMaximo)}, ${calificativo(a.finalMaximo)}. Cada décima que sumes en lo pendiente cuenta.</p>
        <p class="nota-aviso">${textoAprobacion(a)}</p>
        ${botonAjustarMeta(a)}`;
      break;
    case 'asegurada':
      clase = 'ok';
      titulo = 'Meta asegurada';
      cuerpo = `<p>Aunque saques la nota mínima (${E.min}) en todo lo que falta, terminas con ${fmt(a.finalMinimo)}: sobre tu meta.</p>`;
      break;
    default: {
      // Bajo la nota de aprobación no se sugiere un número bajo: basta con aprobar
      if (a.necesaria !== null && a.necesaria < E.aprobacion - Calc.EPS) {
        clase = 'ok';
        titulo = `Basta con aprobar (${fmt(E.aprobacion, 1)})`;
        cuerpo = `<div class="grande num ok-texto">✓</div>
          <p>Con un ${fmt(E.aprobacion, 1)} en cada evaluación pendiente cumples tu meta con margen. Buen momento para <strong>consolidar</strong> o <strong>subir tu meta</strong>.</p>`;
        break;
      }
      const n = Calc.redondearArriba(Calc.limitar(a.necesaria, E.min, E.max), 1);
      const chips = a.pendientes.filter(ev => Calc.peso(ev) > 0)
        .map(ev => `<span class="chip">${esc(ev.nombre)} (${fmtPct(Calc.peso(ev))}): ${n.toFixed(1)}</span>`).join('');
      clase = a.estado === 'encaminado' ? 'ok' : 'warn';
      titulo = `Saca al menos ${n.toFixed(1)} en cada una`;
      cuerpo = `<div class="grande num">${n.toFixed(1)}</div>
        <p>En cada una de tus ${a.pendientes.length} evaluación(es) pendiente(s) (${fmtPct(a.pesos.pendiente)} del total).</p>
        <div class="lista-notas">${chips}</div>`;
    }
  }
  return `<div class="escenario ${clase}"><div class="tag">1 · Camino equilibrado</div><h3>${titulo}</h3>${cuerpo}${avisoNormalizacion}</div>`;
}

/** Escenario 2: diagnóstico realista y constructivo. */
function htmlRealista(a) {
  const E = escala();
  let clase = '', titulo, cuerpo = '';
  switch (a.estado) {
    case 'sin-meta':
      clase = 'info';
      titulo = 'Define tu meta';
      cuerpo = `<p>Promedio: <strong>${fmt(a.actual)}</strong>. Escribe tu meta arriba para ver cuánto necesitas.</p>`;
      break;
    case 'sin-datos':
      titulo = 'Sin diagnóstico aún';
      cuerpo = '<p>Cuando registres notas verás aquí si vas bien.</p>';
      break;
    case 'sin-pesos':
      clase = 'warn';
      titulo = 'Completa la ponderación';
      cuerpo = `<p>Promedio actual: <strong>${fmt(a.actual)}</strong>. Sin porcentajes en lo pendiente no se puede proyectar el final.</p>`;
      break;
    case 'lograda':
      clase = 'ok';
      titulo = '¡Meta cumplida!';
      cuerpo = `<p>Cerraste con ${fmt(a.actual)}, sobre tu meta de ${a.asig.meta}.</p>`;
      break;
    case 'no-lograda': {
      const holgura = a.actual - E.aprobacion;
      clase = 'info';
      titulo = `Cerraste con ${fmt(a.actual)}`;
      cuerpo = `<p>Es ${calificativo(a.actual)}${holgura >= 0 ? `: aprobaste con ${fmt(holgura)} puntos de holgura` : ''}.
        Te faltaron ${fmt(a.asig.meta - a.actual)} para la meta de ${a.asig.meta}; ese dato te sirve para fijar una meta realista el próximo período.</p>`;
      break;
    }
    case 'asegurada':
      clase = 'ok';
      titulo = 'Vas sobrado';
      cuerpo = `<p>Tu meta ya está asegurada. Podrías apuntar más alto: con nota máxima llegarías a ${fmt(a.finalMaximo)}.</p>`;
      break;
    case 'encaminado':
      clase = 'ok';
      titulo = 'Vas bien encaminado';
      cuerpo = a.actual === null
        ? (a.necesaria < E.aprobacion ? `<p>Aún no tienes notas: con <strong>aprobar</strong> cada evaluación cumples tu meta. Considera subirla.</p>` : `<p>Aún no tienes notas, y la meta pide ${fmtNec(a.necesaria)}: alcanzable con constancia.</p>`)
        : a.necesaria < E.aprobacion
          ? `<p>Hoy promedias <strong>${fmt(a.actual)}</strong>: con <strong>aprobar</strong> lo que queda cumples tu meta. ¡Bien ahí! Considera subir tu meta.</p>`
          : `<p>Hoy promedias <strong>${fmt(a.actual)}</strong> y te basta un <strong>${fmtNec(a.necesaria)}</strong>. Tienes ${fmt(a.actual - a.necesaria)} puntos de margen.</p>`;
      break;
    case 'subir-ritmo':
      clase = 'warn';
      titulo = 'Necesitas subir el ritmo';
      cuerpo = a.actual === null
        ? `<p>Necesitas promediar ${fmtNec(a.necesaria)}, por sobre la nota de aprobación (${E.aprobacion}).</p>`
        : `<p>Promedias <strong>${fmt(a.actual)}</strong> pero necesitas <strong>${fmtNec(a.necesaria)}</strong>: debes subir ${fmt(a.necesaria - a.actual)} puntos en lo que queda.</p>`;
      break;
    case 'inalcanzable':
      clase = 'info';
      titulo = 'Ajustemos la meta a algo real';
      cuerpo = `<p>${a.actual !== null ? `Ya rendiste el ${Math.round(a.avance * 100)}% con promedio ${fmt(a.actual)}. ` : ''}
        La meta de ${a.asig.meta} quedó fuera de alcance por lo ya rendido, pero todavía puedes subir hasta <strong>${fmt(a.finalMaximo)}</strong>.
        Fijar ese objetivo te permite medir tu avance con un número que sí depende de ti.</p>`;
      break;
  }
  let extra = '';
  if (a.finalMinimo !== null && a.pesos.pendiente > Calc.EPS) {
    extra += `<p class="nota-aviso">Rango posible de tu promedio final: ${fmt(a.finalMinimo)} – ${fmt(a.finalMaximo)}.</p>`;
    if (a.estado !== 'inalcanzable') {
      const nA = a.necesariaAprobar;
      extra += `<p class="nota-aviso">${nA <= E.min ? `Aprobación (${E.aprobacion}) asegurada.`
        : nA > E.max ? `Con lo que queda no alcanza para el ${E.aprobacion}; consulta opciones de recuperación con tu profesor.`
        : nA < E.aprobacion - Calc.EPS ? `Aprobando lo que queda, apruebas el ramo.`
        : `Para aprobar (${E.aprobacion}) necesitas ${fmtNec(nA)} en lo pendiente.`}</p>`;
    }
  }
  return `<div class="escenario ${clase}"><div class="tag">2 · Situación realista</div><h3>${titulo}</h3>${cuerpo}${extra}</div>`;
}

/* ---------- Escenario 3: simulador (trabaja sobre la lista expandida) ---------- */

function valorSimDefecto(a) {
  const E = escala();
  const base = a.necesaria ?? (tieneMeta(a.asig) ? a.asig.meta : (a.actual ?? escala().aprobacion));
  return Calc.redondear(Calc.limitar(Calc.redondearArriba(base, 1), E.min, E.max), 1);
}
function valorSim(a, ev) {
  return sim[a.asig.id]?.[ev.id] ?? valorSimDefecto(a);
}

function htmlSimulador(a) {
  const E = escala();
  const pendientes = a.pendientes.filter(ev => Calc.peso(ev) > 0);
  if (!pendientes.length) {
    return `<div class="simulador"><h3>3 · ¿Qué pasa si...? <small class="muted">simulación</small></h3>
      <p class="muted">El simulador se activa cuando hay evaluaciones pendientes con ponderación.</p></div>`;
  }
  const valores = pendientes.map(ev => valorSim(a, ev));
  const promedioSim = valores.reduce((s, v) => s + v, 0) / valores.length;
  const rango = `min="${E.min}" max="${E.max}" step="${paso()}"`;
  const filas = pendientes.map(ev => `
    <div class="sim-fila">
      <span>${esc(ev.nombre)} <small>${fmtPct(Calc.peso(ev))}</small></span>
      <input type="range" data-sim="${ev.id}" ${rango} value="${valorSim(a, ev)}" aria-label="Nota hipotética de ${esc(ev.nombre)}">
      <output data-sim-out="${ev.id}">${valorSim(a, ev).toFixed(1)}</output>
    </div>`).join('');
  return `
    <div class="simulador">
      <div class="seccion-cab">
        <h3>3 · ¿Qué pasa si...? <small class="muted">simulación: no cambia tus notas reales</small></h3>
        <button class="btn ghost sm" data-action="sim-reset" title="Vuelve los deslizadores a la nota sugerida">Restablecer simulación</button>
      </div>
      <div class="sim-grid">
        <div>
          <div class="sim-fila uniforme">
            <span>Misma nota en todo</span>
            <input type="range" data-sim="__todas" ${rango} value="${Calc.redondear(promedioSim, 1)}" aria-label="Misma nota para todas las pendientes">
            <output data-sim-out="__todas">${promedioSim.toFixed(1)}</output>
          </div>
          ${filas}
        </div>
        <div id="sim-resultado" class="sim-resultado"></div>
      </div>
    </div>`;
}

function actualizarSimResultado(a) {
  const caja = $('#sim-resultado');
  if (!caja) return;
  const E = escala();
  const final = Calc.proyectarFinal(a.evals, ev => valorSim(a, ev));
  const dif = tieneMeta(a.asig) ? final - a.asig.meta : final - E.aprobacion;
  const clase = dif >= -Calc.EPS ? 'ok' : final >= E.aprobacion ? 'warn' : 'bad';
  const textoMeta = !tieneMeta(a.asig) ? (final >= E.aprobacion ? 'Con estas notas apruebas. Define una meta para compararte con ella.' : 'Con estas notas no alcanzas a aprobar.')
    : dif >= -Calc.EPS
    ? `Alcanzas tu meta (${a.asig.meta}) con ${fmt(Math.abs(dif))} de margen.`
    : `Te faltarían ${fmt(Math.abs(dif))} para tu meta (${a.asig.meta}).`;
  // Nota proyectada de cada bloque con los valores simulados
  const bloques = a.asig.evaluaciones.filter(Calc.esBloque).map(b => {
    const nb = Calc.notaBloque(b, c => valorSim(a, c));
    return nb.proyectada === null ? '' : `<p class="muted">${esc(b.nombre)}: nota efectiva proyectada ${fmt(nb.proyectada)}</p>`;
  }).join('');
  caja.className = `sim-resultado ${clase}`;
  caja.innerHTML = `
    <small>Promedio final simulado</small>
    <div class="grande num">${fmt(final)}</div>
    <p>${textoMeta}</p>
    <p class="muted">${final >= E.aprobacion ? 'Apruebas' : 'No apruebas'} (aprobación ${E.aprobacion}).</p>
    ${bloques}`;
}

/* ---------- Preparación para la próxima evaluación (guía transversal) ---------- */

/** Foco de la guía según la situación de la asignatura. */
function enfoqueGuia(a) {
  switch (a.estado) {
    case 'lograda': case 'no-lograda': return 'cerrada';
    case 'asegurada': case 'encaminado': return a.actual === null ? 'base' : 'consolidar';
    case 'subir-ritmo': return a.actual === null ? 'base' : 'subir';
    case 'inalcanzable': return 'recuperar';
    case 'sin-pesos': return a.actual === null ? 'base' : !tieneMeta(a.asig) || a.actual >= a.asig.meta ? 'consolidar' : 'subir';
    case 'sin-meta': return a.actual === null ? 'base' : 'consolidar';
    default: return 'base';
  }
}

/** Consejos priorizados: primero los específicos del foco, luego los universales (máx. 5). */
/**
 * Consejos rotativos: 2 específicos del foco + 3 universales o afines, elegidos al azar.
 * La mezcla depende de una semilla de la sesión, de la asignatura y de cuántas veces se pidieron
 * "Otros consejos" (o se cambió de asignatura), así no cambian en cada redibujo pero sí al pedirlo.
 */
const semillaConsejos = Math.floor(Math.random() * 1e9);
const rotacionConsejos = {};
function aleatorioConSemilla(semilla) {
  let s = semilla >>> 0;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; };
}
function mezclar(lista, rnd) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function consejosGuia(foco, asigId = '') {
  const todos = REF.GUIA_EVALUACION.consejos;
  const rnd = aleatorioConSemilla(Calc.indiceDiario(`${semillaConsejos}|${asigId}|${rotacionConsejos[asigId] || 0}`, 2 ** 31));
  const especificos = mezclar(todos.filter(c => c.para.includes(foco)), rnd).slice(0, 2);
  const otros = mezclar(todos.filter(c => !especificos.includes(c) && (!c.para.length || c.para.includes(foco))), rnd);
  return [...especificos, ...otros].slice(0, 3);
}

const enChecklist = (asig, texto) => (asig.checklist || []).some(i => Importador.normalizar(i.texto) === Importador.normalizar(texto));

function htmlGuia(a) {
  const { asig } = a;
  const foco = enfoqueGuia(a);
  const enfoque = REF.GUIA_EVALUACION.enfoques[foco];
  const proxima = asig.evaluaciones.find(ev => !Calc.estaCompleta(ev));
  let lineaProxima = '';
  if (proxima && foco !== 'cerrada') {
    const w = a.pesoEfectivo(proxima.id);
    const nec = a.necesaria !== null && ['encaminado', 'subir-ritmo'].includes(a.estado)
      ? (a.necesaria < escala().aprobacion ? ' · con aprobar te basta: ve por más' : ` · apunta a un <strong>${fmtNec(Calc.limitar(a.necesaria, escala().min, escala().max))}</strong> o más`) : '';
    lineaProxima = `<p class="guia-proxima">Próxima: <strong>${esc(proxima.nombre)}</strong>${w ? ` (${fmtPesoTexto(w)} del total)` : ''}${nec}</p>`;
  }
  const consejos = consejosGuia(foco, asig.id);
  const carrera = carreraPreferida();
  // v8: universitarios ya cursan su carrera → se habla de su formación profesional, no de “carrera preferida”
  const pUni = perfil().modalidad === 'uni';
  const lineaCarrera = pUni
    ? `<p class="guia-carrera">🎓 ${esc(foco === 'cerrada' ? 'Lo que aprendiste en este ramo es parte de tu formación profesional: anótalo, lo vas a volver a usar.' : `Prepárala pensando en cómo usarás estos contenidos al ejercer${perfil().uni.carrera ? ` ${perfil().uni.carrera}` : ' tu profesión'}.`)}</p>`
    : carrera
      ? `<p class="guia-carrera">🎯 ${esc(fraseCarrera(foco === 'cerrada' ? 'Lo que aprendiste aquí también es parte del camino hacia {carrera}.' : 'Esta evaluación también es un paso hacia {carrera}.'))}</p>`
      : '<p class="guia-carrera muted">¿Tienes una carrera soñada? Escríbela en <button class="enlace" data-action="abrir-perfil">Perfil</button> y te la recordaré como motivación.</p>';
  const items = consejos.map(c => {
    const ya = enChecklist(asig, c.check);
    return `
      <li class="guia-tarjeta ${ya ? 'hecha' : ''}">
        <strong>${esc(c.titulo)}</strong>
        <p>${esc(c.texto)}</p>
        <button class="guia-mini" data-action="guia-check" data-consejo="${c.id}" ${ya ? 'disabled' : ''} title="${ya ? 'Ya está en tu checklist' : 'Agregar este consejo al checklist'}" aria-label="${ya ? 'Ya está en tu checklist' : `Agregar al checklist: ${esc(c.titulo)}`}">${ya ? '✓' : '+'}</button>
      </li>`;
  }).join('');
  const faltan = consejos.filter(c => !enChecklist(asig, c.check)).length;
  return `
    <div class="seccion-cab"><h2>Preparación para tu próxima evaluación</h2>
      <div class="cab-derecha">
        <button class="btn ghost sm" data-action="otros-consejos" title="Ver otros consejos">Otros consejos ↻</button>
        ${faltan ? `<button class="btn sm" data-action="guia-check-todas">+ Todo al checklist</button>` : ''}
      </div></div>
    <p class="guia-tono">${esc(tono().guia)} <button class="enlace" data-action="ir-metodos" data-asig="${asig.id}">Ver métodos para ${esc(asig.nombre)}</button></p>
    <div class="guia-enfoque ${foco}">
      <h3>${esc(enfoque.titulo)}</h3>
      <p>${esc(enfoque.texto)}</p>
      ${lineaProxima}
      ${lineaCarrera}
    </div>
    <ul class="guia-lista guia-tarjetas">${items}</ul>`;
}

/* ---------- Promoción escolar (orientativa) ---------- */

/** Asignaturas que no inciden en la promoción (Religión; Orientación y Consejo de Curso no se califican). */
const NO_INCIDE_PROMOCION = /religi|orientaci|consejo de curso/i;

/**
 * Promedio ANUAL por asignatura: une las asignaturas con el mismo nombre de todos los períodos del perfil
 * (ej. Matemática del Semestre 1 y del Semestre 2) y promedia sus promedios.
 */
/** Promedio anual por asignatura (v9: mismo emparejamiento por nombre normalizado que el consolidado). */
function analisisAnualPorAsignatura(todos) {
  return Calc.promediosPorAsignatura(todos, perfil().periodos).map(g => ({
    asig: { nombre: g.nombre }, actual: g.promedio,
    pesos: { pendiente: g.pendiente ? 1 : 0 },
    cerradaManual: g.cerradaManual,
  }));
}

function renderPromocion(todos) {
  const cont = $('#promocion');
  if (!esEscolar()) { cont.hidden = true; return; }
  const E = escala();
  const anual = analisisAnualPorAsignatura(todos);
  const excluidas = anual.filter(a => NO_INCIDE_PROMOCION.test(a.asig.nombre));
  const r = Calc.evaluarPromocion(anual.filter(a => !NO_INCIDE_PROMOCION.test(a.asig.nombre)), E);
  cont.hidden = false;
  const nombresRep = r.reprobadas.map(x => `${esc(x.a.asig.nombre)} (${fmt(x.nota, 1)})`).join(', ');
  const proyeccion = r.abiertas ? ' con tus promedios actuales (aún hay evaluaciones pendientes)' : '';
  let clase, titulo, texto;
  switch (r.estado) {
    case 'sin-datos':
      clase = ''; titulo = 'Promoción: aún sin datos';
      texto = 'Cuando registres notas verás aquí si vas pasando de curso según el criterio estándar.';
      break;
    case 'promueve':
      clase = 'ok'; titulo = '✓ Al día para promover';
      texto = `Todas tus asignaturas están en ${fmt(E.aprobacion, 1)} o más${proyeccion}. Promedio general anual: <strong>${fmt(r.general, 1)}</strong>.`;
      break;
    case 'promueve-con-1':
      clase = 'warn'; titulo = 'Atención: revisa 1 asignatura bajo ' + fmt(E.aprobacion, 1);
      texto = `${nombresRep}. Con promedio general <strong>${fmt(r.general, 1)}</strong> (≥ ${fmt(r.umbral1, 1)}) igual se promovería según el criterio estándar${proyeccion}. Subirla te da más margen.`;
      break;
    case 'promueve-con-2':
      clase = 'warn'; titulo = 'Atención: revisa 2 asignaturas bajo ' + fmt(E.aprobacion, 1);
      texto = `${nombresRep}. Con promedio general <strong>${fmt(r.general, 1)}</strong> (≥ ${fmt(r.umbral2, 1)}) igual se promovería según el criterio estándar${proyeccion}. Es una situación justa: prioriza esas asignaturas.`;
      break;
    default: {
      clase = 'bad'; titulo = 'En riesgo de repitencia según el criterio estándar';
      const req = r.reprobadas.length === 1 ? `con 1 asignatura bajo ${fmt(E.aprobacion, 1)} se necesita promedio general ≥ ${fmt(r.umbral1, 1)}`
        : r.reprobadas.length === 2 ? `con 2 asignaturas bajo ${fmt(E.aprobacion, 1)} se necesita promedio general ≥ ${fmt(r.umbral2, 1)}`
        : `con ${r.reprobadas.length} asignaturas bajo ${fmt(E.aprobacion, 1)} no se cumple el criterio de promoción automática`;
      texto = `${nombresRep}. Promedio general: <strong>${fmt(r.general, 1)}</strong>; ${req}${proyeccion}. Aún puedes revertirlo: enfócate en esas asignaturas y conversa con tu profesor jefe.`;
    }
  }
  cont.className = `panel promocion ${clase}`;
  cont.innerHTML = `
    <div class="promocion-cab"><strong>${titulo}</strong><span class="chip">Año completo · todos los períodos</span></div>
    <p>${texto}</p>
    <p class="nota-aviso">Orientativo (Decreto 67/2018). Decide tu colegio; también se exige 85 % de asistencia.</p>`;
}

/* ---------- Décimas extra ---------- */

const fmtDecimas = v => {
  const n = Calc.redondear(v * 10, 2);
  return `${String(n).replace('.', ',')} décima${n === 1 ? '' : 's'} (+${String(Calc.redondear(v, 3)).replace('.', ',')})`;
};

/** Marca "+0,2" junto a una nota que tiene décimas aplicadas. */
function htmlBonoDecimas(a, evId) {
  const v = (a.asig.decimas || []).filter(x => x.evalId === evId).reduce((s2, x) => s2 + (Number(x.valor) || 0), 0);
  return v > 0 ? `<small class="bono-decimas" title="Décimas aplicadas a esta nota">+${String(Calc.redondear(v, 2)).replace('.', ',')}</small>` : '';
}

/** Opciones de evaluación para aplicar décimas (lista expandida: un control de un bloque cuenta aparte). */
function opcionesEvalDecimas(a) {
  return a.evals.map(ev => [ev.id, `${ev.nombre}${Calc.estaCalificada(ev) ? ` · ${fmt(ev.nota, 1)}` : ' · pendiente'}${Calc.peso(ev) ? ` · ${fmtPesoTexto(Calc.peso(ev))}` : ''}`]);
}

/**
 * (v14) Décimas extra: se aplican a una EVALUACIÓN concreta (no al promedio directo).
 * Cada registro elige en qué nota se suman; las que aún no tienen evaluación no cambian nada y,
 * si la asignatura va bajo su meta, se recomienda dónde aplicarlas según las ponderaciones.
 */
function htmlDecimas(a) {
  const E = escala();
  const lista = a.asig.decimas || [];
  const d = Calc.impactoDecimas(a, E);
  const opcionesEval = opcionesEvalDecimas(a);
  const filas = lista.map(x => `
    <li data-decima="${x.id}" class="${x.estado === 'potencial' ? 'potencial' : ''} ${x.evalId && opcionesEval.some(([id]) => id === x.evalId) ? '' : 'sin-asignar'}">
      <span class="decima-motivo">${esc(x.motivo || 'Décimas')}</span>
      <span class="num">${fmtDecimas(x.valor)}</span>
      <select data-decima-eval aria-label="Evaluación donde se aplican">
        <option value="">Sin aplicar todavía</option>${opts(opcionesEval, x.evalId || '')}
      </select>
      <select data-decima-estado aria-label="Estado de las décimas">${opts([['obtenida', 'Obtenida'], ['potencial', 'Potencial (puedo optar)']], x.estado || 'obtenida')}</select>
      <button class="icono" data-action="decima-eliminar" aria-label="Eliminar décimas">✕</button>
    </li>`).join('');

  // Recomendación: décimas sin aplicar + asignatura bajo su meta (o sin meta, igual se sugiere)
  let recomendacion = '';
  const sinAplicar = lista.filter(x => !(x.evalId && opcionesEval.some(([id]) => id === x.evalId)));
  if (sinAplicar.length && a.evals.length) {
    const total = sinAplicar.reduce((s2, x) => s2 + (Number(x.valor) || 0), 0);
    const opciones = Calc.recomendarDecimas(a, total, E).slice(0, 3);
    const bajo = tieneMeta(a.asig) && a.actual !== null && a.actual < a.asig.meta - Calc.EPS;
    if (opciones.length) {
      const mejor = opciones[0];
      recomendacion = `
        <div class="recomendacion-decimas">
          <p><strong>${bajo ? '💡 Estás bajo tu meta: ' : '💡 '}conviene aplicar tus ${fmtDecimas(total)} en “${esc(mejor.ev.nombre)}”</strong>
            (${fmtPesoTexto(Calc.peso(mejor.ev))}${mejor.pendiente ? ', aún pendiente' : ''}): sube tu promedio final en <strong class="num">+${fmt(mejor.delta)}</strong>${mejor.tope ? ' (parte se pierde por el tope de la nota máxima)' : ''}.</p>
          ${opciones.length > 1 ? `<p class="nota-aviso">Otras opciones: ${opciones.slice(1).map(o => `${esc(o.ev.nombre)} (+${fmt(o.delta)})`).join(' · ')}. Mientras más pesa la evaluación y más margen tiene bajo ${E.max}, más sube tu promedio.</p>` : ''}
          <button class="btn primario sm" data-action="decimas-aplicar" data-eval="${mejor.ev.id}">Aplicar ${sinAplicar.length > 1 ? 'todas' : ''} en “${esc(mejor.ev.nombre)}”</button>
          <p class="nota-aviso">Confirma con tu profesor en qué evaluación se pueden sumar: algunas décimas son para una prueba específica.</p>
        </div>`;
    }
  }

  let resumen = '<p class="nota-aviso">Décimas del profesor: se suman a la nota de una evaluación (tope ' + E.max + ').</p>';
  if (d) {
    resumen = `
      <div class="decimas-resumen">
        <div><small>Promedio con tus notas</small><strong class="num">${fmt(a.actual)}</strong></div>
        <div><small>Con décimas aplicadas</small><strong class="num">${fmt(d.actualConObtenidas)}</strong></div>
        ${d.potenciales ? `<div><small>Si logras las potenciales</small><strong class="num">${fmt(d.actualConTodas)}</strong></div>` : ''}
      </div>
      ${d.sinAsignarObtenidas || d.sinAsignarPotenciales ? `<p class="nota-aviso">${fmtDecimas(d.sinAsignarObtenidas + d.sinAsignarPotenciales)} sin aplicar: elige su evaluación.</p>` : ''}
      ${d.necesariaConDecimas !== null && a.necesaria !== null && Math.abs(d.necesariaConDecimas - a.necesaria) > Calc.EPS
        ? `<p class="nota-aviso">Con las décimas aplicadas te bastaría <strong>${textoNecesaria(d.necesariaConDecimas, true)}</strong> en lo pendiente (sin décimas: ${textoNecesaria(a.necesaria, true)}).</p>` : ''}
      <p class="nota-aviso">Se suman a la nota elegida, no al promedio. El promedio general usa tus notas registradas.</p>`;
  }
  return `
    <div class="seccion-cab"><h2>Décimas extra</h2><small>${lista.length ? `${lista.length} registro(s)` : 'Opcional'}</small></div>
    ${lista.length ? `<ul class="lista-decimas">${filas}</ul>` : ''}
    ${recomendacion}
    ${resumen}
    <form class="form-decimas" data-form="decimas" autocomplete="off">
      <input name="motivo" placeholder="Motivo (ej. participación)" maxlength="60" aria-label="Motivo">
      <input name="valor" type="text" inputmode="decimal" placeholder="N° de décimas (ej. 2)" required aria-label="Cantidad de décimas" title="2 = dos décimas = +0,2. También puedes escribir 0,2">
      <select name="evalId" aria-label="Evaluación donde se aplican"><option value="">Aplicar en… (o elige después)</option>${opts(opcionesEval, '')}</select>
      <select name="estado" aria-label="Estado"><option value="obtenida">Obtenida</option><option value="potencial">Potencial</option></select>
      <button class="btn primario" type="submit">Agregar</button>
    </form>`;
}

/* ---------- Admisión: aporte de cada componente ---------- */

function htmlAportes(r, sel, ef) {
  const total = r.total ?? r.parcial;
  const colores = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
  const componentes = Calc.COMPONENTES_ADMISION.filter(k => (Number(sel.ponderaciones?.[k]) || 0) > 0);
  const filas = componentes.map((k, i) => {
    const w = Number(sel.ponderaciones[k]);
    const det = r.detalle.find(x => x.k === k);
    const maximo = (1000 * w) / 100;
    if (!det) {
      return `<div class="aporte-fila falta"><span class="aporte-nombre"><i class="${colores[i % 8]}"></i>${esc(etiquetaComponente(k))} <small>${w}%</small></span>
        <span class="aporte-barra"><span style="width:0"></span></span><span class="aporte-valor">falta puntaje</span></div>`;
    }
    return `<div class="aporte-fila"><span class="aporte-nombre"><i class="${colores[i % 8]}"></i>${esc(etiquetaComponente(k))} <small>${w}% · ${det.v} pts${k === 'electiva' ? ` (mejor entre Ciencias e Historia)` : ''}</small></span>
      <span class="aporte-barra" title="Aporta ${fmtPts(det.aporte)} de ${fmtPts(maximo)} posibles"><span class="${colores[i % 8]}" style="width:${Calc.limitar((det.aporte / maximo) * 100, 0, 100)}%"></span></span>
      <span class="aporte-valor"><strong>+${fmtPts(det.aporte)}</strong> <small>/ ${fmtPts(maximo)}</small></span></div>`;
  }).join('');
  const apilada = componentes.map((k, i) => {
    const det = r.detalle.find(x => x.k === k);
    return det ? `<span class="${colores[i % 8]}" style="width:${(det.aporte / 1000) * 100}%" title="${esc(etiquetaComponente(k))}: +${fmtPts(det.aporte)}"></span>` : '';
  }).join('');
  return `
    <div class="aportes">
      <div class="aportes-cab"><strong>Aporte de cada componente al ponderado</strong><span class="num">${r.total === null ? 'parcial ' : ''}${fmtPts(total)} pts</span></div>
      <div class="barra-apilada" aria-hidden="true">${apilada}</div>
      ${filas}
      <p class="nota-aviso">Aporte = puntaje × ponderación ÷ 100.</p>
    </div>`;
}

/* ---------- Guía de inicio y ayuda (?) ---------- */

let guia = { modo: 'inicio', paso: 0 };
let guiaRetorno = null;   // (v16) paso de la guía al que volver al cerrar el Perfil / importador

/** Reabre la guía exactamente en el paso donde estaba la persona. */
function volverAGuia() {
  if (!guiaRetorno) return;
  const g = guiaRetorno;
  guiaRetorno = null;
  setTimeout(() => {
    if (document.querySelector('dialog[open]')) return;   // otra ventana sigue abierta: no se encima
    guia = { ...g };
    renderGuia();
    $('#dlg-guia').showModal();
  }, 120);
}
['#dlg-perfil', '#dlg-foto'].forEach(sel => $(sel)?.addEventListener('close', volverAGuia));

function abrirGuia(modo = 'inicio') {
  guia = { modo, paso: 0 };
  renderGuia();
  const dlg = $('#dlg-guia');
  if (!dlg.open) dlg.showModal();
}

function renderGuia() {
  const cuerpo = $('#guia-cuerpo');
  if (guia.modo === 'ayuda') {
    cuerpo.innerHTML = `
      <div class="guia-cab"><h2>Ayuda · qué hace cada función</h2><button type="button" class="btn ghost sm" data-action="cerrar-dialogo" aria-label="Cerrar ayuda">Cerrar ✕</button></div>
      <div class="ayuda-secciones">${REF.AYUDA.map((sec, i) => `
        <details class="ayuda-seccion" ${i === 0 ? 'open' : ''}>
          <summary>${esc(sec.seccion)}</summary>
          <dl>${sec.items.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
        </details>`).join('')}</div>
      <div class="fila-botones"><button type="button" class="btn" data-action="guia-paso-a-paso">Ver la guía paso a paso</button></div>`;
    return;
  }
  const pasos = REF.GUIA_INICIO;
  const p = pasos[guia.paso];
  const ultimo = guia.paso === pasos.length - 1;
  cuerpo.innerHTML = `
    <div class="guia-cab">
      <span class="guia-etiqueta">Guía de inicio · paso ${guia.paso + 1} de ${pasos.length}</span>
      <button type="button" class="btn ghost sm" data-action="cerrar-dialogo" title="Puedes volver a abrirla desde Ayuda (Herramientas o Más ▾)">Omitir guía</button>
    </div>
    <ol class="guia-progreso" aria-label="Pasos">${pasos.map((x, i) => `<li class="${i === guia.paso ? 'actual' : i < guia.paso ? 'hecho' : ''}"><button type="button" data-action="guia-ir" data-paso="${i}" aria-label="Paso ${i + 1}: ${esc(x.titulo)}">${i + 1}</button></li>`).join('')}</ol>
    <div class="guia-paso">
      <div class="guia-icono" aria-hidden="true">${p.icono}</div>
      <h2>${esc(p.titulo)}</h2>
      <p class="muted">${esc(p.texto)}</p>
      <ul>${p.puntos.map(x => `<li>${x}</li>`).join('')}</ul>
      ${p.accion ? `<button type="button" class="btn sm" data-action="guia-accion" data-accion="${p.accion}">${esc(p.etiqueta)} →</button>` : ''}
    </div>
    <div class="fila-botones">
      ${guia.paso ? '<button type="button" class="btn ghost" data-action="guia-anterior">← Anterior</button>' : ''}
      <span class="espaciador"></span>
      ${ultimo ? '<button type="button" class="btn primario" data-action="cerrar-dialogo">¡Listo, a estudiar!</button>'
        : '<button type="button" class="btn primario" data-action="guia-siguiente">Siguiente →</button>'}
    </div>`;
}

/* ---------- Checklist ---------- */

function htmlChecklist(asig) {
  const items = asig.checklist || [];
  const hechos = items.filter(i => i.hecho).length;
  const pct = items.length ? Math.round((hechos / items.length) * 100) : 0;
  const lis = items.map(it => `
    <li data-item="${it.id}" class="${it.hecho ? 'hecho' : ''}">
      <input type="checkbox" data-check-field="hecho" ${it.hecho ? 'checked' : ''} aria-label="Marcar como hecho">
      <input class="check-texto" data-check-field="texto" data-key="${it.id}-texto" value="${esc(it.texto)}" maxlength="120" aria-label="Tarea">
      <button class="icono" data-action="eliminar-item" aria-label="Eliminar tarea">✕</button>
    </li>`).join('');
  return `
    <div class="seccion-cab"><h2>Checklist de estudio</h2><small>${hechos} de ${items.length} completadas</small></div>
    <div class="progreso-check"><div style="width:${pct}%"></div></div>
    <ul class="checklist">${lis || '<li class="muted vacio-lista">Agrega tareas concretas: temas a repasar, guías, ejercicios.</li>'}</ul>
    <form class="form-check" data-form="check" autocomplete="off">
      <input name="texto" placeholder="Ej. Repasar guía de derivadas" required maxlength="120">
      <button class="btn primario" type="submit">Agregar</button>
    </form>`;
}

/* =========================================================
 * 4. Pestaña "NEM y Admisión"
 * ========================================================= */

function renderAdmision() {
  const sub = store.subvista === 'cortes' ? 'cortes' : 'nem';
  $('#vista-admision').innerHTML = `
    <div class="subtabs segmentado" aria-label="Secciones de admisión">
      <button class="seg ${sub === 'nem' ? 'activa' : ''}" data-action="subvista" data-sub="nem">Calculadora NEM</button>
      <button class="seg ${sub === 'cortes' ? 'activa' : ''}" data-action="subvista" data-sub="cortes">Puntajes de corte y simulador</button>
    </div>
    <div id="admision-cuerpo">${sub === 'nem' ? htmlNEM() : htmlCortes()}</div>`;
  if (sub === 'nem') actualizarSimNEM();
}

/* ---------- NEM ---------- */

function grupoNEM(p = perfil()) {
  return p.nem.grupo || (p.modalidad === 'tp' ? 'C' : 'A');
}
function tablaNEM(g) {
  const imp = store.tablasNEM[g];
  // Por defecto: tabla oficial (Res. Ex. 11.005, Admisión 2026–2027). Una tabla importada por el estudiante la reemplaza.
  return imp ? { tabla: imp.tabla, oficial: true, importada: true, fecha: imp.fecha } : { tabla: REF.NEM_OFICIAL[g], oficial: true, importada: false };
}
/** Promedios anuales automáticos (1°–4° Medio) desde perfiles escolares del mismo nivel. */
/**
 * Promedio anual automático: SOLO del perfil activo (v6). Se calcula con sus propias asignaturas
 * para el año que cursa (su "nivel"). Los demás años se escriben a mano en este mismo perfil;
 * nunca se toman datos de otros perfiles.
 */
function promediosAnualesAuto() {
  const p = perfil();
  const res = {};
  if (esEscolar(p) && REF.AÑOS_MEDIA.includes(p.nivel)) {
    const v = Calc.promedioAnualEscolar(p.asignaturas.map(a => Calc.analizarAsignatura(a, p.escala)));
    if (v !== null) res[p.nivel] = { valor: v, perfil: p };
  }
  return res;
}
function promediosAnualesEfectivos() {
  const auto = promediosAnualesAuto();
  const manual = perfil().nem.manual || {};
  return REF.AÑOS_MEDIA.map(y => {
    if (typeof manual[y] === 'number') return { año: y, valor: manual[y], origen: 'manual' };
    if (auto[y]) return { año: y, valor: auto[y].valor, origen: 'auto', perfil: auto[y].perfil };
    return { año: y, valor: null, origen: 'vacío' };
  });
}
function añoSimulable() {
  const p = perfil();
  return REF.AÑOS_MEDIA.includes(p.nivel) && esEscolar(p) ? p.nivel : '4M';
}
/** NEM actual del perfil (promedio, puntaje y si viene de tabla importada). */
function nemActual() {
  const t = tablaNEM(grupoNEM());
  const prom = Calc.promedioNEM(promediosAnualesEfectivos().map(x => x.valor));
  return { prom, puntaje: Calc.puntajeNEM(prom, t.tabla), oficial: t.oficial };
}
const etiquetaAño = y => REF.NIVELES_ESCOLARES.find(([k]) => k === y)[1];

function htmlNEM() {
  const p = perfil();
  const g = grupoNEM();
  const t = tablaNEM(g);
  const anuales = promediosAnualesEfectivos();
  const auto = promediosAnualesAuto();
  const { prom, puntaje } = nemActual();
  const disponibles = anuales.filter(x => x.valor !== null).length;
  const escalaDistinta = p.escala.min !== 1 || p.escala.max !== 7;

  const filas = anuales.map(x => {
    const origen = x.origen === 'manual' ? 'escrito a mano' : x.origen === 'auto' ? 'automático: tus asignaturas de este perfil' : 'sin datos: escríbelo a mano';
    return `<tr>
      <td><strong>${etiquetaAño(x.año)}</strong><br><small>${origen}</small></td>
      <td class="num">${auto[x.año] ? auto[x.año].valor.toFixed(1) : '—'}</td>
      <td><input type="text" inputmode="decimal" step="0.1" min="1" max="7" data-nem-manual="${x.año}" data-key="nem-${x.año}" value="${typeof p.nem.manual[x.año] === 'number' ? p.nem.manual[x.año] : ''}" placeholder="${auto[x.año] ? auto[x.año].valor.toFixed(1) : 'ej. 6.0'}" aria-label="Promedio manual ${etiquetaAño(x.año)}"></td>
    </tr>`;
  }).join('');

  const fuente = t.importada ? `<small class="muted">Tabla importada (${esc(t.fecha)})</small>` : '<small class="muted">Tabla oficial 2026–2027</small>';
  const añoSim = añoSimulable();
  const valSim = simNEM ?? anuales.find(x => x.año === añoSim).valor ?? 6.0;
  const celdas = [];
  for (let n = 40; n <= 70; n++) {
    const v = n / 10;
    const activo = prom !== null && Math.abs(Calc.redondear(prom, 1) - v) < 1e-6;
    celdas.push(`<div class="celda-nem ${activo ? 'activa' : ''}"><span>${v.toFixed(1)}</span><strong>${Calc.puntajeNEM(v, t.tabla)}</strong></div>`);
  }
  const importadas = Object.keys(REF.GRUPOS_NEM).map(k => store.tablasNEM[k]
    ? `<li>${esc(REF.GRUPOS_NEM[k])}: cargada el ${esc(store.tablasNEM[k].fecha)} (${store.tablasNEM[k].tabla.length} filas) <button class="btn ghost sm peligro" data-action="quitar-nem" data-grupo="${k}">Quitar</button></li>`
    : `<li>${esc(REF.GRUPOS_NEM[k])}: tabla oficial incluida · <a href="${urlSegura(REF.URL_NEM[k])}" target="_blank" rel="noopener noreferrer">ver en demre.cl</a></li>`).join('');

  return `
    ${esEscolar() ? '' : '<div class="aviso-uni">La calculadora NEM está pensada para escolares. Puedes usarla igual ingresando tus promedios a mano.</div>'}
    <div class="nem-grid">
      <div class="panel">
        <div class="seccion-cab"><h2>Calculadora NEM</h2>${fuente}</div>
        <label class="campo-linea">Grupo <select data-nem="grupo">${opts(Object.entries(REF.GRUPOS_NEM), g)}</select></label>
        <table class="tabla tabla-compacta">
          <thead><tr><th>Año</th><th title="Calculado con las asignaturas de ESTE perfil (solo el año que cursa)">Automático (este perfil)</th><th title="Escribe tu promedio anual si lo conoces: reemplaza al automático">Escrito a mano</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="nem-resultado">
          <div><small>Promedio NEM</small><div class="grande num">${prom === null ? '—' : prom.toFixed(2)}</div></div>
          <div><small>Puntaje NEM</small><div class="grande num acento">${puntaje ?? '—'}</div></div>
        </div>
        <p class="nota-aviso">NEM = promedio de tus años de 1° a 4° Medio.
          ${disponibles < 4 ? `Faltan ${4 - disponibles} año(s): se usan los disponibles.` : ''}
          ${escalaDistinta ? '<br><strong>Ojo:</strong> la escala de este perfil no es 1–7; el NEM usa notas 1,0–7,0.' : ''}</p>
      </div>
      <div class="panel">
        <div class="seccion-cab"><h2>¿Y si mejoro ${etiquetaAño(añoSim)}?</h2></div>
        <div class="sim-fila">
          <span>Promedio ${etiquetaAño(añoSim)}</span>
          <input type="range" min="4" max="7" step="0.1" value="${valSim}" data-nem-sim aria-label="Promedio simulado del año">
          <output id="nem-sim-out">${Number(valSim).toFixed(1)}</output>
        </div>
        <div id="nem-sim-res" class="sim-resultado"></div>
        <p class="nota-aviso">Simula tu promedio de este año manteniendo los demás años como están.</p>
      </div>
      <div class="panel nem-ancho">
        <div class="seccion-cab"><h2>Tabla de conversión · ${esc(REF.GRUPOS_NEM[g])}</h2>
          <label class="campo-linea">Consultar
            <input type="text" inputmode="decimal" step="0.01" min="4" max="7" data-nem-buscar data-key="nem-buscar" placeholder="ej. 6.25">
            <output id="nem-buscar-res" class="pill">—</output>
          </label>
        </div>
        <div class="grilla-nem">${celdas.join('')}</div>
        <p class="nota-aviso nota-pie">${t.importada ? 'Valores de la tabla que importaste.' : `Fuente: ${esc(REF.NEM_FUENTE)}. Para otro proceso, importa la tabla actualizada abajo.`}</p>
      </div>
      <div class="panel nem-ancho">
        <div class="seccion-cab"><h2>Actualizar tabla NEM (opcional)</h2></div>
        <ul class="lista-tablas">${importadas}</ul>
        <p class="nota-aviso">La app ya incluye la tabla oficial vigente. Si DEMRE publica una nueva, cópiala y pégala aquí (una fila por línea: “promedio puntaje”).</p>
        <div class="form-import">
          <select id="nem-import-grupo" aria-label="Grupo de la tabla">${opts(Object.entries(REF.GRUPOS_NEM), g)}</select>
          <textarea id="nem-import-texto" rows="4" placeholder="4,00  100&#10;4,01  103&#10;…"></textarea>
          <button class="btn primario" data-action="importar-nem">Cargar tabla</button>
        </div>
      </div>
    </div>`;
}

function actualizarSimNEM() {
  const caja = $('#nem-sim-res');
  if (!caja) return;
  const t = tablaNEM(grupoNEM());
  const anuales = promediosAnualesEfectivos();
  const añoSim = añoSimulable();
  const actualProm = Calc.promedioNEM(anuales.map(x => x.valor));
  const actualPts = Calc.puntajeNEM(actualProm, t.tabla);
  const v = simNEM ?? anuales.find(x => x.año === añoSim).valor ?? 6.0;
  const simProm = Calc.promedioNEM(anuales.map(x => (x.año === añoSim ? Number(v) : x.valor)));
  const simPts = Calc.puntajeNEM(simProm, t.tabla);
  const delta = actualPts === null ? null : simPts - actualPts;
  caja.className = `sim-resultado ${delta === null ? '' : delta > 0 ? 'ok' : delta < 0 ? 'warn' : ''}`;
  caja.innerHTML = `
    <small>NEM simulado</small>
    <div class="grande num">${simPts ?? '—'}</div>
    <p>Promedio NEM ${simProm?.toFixed(2) ?? '—'}${delta !== null ? ` · ${delta >= 0 ? '+' : ''}${delta} pts respecto de hoy (${actualPts})` : ''}</p>`;
}

/* ---------- Puntajes de corte y simulador ponderado ---------- */

/** Puntajes efectivos: lo ingresado; NEM vacío → NEM calculado; Ranking vacío → igual al NEM. */
/**
 * (v16) Tablas de la escala PAES para los escenarios: la tabla DEMRE más reciente; en Ciencias,
 * el módulo de tu último ensayo de Ciencias (o Biología si no hay).
 */
function tablasEscenarios() {
  const t = REF.ESCALAS_PAES[0].tablas;
  const ultimoCiencias = perfil().ensayos.filter(e => String(e.prueba).startsWith('ciencias_')).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
  return { cl: t.cl, m1: t.m1, m2: t.m2, historia: t.historia, ciencias: t[ultimoCiencias?.prueba] || t.ciencias_biologia };
}

/** Tres escenarios realistas (puntajes que existen en la escala) para alcanzar el corte. */
function htmlEscenariosCorte(ef, sel) {
  const escenarios = Calc.escenariosCorte(ef, sel.ponderaciones, sel.corte, tablasEscenarios());
  if (!escenarios.length) {
    return '<p class="aviso warn">Ni con el puntaje máximo en tus pruebas PAES se alcanza este corte: revisa tu NEM y Ranking o considera otra carrera.</p>';
  }
  const tarjetas = escenarios.map((e, i) => `
    <article class="escenario-corte">
      <header><span class="esc-num">${i + 1}</span><strong>${esc(e.titulo)}</strong><span class="num esc-total">${fmtPts(e.total)}</span></header>
      <ul>${e.cambios.map(c => `<li><span>${esc(etiquetaComponente(c.k))}</span><span class="num">${c.desde} → <strong>${c.hasta}</strong></span><small>+${c.correctas} correcta${c.correctas === 1 ? '' : 's'}</small></li>`).join('')}</ul>
    </article>`).join('');
  return `<div class="escenarios-corte">${tarjetas}</div>
    <p class="nota-aviso">Desde tus puntajes actuales, con valores reales de la tabla DEMRE (${esc(REF.ESCALAS_PAES[0].etiqueta.replace(/^DEMRE · /, ''))}). “+N correctas” es aproximado: cada aplicación convierte distinto.</p>`;
}

function puntajesEfectivos() {
  const ing = perfil().admision.puntajes || {};
  const nemCalc = nemActual().puntaje;
  const nem = typeof ing.nem === 'number' ? ing.nem : nemCalc;
  const ranking = typeof ing.ranking === 'number' ? ing.ranking : nem;
  return { ...ing, nem: nem ?? null, ranking: ranking ?? null };
}

function htmlCortes() {
  const p = perfil();
  const cat = store.catalogoCortes;
  const sel = cat.find(c => c.id === p.admision.seleccion) || null;
  const ing = p.admision.puntajes || {};
  const ef = puntajesEfectivos();
  const nemInfo = nemActual();

  const campos = REF.COMPONENTES_ADMISION.filter(([k]) => k !== 'electiva').map(([k, etiqueta]) => {
    let ph = 'ej. 650';
    if (k === 'nem') ph = nemInfo.puntaje !== null ? `${nemInfo.puntaje} (calc.)` : 'ej. 700';
    if (k === 'ranking') ph = ef.nem !== null ? `${ef.nem} (= NEM)` : 'ej. 720';
    return `<label>${esc(etiqueta)}<input type="number" min="100" max="1000" step="1" data-adm="${k}" data-key="adm-${k}" value="${typeof ing[k] === 'number' ? ing[k] : ''}" placeholder="${esc(ph)}"></label>`;
  }).join('');

  return `
    <div class="cortes-grid">
      <div class="panel">
        <div class="seccion-cab"><h2>Simulador de puntaje ponderado</h2></div>
        <div class="grilla-puntajes">${campos}</div>
        <p class="nota-aviso">NEM vacío = el de la calculadora. Ranking vacío = igual al NEM.</p>
        <div class="aviso-paes">
          <p><strong>¿No sabes tus puntajes?</strong> Con tus respuestas correctas de un ensayo, la app los calcula en PAES.</p>
          <button class="btn sm" data-action="ir-ensayos">Calcular mis puntajes en PAES</button>
        </div>
        ${htmlComboCarrera(sel)}
        ${sel ? htmlResultadoPonderado(sel, ef) : '<p class="muted">Elige una carrera para calcular tu puntaje ponderado y compararlo con su corte.</p>'}
      </div>
      <div class="panel" data-plegable="catalogo">
        <div class="seccion-cab">
          <h2>Catálogo de carreras y cortes</h2>
          <div class="fila-botones">
            <button class="btn primario sm" data-action="nuevo-corte">+ Agregar carrera</button>
            <button class="btn ghost sm" data-action="exportar-catalogo">Exportar</button>
            <button class="btn ghost sm" data-action="importar-catalogo">Importar</button>
            <button class="btn ghost sm" data-action="restaurar-catalogo">Restaurar plantilla</button>
          </div>
        </div>
        <input type="search" data-cat-buscar data-key="cat-buscar" value="${esc(busquedaCatalogo)}" placeholder="Buscar universidad o carrera…" aria-label="Buscar en el catálogo">
        <div id="cat-tabla" class="tabla-scroll">${htmlTablaCatalogo()}</div>
        <p class="nota-aviso">Cortes 2026: ${esc(REF.FUENTE_CORTES_2026)} Ponderaciones de ejemplo: confírmalas en <a href="https://acceso.mineduc.cl" target="_blank" rel="noopener noreferrer">acceso.mineduc.cl</a>.</p>
      </div>
    </div>`;
}

/* ---------- Buscador de carreras (combobox: escribir para filtrar + desplegar y deslizar) ---------- */

const ETIQUETAS_AREA = {
  ingenieria: 'Ingeniería', informatica: 'Informática y Computación', medicina: 'Medicina y Odontología', salud: 'Salud',
  derecho: 'Derecho', negocios: 'Negocios y Economía', psicologia: 'Psicología', sociales: 'Ciencias Sociales y Humanidades',
  comunicaciones: 'Comunicaciones y Letras', educacion: 'Educación', arquitectura: 'Arquitectura', artes: 'Artes y Diseño',
  ciencias: 'Ciencias', agro: 'Agro, Veterinaria y Recursos Naturales',
};
const siglaUni = u => (String(u).match(/\(([^)]+)\)\s*$/) || [])[1] || '';
const areaCarrera = c => c.area || REF.tipoPorNombre(c.carrera);
const etiquetaCorte = c => (String(c.anio) === '2026' ? 'Corte 2026' : c.anio ? `Corte ${c.anio}` : 'Corte cargado');
/** Nombres con que se suele buscar cada universidad (además de su sigla oficial). */
const ALIAS_UNIVERSIDAD = {
  PUC: 'uc catolica la catolica', UChile: 'uch u de chile la chile', UTFSM: 'usm santa maria federico', USACH: 'usach santiago',
  UdeC: 'udec conce concepcion', PUCV: 'pucv catolica valparaiso', UV: 'uv valparaiso', UANDES: 'uandes andes', UACh: 'uach austral valdivia',
  UNAB: 'unab andres bello', UFRO: 'ufro frontera temuco', UTALCA: 'utalca talca', UAI: 'uai ibanez', UDP: 'udp portales', UDD: 'udd desarrollo',
};
/** Texto normalizado donde se busca: carrera, universidad, sigla, alias y área. */
const textoBusquedaCarrera = c => ` ${Importador.normalizar(`${c.carrera} ${c.universidad} ${siglaUni(c.universidad)} ${ALIAS_UNIVERSIDAD[siglaUni(c.universidad)] || ''} ${ETIQUETAS_AREA[areaCarrera(c)] || ''}`)}`;
/** Palabras cortas (≤ 3 letras, como "uc" o "udp") solo calzan al inicio de una palabra; las largas, en cualquier parte. */
const calzaToken = (texto, t) => (t.length <= 3 ? texto.includes(` ${t}`) : texto.includes(t));

let combo = { abierto: false, query: '', activo: 0, resultados: [] };
const COMBO_MAX = 250;   // opciones dibujadas a la vez (el resto aparece al filtrar)

function filtrarCarreras(query) {
  const tokens = Importador.normalizar(query).split(' ').filter(Boolean);
  const lista = store.catalogoCortes.filter(c => { const h = textoBusquedaCarrera(c); return tokens.every(t => calzaToken(h, t)); });
  const qn = tokens.join(' ');
  // Primero las que empiezan por lo escrito (carrera o sigla), luego por corte de mayor a menor
  const prioridad = c => (qn && Importador.normalizar(c.carrera).startsWith(qn) ? 0 : qn && Importador.normalizar(siglaUni(c.universidad)) === qn ? 1 : 2);
  return lista.sort((a, b) => prioridad(a) - prioridad(b) || (b.corte ?? -1) - (a.corte ?? -1) || a.carrera.localeCompare(b.carrera, 'es'));
}

/** Resalta (sin tildes ni mayúsculas) las palabras buscadas dentro de un texto. */
function resaltar(texto, query) {
  const tokens = Importador.normalizar(query).split(' ').filter(t => t.length >= 2);
  const original = String(texto);
  if (!tokens.length) return esc(original);
  const plegado = [...original].map(ch => (ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] || ' ')).join('');
  const marcas = new Array(original.length).fill(false);
  for (const t of tokens) {
    let i = plegado.indexOf(t);
    while (i >= 0) {
      const inicioPalabra = i === 0 || !/[a-z0-9]/.test(plegado[i - 1]);
      if (t.length > 3 || inicioPalabra) for (let j = i; j < i + t.length; j++) marcas[j] = true;
      i = plegado.indexOf(t, i + 1);
    }
  }
  let html = '', dentro = false;
  [...original].forEach((ch, i) => {
    if (marcas[i] && !dentro) { html += '<mark>'; dentro = true; }
    if (!marcas[i] && dentro) { html += '</mark>'; dentro = false; }
    html += esc(ch);
  });
  return dentro ? `${html}</mark>` : html;
}

function htmlComboCarrera(sel) {
  const valor = sel ? `${sel.carrera} · ${siglaUni(sel.universidad) || sel.universidad}` : '';
  return `
    <div class="combo" id="combo-carrera">
      <label class="combo-etiqueta" for="combo-input">Carrera a simular <small>(escribe carrera, universidad, sigla o área · ↑ ↓ Enter)</small></label>
      <div class="combo-campo">
        <span class="combo-lupa" aria-hidden="true">⌕</span>
        <input id="combo-input" type="text" role="combobox" autocomplete="off" spellcheck="false" data-combo data-key="combo"
          aria-expanded="false" aria-controls="combo-lista" aria-autocomplete="list" value="${esc(valor)}"
          placeholder="Ej. medicina uc · computación · derecho udp · ingeniería">
        <button type="button" class="combo-btn" data-action="combo-limpiar" title="Limpiar y ver todas las carreras" aria-label="Limpiar búsqueda">×</button>
        <button type="button" class="combo-btn" data-action="combo-alternar" title="Desplegar el catálogo" aria-label="Desplegar lista de carreras">▾</button>
      </div>
      <ul id="combo-lista" class="combo-lista" role="listbox" aria-label="Carreras del catálogo" hidden></ul>
    </div>`;
}

function renderListaCombo() {
  const ul = $('#combo-lista');
  const input = $('#combo-input');
  if (!ul || !input) return;
  ul.hidden = !combo.abierto;
  input.setAttribute('aria-expanded', String(combo.abierto));
  if (!combo.abierto) { input.removeAttribute('aria-activedescendant'); return; }
  combo.resultados = filtrarCarreras(combo.query);
  combo.activo = Calc.limitar(combo.activo, 0, Math.max(0, Math.min(combo.resultados.length, COMBO_MAX) - 1));
  const visibles = combo.resultados.slice(0, COMBO_MAX);
  const seleccion = perfil().admision.seleccion;
  ul.innerHTML = visibles.length ? visibles.map((c, i) => `
    <li id="combo-op-${i}" role="option" class="combo-op ${i === combo.activo ? 'activa' : ''}" aria-selected="${c.id === seleccion}" data-combo-id="${esc(c.id)}">
      <span class="op-carrera">${resaltar(c.carrera, combo.query)}</span>
      <span class="op-uni">${resaltar(siglaUni(c.universidad) ? `${siglaUni(c.universidad)} · ${c.universidad.replace(/\s*\([^)]*\)\s*$/, '')}` : c.universidad, combo.query)}</span>
      <span class="op-corte">${typeof c.corte === 'number' ? `<small>${etiquetaCorte(c)}</small> <strong>${fmtPts(c.corte)}</strong>` : '<small>sin corte</small>'}</span>
    </li>`).join('') + (combo.resultados.length > COMBO_MAX ? `<li class="combo-mas" role="presentation">Mostrando ${COMBO_MAX} de ${combo.resultados.length}: escribe para acotar</li>` : '')
    : '<li class="combo-mas" role="presentation">Sin resultados. Agrégala con “+ Agregar carrera” en el catálogo.</li>';
  if (visibles.length) {
    input.setAttribute('aria-activedescendant', `combo-op-${combo.activo}`);
    $(`#combo-op-${combo.activo}`)?.scrollIntoView({ block: 'nearest' });
  }
}

function abrirCombo(limpiar) {
  if (limpiar) { combo.query = ''; const i = $('#combo-input'); if (i) { i.value = ''; i.focus(); } }
  combo.abierto = true;
  combo.activo = 0;
  renderListaCombo();
}

function cerrarCombo() {
  combo.abierto = false;
  renderListaCombo();
}

function elegirCarrera(id) {
  const p = perfil();
  p.admision.seleccion = id;
  // Tras elegir, el redibujo devuelve el foco al buscador: esa vez NO debe reabrir la lista
  combo = { abierto: false, query: '', activo: 0, resultados: [], sinReabrir: true };
  actualizar();
  setTimeout(() => { combo.sinReabrir = false; }, 400);
}

/* ---------- Perspectiva institucional de la carrera ---------- */

/** Busca la universidad por nombre completo, sigla o parte del nombre (sirve para carreras agregadas a mano). */
function perspectivaUniversidad(nombre) {
  const P = REF.PERSPECTIVAS_UNIVERSIDAD;
  if (P[nombre]) return { nombre, ...P[nombre] };
  const n = Importador.normalizar(nombre);
  if (!n) return null;
  const clave = Object.keys(P).find(k => {
    const sigla = Importador.normalizar(siglaUni(k));
    const base = Importador.normalizar(k.replace(/\s*\([^)]*\)\s*$/, ''));
    return (sigla && (n === sigla || n.split(' ').includes(sigla))) || base === n || (n.length >= 8 && (base.includes(n) || n.includes(base)));
  });
  return clave ? { nombre: clave, ...P[clave] } : null;
}

function htmlPerspectiva(sel) {
  const area = areaCarrera(sel);
  const uni = perspectivaUniversidad(sel.universidad);
  const enfoquePropio = uni?.areas?.[area] || (area === 'informatica' ? uni?.areas?.ingenieria : null);
  const enfoque = enfoquePropio || REF.PERSPECTIVAS_AREA[area];
  const sigla = uni ? siglaUni(uni.nombre) || uni.nombre : sel.universidad;
  return `
    <div class="perspectiva">
      <div class="perspectiva-cab"><span class="perspectiva-icono" aria-hidden="true">🏛</span>
        <strong>Enfoque ${esc(sigla ? `de ${sigla}` : '')} en ${esc(ETIQUETAS_AREA[area] || 'esta área')}</strong>
        <span class="chip">${enfoquePropio ? 'Sello de la institución' : 'Enfoque general del área'}</span></div>
      ${uni ? `<p class="perspectiva-sello">${esc(uni.sello)}</p>` : '<p class="perspectiva-sello muted">No tenemos una descripción de esta institución: se muestra el enfoque general del área.</p>'}
      ${enfoque ? `<p>${esc(enfoque)}</p>` : ''}
      <p class="nota-aviso">Orientativo. Revisa la malla oficial en el sitio de la universidad.</p>
    </div>`;
}

function htmlResultadoPonderado(sel, ef) {
  const r = Calc.puntajePonderado(ef, sel.ponderaciones);
  const req = REF.REQUISITOS_GENERALES;
  const prom = Calc.promedioClM1(ef);
  const faltan = r.faltantes.length ? `<p class="aviso warn">Faltan puntajes para: ${r.faltantes.map(etiquetaComponente).map(esc).join(', ')}.</p>` : '';
  const pesos = r.pesosOk ? '' : `<p class="aviso warn">Las ponderaciones de esta carrera suman ${r.sumaPesos}% (deberían sumar 100%). Edítala en el catálogo.</p>`;

  let comparacion;
  if (typeof sel.corte !== 'number') {
    comparacion = `<div class="aviso">Esta carrera no tiene puntaje de corte cargado. Ingresa el de referencia (último seleccionado del año que elijas):
      <input type="number" min="100" max="1000" step="0.01" data-adm-corte="${sel.id}" placeholder="ej. 750" aria-label="Puntaje de corte"></div>`;
  } else if (r.total === null) {
    comparacion = `<p class="muted">${etiquetaCorte(sel)}: <strong>${fmtPts(sel.corte)}</strong>. Completa los puntajes que faltan para ver tu brecha.</p>`;
  } else {
    const dif = r.total - sel.corte;
    const necesarios = dif >= 0 ? '' : htmlEscenariosCorte(ef, sel);
    comparacion = `
      <div class="comparacion ${dif >= 0 ? 'ok' : 'warn'}">
        <div><small>Tu ponderado</small><div class="grande num">${fmtPts(r.total)}</div></div>
        <div><small>${etiquetaCorte(sel)}</small><div class="grande num">${fmtPts(sel.corte)}</div></div>
        <div><small>Brecha vs ${etiquetaCorte(sel)}</small><div class="grande num">${dif >= 0 ? '+' : ''}${fmtPts(dif)}</div></div>
      </div>
      ${dif >= 0 ? `<p>Con estos puntajes quedarías <strong>${fmtPts(dif)} puntos sobre</strong> el ${etiquetaCorte(sel)}. Recuerda que el corte cambia cada año.</p>`
        : `<p>Te faltan <strong>${fmtPts(-dif)} puntos ponderados</strong> para el ${etiquetaCorte(sel)}. Tres formas de lograrlo:</p>${necesarios}`}`;
  }
  const reqTexto = prom === null ? 'Ingresa CL y M1 para revisar el requisito general.'
    : prom >= req.promedioClM1Min ? `✓ Promedio CL+M1 = ${fmtPts(prom)} (requisito referencial ≥ ${req.promedioClM1Min}).`
    : `Promedio CL+M1 = ${fmtPts(prom)}: bajo el requisito referencial de ${req.promedioClM1Min}.`;
  return `
    <div class="resultado-ponderado">
      <h3>${esc(sel.carrera)} · <span class="muted">${esc(sel.universidad)}</span></h3>
      ${htmlPerspectiva(sel)}
      ${pesos}${faltan}
      ${htmlAportes(r, sel, ef)}
      ${htmlPalancaAdmision(sel, ef)}
      ${comparacion}
      <p class="nota-aviso">${esc(reqTexto)} ${typeof sel.ponderadoMinimo === 'number' ? `Ponderado mínimo de postulación: ${sel.ponderadoMinimo}.` : ''}</p>
      <p class="nota-aviso">Fuente: ${esc(sel.fuente || '—')} <button class="enlace" data-action="editar-corte-sel" data-id="${esc(sel.id)}">Editar corte o ponderaciones</button></p>
    </div>`;
}

function htmlTablaCatalogo() {
  const q = Importador.normalizar(busquedaCatalogo);
  const todas = store.catalogoCortes.filter(c => { const h = textoBusquedaCarrera(c); return !q || q.split(' ').every(t => calzaToken(h, t)); });
  if (!todas.length) return '<p class="muted">Sin resultados. Puedes agregar la carrera con “+ Agregar carrera”.</p>';
  const LIMITE = 150;
  const lista = todas.slice(0, LIMITE);
  const resumenPond = c => Object.entries(c.ponderaciones || {}).filter(([, w]) => w > 0)
    .map(([k, w]) => `${{ nem: 'NEM', ranking: 'Rk', cl: 'CL', m1: 'M1', m2: 'M2', ciencias: 'Cs', historia: 'Hi', electiva: 'Cs/Hi' }[k] || k} ${w}`).join(' · ');
  return `<table class="tabla tabla-catalogo">
    <thead><tr><th>Carrera</th><th>Ponderaciones (%)</th><th>Corte</th><th></th></tr></thead>
    <tbody>${lista.map(c => `
      <tr data-corte="${c.id}">
        <td><strong>${esc(c.carrera)}</strong><br><small>${esc(c.universidad)}</small></td>
        <td><small>${esc(resumenPond(c))}</small></td>
        <td class="num">${typeof c.corte === 'number' ? fmtPts(c.corte) : '<small>sin dato</small>'}${c.anio ? `<br><small>${String(c.anio) === '2026' ? 'Corte 2026' : esc(c.anio)}</small>` : ''}</td>
        <td class="acciones-fila">
          <button class="btn ghost sm" data-action="simular-corte">Simular</button>
          <button class="btn ghost sm" data-action="editar-corte">Editar</button>
          <button class="icono" data-action="eliminar-corte" aria-label="Eliminar carrera">✕</button>
        </td>
      </tr>`).join('')}</tbody></table>${todas.length > LIMITE ? `<p class="nota-aviso">Mostrando ${LIMITE} de ${todas.length}: escribe para filtrar.</p>` : `<p class="nota-aviso">${todas.length} carrera(s).</p>`}`;
}

let corteEditando = null;
function abrirEditorCorte(id) {
  const c = id ? store.catalogoCortes.find(x => x.id === id) : {
    id: null, universidad: '', carrera: '', ponderaciones: {}, corte: null, anio: '', ponderadoMinimo: null, notas: '', fuente: 'Ingresado por el estudiante',
  };
  corteEditando = id;
  const pond = REF.COMPONENTES_ADMISION.map(([k, et]) =>
    `<label>${esc(et)}<div class="input-sufijo"><input type="number" name="w-${k}" min="0" max="100" step="1" value="${c.ponderaciones[k] || ''}" placeholder="0"><span>%</span></div></label>`).join('');
  $('#form-corte').innerHTML = `
    <h2>${id ? 'Editar carrera' : 'Agregar carrera'}</h2>
    <div class="form-fila">
      <label>Universidad <input name="universidad" list="dl-universidades" value="${esc(c.universidad)}" required></label>
      <label>Carrera <input name="carrera" list="dl-carreras-pref" value="${esc(c.carrera)}" required></label>
    </div>
    <div class="form-fila">
      <label>Área (para el enfoque institucional)
        <select name="area">${opts([['', 'Detectar por el nombre'], ...Object.entries(ETIQUETAS_AREA)], c.area || '')}</select>
      </label>
      <p class="nota-aviso">Con la universidad y el área se muestra una descripción orientativa de cómo esa institución aborda la carrera.</p>
    </div>
    <fieldset><legend>Ponderaciones (deben sumar 100%)</legend><div class="grilla-puntajes">${pond}</div>
      <p class="nota-aviso" id="corte-suma"></p></fieldset>
    <div class="form-fila3">
      <label>Puntaje de corte <input name="corte" type="number" min="100" max="1000" step="0.01" value="${c.corte ?? ''}" placeholder="último seleccionado"></label>
      <label>Año de referencia <input name="anio" value="${esc(c.anio ?? '')}" placeholder="ej. Admisión 2026"></label>
      <label>Ponderado mínimo <input name="ponderadoMinimo" type="number" min="100" max="1000" step="1" value="${c.ponderadoMinimo ?? ''}"></label>
    </div>
    <label>Fuente <input name="fuente" value="${esc(c.fuente)}" placeholder="ej. acceso.mineduc.cl, oferta 2026"></label>
    <label>Notas / otros requisitos <input name="notas" value="${esc(c.notas)}" placeholder="ej. prueba especial, cupos…"></label>
    <p class="error" id="corte-error" role="alert"></p>
    <div class="fila-botones">
      <button type="button" class="btn ghost" data-action="cerrar-dialogo">Cancelar</button>
      <button type="submit" class="btn primario">Guardar</button>
    </div>`;
  actualizarSumaPonderaciones();
  $('#dlg-corte').showModal();
}
function actualizarSumaPonderaciones() {
  const f = $('#form-corte');
  const suma = REF.COMPONENTES_ADMISION.reduce((s, [k]) => s + (Number(f[`w-${k}`].value) || 0), 0);
  const el = $('#corte-suma');
  el.textContent = `Suma actual: ${suma}%${Math.abs(suma - 100) < 0.01 ? ' ✓' : ' (debe ser 100%)'}`;
  el.className = `nota-aviso ${Math.abs(suma - 100) < 0.01 ? 'ok-texto' : 'warn-texto'}`;
}
function guardarCorte(f) {
  const d = new FormData(f);
  const num = v => (v === '' || v === null ? null : Number(v));
  const ponderaciones = {};
  REF.COMPONENTES_ADMISION.forEach(([k]) => { const w = Number(d.get(`w-${k}`)) || 0; if (w > 0) ponderaciones[k] = w; });
  const datos = {
    universidad: String(d.get('universidad')).trim(), carrera: String(d.get('carrera')).trim(), ponderaciones,
    corte: num(d.get('corte')), anio: String(d.get('anio') || '').trim(), ponderadoMinimo: num(d.get('ponderadoMinimo')),
    fuente: String(d.get('fuente') || '').trim() || 'Ingresado por el estudiante', notas: String(d.get('notas') || '').trim(),
    area: ETIQUETAS_AREA[d.get('area')] ? d.get('area') : undefined,
  };
  if (!datos.universidad || !datos.carrera) { $('#corte-error').textContent = 'Completa universidad y carrera.'; return; }
  if (corteEditando) {
    const c = store.catalogoCortes.find(x => x.id === corteEditando);
    if (c.fuente === REF.FUENTE_ILUSTRATIVA && datos.fuente === REF.FUENTE_ILUSTRATIVA) datos.fuente = `Editado por el estudiante (${hoy()}) a partir de la plantilla ilustrativa`;
    Object.assign(c, datos);
  } else {
    store.catalogoCortes.push({ id: uid(), ...datos });
  }
  $('#dlg-corte').close();
  actualizar();
  toast('Carrera guardada en el catálogo');
}

/** Acepta un arreglo de carreras o { catalogo: [...] }; valida campos mínimos. */
function importarCatalogo(texto) {
  const j = JSON.parse(texto);
  const lista = Array.isArray(j) ? j : j.catalogo;
  if (!Array.isArray(lista)) throw new Error('se esperaba un arreglo de carreras');
  // v25: cada carrera pasa por la misma validación estricta que el catálogo guardado (ids seguros, rangos, largos)
  const usados = new Set(store.catalogoCortes.map(x => x.id));
  const validas = lista.slice(0, 3000).filter(c => esObjeto(c) && typeof c.universidad === 'string' && typeof c.carrera === 'string' && c.universidad.trim() && c.carrera.trim())
    .map(c => carreraCatalogoSana({
      ...c,
      ponderaciones: Object.fromEntries(Object.entries(esObjeto(c.ponderaciones) ? c.ponderaciones : {}).filter(([k, w]) => Calc.COMPONENTES_ADMISION.includes(k) && typeof w === 'number' && w > 0)),
      fuente: c.fuente || 'Importado por el estudiante',
    }, usados)).filter(Boolean);
  if (!validas.length) throw new Error('no se encontraron carreras válidas (requieren universidad y carrera)');
  return validas;
}

/* =========================================================
 * 5. Diálogos: perfil, currículum y malla
 * ========================================================= */

let dlgPerfilNuevo = false;

function abrirPerfil(nuevo = false) {
  dlgPerfilNuevo = nuevo;
  const p = nuevo ? nuevoPerfil('Nuevo perfil') : perfil();
  const f = $('#form-perfil');
  f.innerHTML = `
    <h2>${nuevo ? 'Nuevo perfil' : 'Perfil del estudiante'}</h2>
    <label>Nombre del perfil <input name="nombre" value="${esc(p.nombre)}" required maxlength="50"></label>
    <div class="form-fila">
      <label>Modalidad <select name="modalidad">${opts(Object.entries(MODALIDADES), p.modalidad)}</select></label>
      <label class="solo-escolar">Nivel <select name="nivel"></select></label>
    </div>
    <label class="solo-tp">Especialidad TP
      <select name="especialidad"><option value="">— Sin definir —</option>${opts(Object.keys(REF.ESPECIALIDADES_TP).map(k => [k, k]), p.especialidad)}</select>
    </label>
    <div class="solo-uni form-grupo">
      <label>Universidad <input name="universidad" list="dl-universidades" value="${esc(p.uni.universidad)}" placeholder="Escribe para buscar…"></label>
      <label>Carrera <input name="carrera" list="dl-carreras" value="${esc(p.uni.carrera)}" placeholder="Escribe para buscar…"></label>
      <div class="form-fila">
        <label>Año en curso <select name="anio">${opts([1, 2, 3, 4, 5, 6, 7].map(n => [n, `${n}° año`]), p.uni.anio)}</select></label>
        <label>Semestre <select name="semestre">${opts([[1, '1° semestre'], [2, '2° semestre']], p.uni.semestre)}</select></label>
      </div>
    </div>
    <label class="solo-escolar">Carrera preferida (tu motivación) <input name="carreraPreferida" list="dl-carreras-pref" value="${esc(p.carreraPreferida || '')}" maxlength="80" placeholder="Ej. Medicina, Ingeniería Civil, Diseño…"></label>
    <label>Régimen de períodos <select name="regimen">${opts(Object.entries(REGIMENES).map(([k, r]) => [k, r.etiqueta]), p.regimen)}</select></label>
    <fieldset><legend>Escala de notas</legend>
      <div class="form-fila3">
        <label>Mínima <input name="min" type="text" inputmode="decimal" step="0.1" value="${p.escala.min}" required></label>
        <label>Máxima <input name="max" type="text" inputmode="decimal" step="0.1" value="${p.escala.max}" required></label>
        <label>Aprobación <input name="aprobacion" type="text" inputmode="decimal" step="0.1" value="${p.escala.aprobacion}" required></label>
      </div>
    </fieldset>
    <p class="error" id="perfil-error" role="alert"></p>
    <div class="fila-botones">
      ${nuevo ? '' : '<button type="button" class="btn ghost peligro" data-action="eliminar-perfil">Eliminar perfil</button><span class="espaciador"></span>'}
      <button type="button" class="btn ghost" data-action="cerrar-dialogo">Cancelar</button>
      <button type="submit" class="btn primario">${nuevo ? 'Crear perfil' : 'Guardar'}</button>
    </div>`;
  f.dataset.modalidad = p.modalidad;
  llenarNiveles(f, p.nivel);
  $('#dlg-perfil').showModal();
}

function llenarNiveles(f, actual) {
  const lista = f.modalidad.value === 'tp' ? REF.NIVELES_TP : REF.NIVELES_ESCOLARES;
  f.nivel.innerHTML = opts(lista, lista.some(([k]) => k === actual) ? actual : '1M');
}

function cambiarRegimen(p, regimen) {
  const r = REGIMENES[regimen];
  p.periodos.forEach((x, i) => { x.nombre = `${r.nombre} ${i + 1}`; });
  while (p.periodos.length < r.cantidad) p.periodos.push({ id: uid(), nombre: `${r.nombre} ${p.periodos.length + 1}` });
  p.regimen = regimen;
}

function guardarPerfil(f) {
  const d = new FormData(f);
  const num = k => Number(String(d.get(k)).replace(',', '.'));
  const min = num('min'), max = num('max'), aprobacion = num('aprobacion');
  const err = $('#perfil-error');
  if (![min, max, aprobacion].every(Number.isFinite) || !(min < aprobacion && aprobacion <= max)) {
    err.textContent = 'Escala inválida: debe cumplirse mínima < aprobación ≤ máxima.';
    return;
  }
  const nombre = String(d.get('nombre')).trim();
  if (!nombre) { err.textContent = 'El perfil necesita un nombre.'; return; }
  const p = dlgPerfilNuevo ? nuevoPerfil(nombre) : perfil();
  p.nombre = nombre;
  p.modalidad = d.get('modalidad');
  p.nivel = d.get('nivel') || p.nivel;
  p.especialidad = d.get('especialidad') || '';
  p.uni.universidad = String(d.get('universidad') || '').trim();
  p.uni.carrera = String(d.get('carrera') || '').trim();
  p.uni.anio = Number(d.get('anio')) || 1;
  p.uni.semestre = Number(d.get('semestre')) || 1;
  p.carreraPreferida = String(d.get('carreraPreferida') || '').trim().slice(0, 80);
  p.escala = { min, max, aprobacion };
  if (d.get('regimen') !== p.regimen) cambiarRegimen(p, d.get('regimen'));
  if (dlgPerfilNuevo) { store.perfiles.push(p); store.perfilActivo = p.id; }
  sim = {}; simNEM = null;
  $('#dlg-perfil').close();
  actualizar();
  toast(dlgPerfilNuevo ? `Perfil “${nombre}” creado` : 'Perfil guardado');
  volverAGuia();   // v16: si se abrió desde la guía, vuelve al mismo paso
  if (dlgPerfilNuevo) setTimeout(() => abrirGuia('inicio'), 250);
}

/* ---------- Currículum escolar ---------- */

function abrirCurriculo() {
  const p = perfil();
  if (!esEscolar(p)) { toast('El currículum escolar aplica a perfiles escolares'); return; }
  const destino = esConsolidado() ? p.periodos[0].id : p.periodoActivo;
  const secciones = REF.seccionesCurriculo(p.modalidad, p.nivel, p.especialidad);
  $('#curriculo-cuerpo').innerHTML = `
    <h2>Asignaturas del currículum</h2>
    <p class="muted">${esc(MODALIDADES[p.modalidad])} · ${esc(etiquetaNivel(p))}. Lista referencial basada en las Bases Curriculares; tu colegio puede tener variaciones.</p>
    <div class="form-fila">
      <label>Agregar al período <select id="cur-periodo">${opts(p.periodos.map(x => [x.id, x.nombre]), destino)}</select></label>
      <label>Meta promedio general <small>(opcional)</small>
        <input id="cur-meta" type="text" inputmode="decimal" step="0.1" min="${p.escala.min}" max="${p.escala.max}" value="" placeholder="Ej: ${String(metaPorDefecto(p)).replace('.', ',')}" autocomplete="off"></label>
    </div>
    <p class="nota-aviso">La meta promedio general es para el promedio de <strong>todas</strong> las asignaturas del período: <strong>no se copia</strong> a cada una.
      Junto a cada materia puedes escribir su meta (ej. 6,0) o dejarla vacía y definirla después. Si el promedio de tus metas queda bajo la meta general, te avisaré.</p>
    <div id="cur-secciones">${htmlSeccionesCurriculo(secciones, destino)}</div>
    <div class="fila-botones">
      <button type="button" class="btn ghost" data-action="cerrar-dialogo">Cancelar</button>
      <button type="button" class="btn primario" data-action="agregar-curriculo">Agregar seleccionadas</button>
    </div>`;
  $('#dlg-curriculo').showModal();
}

function htmlSeccionesCurriculo(secciones, periodoId) {
  const existentes = new Set(perfil().asignaturas.filter(a => a.periodoId === periodoId).map(a => a.nombre.trim().toLowerCase()));
  const casilla = (s, nombre) => {
    const ya = existentes.has(nombre.toLowerCase());
    return `<div class="fila-cur ${ya ? 'deshabilitado' : ''}"><label class="check-label"><input type="checkbox" data-cur="${esc(nombre)}" ${ya ? 'disabled' : s.marcar ? 'checked' : ''}> ${esc(nombre)}${ya ? ' <small>(ya agregada)</small>' : ''}</label>
      ${ya ? '' : `<input class="meta-fila" type="text" inputmode="decimal" data-cur-meta="${esc(nombre)}" placeholder="meta" aria-label="Meta para ${esc(nombre)} (opcional)" title="Opcional: la nota que quieres lograr en esta materia">`}</div>`;
  };
  return secciones.map(s => {
    // Misma mecánica de selección; solo se agrupan visualmente por área / naturaleza
    const grupos = new Map();
    for (const nombre of s.items) {
      const a = areaCurricular(nombre);
      if (!grupos.has(a.area)) grupos.set(a.area, { ...a, items: [] });
      grupos.get(a.area).items.push(nombre);
    }
    const orden = [...REF.AREAS_CURRICULO, REF.AREA_OTRAS].map(x => x.area);
    const bloques = [...grupos.values()].sort((x, y) => orden.indexOf(x.area) - orden.indexOf(y.area)).map(g => `
      <div class="area-cur">
        <div class="area-titulo"><span aria-hidden="true">${g.icono}</span> ${esc(g.area)} <small>${g.items.length}</small></div>
        <div class="grilla-check">${g.items.map(n => casilla(s, n)).join('')}</div>
      </div>`).join('');
    return `
    <fieldset class="seccion-cur"><legend>${esc(s.titulo)}</legend>
      ${s.aviso ? `<p class="nota-aviso">${esc(s.aviso)}</p>` : ''}
      ${bloques}
    </fieldset>`;
  }).join('');
}

/** Área curricular de una asignatura: por categoría de materia y, si no, por palabras clave. */
function areaCurricular(nombre) {
  const cats = Importador.categoriasDe(nombre);
  const tema = Importador.inferirTema([nombre])?.categoria;
  if (tema) cats.add(tema);
  const norm = ` ${Importador.normalizar(nombre)} `;
  return REF.AREAS_CURRICULO.find(a => a.categorias.some(c => cats.has(c)))
    || REF.AREAS_CURRICULO.find(a => a.palabras.some(p => norm.includes(` ${p}`)))
    || REF.AREA_OTRAS;
}

function agregarDesdeCurriculo() {
  const p = perfil();
  const periodoId = $('#cur-periodo').value;
  // v12: la meta escrita es la META PROMEDIO GENERAL del período (opcional); no se copia a las asignaturas
  const textoMeta = $('#cur-meta').value.trim();
  const metaGeneral = textoMeta ? leerNota(textoMeta) : null;
  if (textoMeta && (metaGeneral === null || Number.isNaN(metaGeneral))) { toast(`La meta promedio general debe estar entre ${p.escala.min} y ${p.escala.max} (o déjala vacía)`); return; }
  const lista = [...document.querySelectorAll('#cur-secciones [data-cur]:checked:not(:disabled)')].map(c => c.dataset.cur);
  const antes = new Set(p.asignaturas.map(a => a.id));
  // Meta por fila (opcional): vacía = sin meta; inválida = se avisa y no se agrega nada
  const metasFila = {};
  for (const inp of document.querySelectorAll('#cur-secciones [data-cur-meta]')) {
    const t2 = inp.value.trim();
    if (!t2) continue;
    const m = leerNota(t2);
    if (m === null || Number.isNaN(m)) { toast(`La meta de “${inp.dataset.curMeta}” debe estar entre ${p.escala.min} y ${p.escala.max}`); inp.focus(); return; }
    metasFila[inp.dataset.curMeta] = m;
  }
  const n = agregarAsignaturas(lista, periodoId, nombre => metasFila[nombre] ?? metaInicialAsignatura(p));
  if (metaGeneral !== null) p.metaGeneral.periodos[periodoId] = metaGeneral;
  $('#dlg-curriculo').close();
  mostrarAgregadas(p, periodoId, antes);
  toast(n ? `Se agregaron ${n} asignatura(s)${metaGeneral !== null ? ` · meta promedio general ${String(metaGeneral).replace('.', ',')}` : ''}` : 'No había asignaturas nuevas que agregar');
}

/** v14: las asignaturas cargadas en bloque NO asumen meta (se define por fila o después). */
const metaInicialAsignatura = () => null;

/**
 * (v12) Tras agregar en bloque: guarda y redibuja EN EL ACTO (sin esperar al render diferido),
 * va a la vista de notas del período de destino y selecciona la primera asignatura nueva.
 */
function mostrarAgregadas(p, periodoId, idsAntes) {
  const nuevas = p.asignaturas.filter(a => !idsAntes.has(a.id));
  store.vista = 'notas';
  p.periodoActivo = periodoId;
  if (nuevas.length) { p.seleccionada = nuevas[0].id; animar.asig = nuevas[0].id; }
  guardar();
  render();
}

/* ---------- Asignaturas duplicadas (v8) ---------- */

/** Asignatura del período con el mismo nombre normalizado (sin tildes, mayúsculas ni puntuación). */
function buscarDuplicada(nombre, periodoId, excluirId = null) {
  const clave = Calc.claveAsignatura(nombre);
  if (!clave) return null;
  return perfil().asignaturas.find(a => a.periodoId === periodoId && a.id !== excluirId && Calc.claveAsignatura(a.nombre) === clave) || null;
}

/** Grupos de asignaturas repetidas dentro de un mismo período: [[a, b], …] (para el aviso de la lista). */
function gruposDuplicados() {
  const mapa = new Map();
  for (const a of perfil().asignaturas) {
    const k = `${a.periodoId}|${Calc.claveAsignatura(a.nombre)}`;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(a);
  }
  return [...mapa.values()].filter(g => g.length > 1);
}

/**
 * Une "origen" dentro de "destino": evaluaciones, checklist (sin repetir) y décimas.
 * Se conserva la meta, el nombre y el estado de cierre de "destino". Reversible con Deshacer.
 */
function unificarAsignaturas(destino, origen) {
  const p = perfil();
  destino.evaluaciones.push(...origen.evaluaciones);
  const tareas = new Set((destino.checklist || []).map(c => Calc.claveAsignatura(c.texto)));
  for (const c of origen.checklist || []) if (!tareas.has(Calc.claveAsignatura(c.texto))) destino.checklist.push(c);
  if (origen.decimas?.length) destino.decimas = [...(destino.decimas || []), ...origen.decimas];
  if (!destino.creditos && origen.creditos) destino.creditos = origen.creditos;
  p.asignaturas = p.asignaturas.filter(a => a.id !== origen.id);
  delete sim[origen.id];
  delete sim[destino.id];
  p.seleccionada = destino.id;
}

/** Si la asignatura choca con otra del mismo período, ofrece unificarlas (toast con acción). */
function ofrecerUnificar(asig) {
  const otra = buscarDuplicada(asig.nombre, asig.periodoId, asig.id);
  if (!otra) return false;
  toast(`“${otra.nombre}” ya existe en ${nombrePeriodo(asig.periodoId)}.`, {
    etiqueta: 'Unificar',
    fn: () => conDeshacer(`Unificadas en “${otra.nombre}”`, () => unificarAsignaturas(otra, asig)),
  }, { duracion: 9000 });
  return true;
}

/** Agrega asignaturas a un período sin duplicar nombres. Devuelve cuántas agregó. */
function agregarAsignaturas(lista, periodoId, meta) {
  const p = perfil();
  const existentes = new Set(p.asignaturas.filter(a => a.periodoId === periodoId).map(a => Calc.claveAsignatura(a.nombre)));
  let n = 0;
  for (const nombre of lista) {
    const clave = Calc.claveAsignatura(nombre);
    if (!clave || existentes.has(clave)) continue;
    existentes.add(clave);
    p.asignaturas.push({ id: uid(), nombre: nombre.trim(), meta: typeof meta === 'function' ? meta(nombre) : meta, periodoId, evaluaciones: [], checklist: [], decimas: [] });
    n++;
  }
  return n;
}

/* ---------- Malla curricular ---------- */

function abrirMalla() {
  renderMalla();
  $('#dlg-malla').showModal();
}

function renderMalla() {
  const p = perfil();
  const m = p.uni.malla;
  const destino = esConsolidado() ? p.periodos.at(-1).id : p.periodoActivo;
  const cabecera = `
    <h2>Malla curricular</h2>
    <div class="form-fila">
      <label>Universidad <input id="malla-uni" list="dl-universidades" value="${esc(m?.universidad || p.uni.universidad)}" placeholder="Escribe para buscar…"></label>
      <label>Carrera <input id="malla-carrera" list="dl-carreras" value="${esc(m?.carrera || p.uni.carrera)}" placeholder="Escribe para buscar…"></label>
    </div>
    <div class="fila-botones inicio">
      <button type="button" class="btn primario sm" data-action="cargar-malla">${m ? 'Reemplazar con malla referencial' : 'Cargar malla referencial'}</button>
      <button type="button" class="btn ghost sm" data-action="malla-vacia">Empezar malla en blanco</button>
    </div>`;
  if (!m) {
    $('#malla-cuerpo').innerHTML = `${cabecera}
      <p class="muted">Carreras con plantilla disponible: ${Object.keys(REF.MALLAS).map(esc).join(', ')}.
      Las plantillas son genéricas (no oficiales de cada universidad): cárgala y edítala con los ramos reales de tu plan.</p>
      ${htmlImportarMalla()}
      <div class="fila-botones"><button type="button" class="btn ghost" data-action="cerrar-dialogo">Cerrar</button></div>`;
    return;
  }
  const semestres = m.semestres.map((s, i) => `
    <div class="sem-card">
      <div class="sem-cab">
        <input data-malla-sem="${i}" data-key="malla-sem-${i}" value="${esc(s.nombre)}" aria-label="Nombre del semestre">
        <button type="button" class="icono" data-action="malla-del-sem" data-sem="${i}" title="Eliminar semestre" aria-label="Eliminar semestre">✕</button>
      </div>
      ${s.ramos.map((r, j) => `
        <div class="ramo-fila">
          <input data-malla-ramo="${i}:${j}" data-key="malla-ramo-${i}-${j}" value="${esc(r.nombre)}" aria-label="Ramo">
          <button type="button" class="icono" data-action="malla-del-ramo" data-sem="${i}" data-ramo="${j}" aria-label="Eliminar ramo">✕</button>
        </div>`).join('')}
      <div class="sem-acciones">
        <button type="button" class="btn ghost sm" data-action="malla-add-ramo" data-sem="${i}">+ Ramo</button>
        <button type="button" class="btn sm" data-action="malla-a-asignaturas" data-sem="${i}">Usar como asignaturas</button>
      </div>
    </div>`).join('');
  $('#malla-cuerpo').innerHTML = `${cabecera}
    <div class="malla-info">
      <strong>${esc(m.universidad || 'Universidad sin definir')} · ${esc(m.carrera || 'Carrera sin definir')}</strong><br>
      <small>Fuente: ${esc(m.fuente)} · versión ${esc(m.version)} · última actualización ${esc(m.actualizada)}</small><br>
      <small>Las plantillas son referenciales: usa <strong>Actualizar / Editar malla</strong> para dejarla igual a tu plan vigente.</small>
    </div>
    <p class="nota-aviso">“Usar como asignaturas” agrega los ramos al período <strong>${esc(nombrePeriodo(destino))}</strong> (sin duplicar).</p>
    <div class="malla-grid">${semestres}
      <button type="button" class="sem-card sem-nuevo" data-action="malla-add-sem">+ Agregar semestre</button>
    </div>
    <details class="malla-io"><summary>Actualizar / Editar malla: importar o exportar</summary>${htmlImportarMalla()}</details>
    <div class="fila-botones"><button type="button" class="btn ghost" data-action="cerrar-dialogo">Cerrar</button></div>`;
}

function htmlImportarMalla() {
  return `
    <div class="form-import">
      <textarea id="malla-texto" rows="6" placeholder="Pega JSON exportado, o texto:&#10;Semestre 1&#10;Cálculo I&#10;Álgebra&#10;Semestre 2&#10;Cálculo II | Física I"></textarea>
      <div class="fila-botones inicio">
        <button type="button" class="btn primario sm" data-action="malla-importar">Importar</button>
        <button type="button" class="btn ghost sm" data-action="malla-exportar">Exportar JSON</button>
      </div>
    </div>`;
}

function marcarMallaEditada(m) {
  m.actualizada = hoy();
  if (!m.fuente.includes('editada')) m.fuente += ' · editada por el estudiante';
}

/** Importa malla desde JSON o texto (líneas "Semestre N" abren semestre; el resto son ramos). */
function parsearMalla(texto) {
  const t = texto.trim();
  if (!t) return null;
  if (t.startsWith('{')) {
    const j = JSON.parse(t);
    if (!Array.isArray(j.semestres)) throw new Error('El JSON no tiene "semestres"');
    return {
      ...j,
      semestres: j.semestres.map((s, i) => ({
        nombre: String(s.nombre || `Semestre ${i + 1}`),
        ramos: (s.ramos || []).map(r => ({ nombre: String(typeof r === 'string' ? r : r.nombre) })),
      })),
    };
  }
  const semestres = [];
  for (const linea of t.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    if (/^(semestre|año|ano|nivel|trimestre)\b/i.test(linea) || linea.endsWith(':')) {
      semestres.push({ nombre: linea.replace(/:$/, ''), ramos: [] });
    } else {
      if (!semestres.length) semestres.push({ nombre: 'Semestre 1', ramos: [] });
      linea.split(/[|;]/).map(x => x.trim()).filter(Boolean).forEach(nombre => semestres.at(-1).ramos.push({ nombre }));
    }
  }
  return { semestres };
}

/* ---------- Gestión de perfiles y papelera (selección múltiple) ---------- */

function abrirGestion(tab = 'perfiles') {
  gestion = { tab, sel: new Set() };
  renderGestion();
  const dlg = $('#dlg-perfiles');
  if (!dlg.open) dlg.showModal();
}

const fechaCorta = ts => new Date(ts).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Días que le quedan a un perfil en la papelera antes de la eliminación automática. */
function diasRestantes(p) {
  return Math.ceil((p.eliminadoEn + store.config.diasPapelera * MS_DIA - Date.now()) / MS_DIA);
}

function renderGestion() {
  const enPapelera = gestion.tab === 'papelera';
  const lista = enPapelera ? store.papelera : store.perfiles;
  // Limpia selecciones de perfiles que ya no están en la lista
  gestion.sel = new Set([...gestion.sel].filter(id => lista.some(p => p.id === id)));
  const n = gestion.sel.size;
  const filas = lista.map(p => {
    const sub = enPapelera
      ? (() => {
        const d = diasRestantes(p);
        return `Enviado el ${fechaCorta(p.eliminadoEn)} · ${d > 0 ? `se elimina en ${d} día(s)` : 'se eliminará al volver a abrir la app'}`;
      })()
      : `${esc(contextoPerfil(p))} · ${p.asignaturas.length} asignatura(s)${p.id === store.perfilActivo ? ' · <strong>activo</strong>' : ''}`;
    return `
      <label class="fila-gestion ${gestion.sel.has(p.id) ? 'sel' : ''}">
        <input type="checkbox" data-gestion-sel="${p.id}" ${gestion.sel.has(p.id) ? 'checked' : ''}>
        <span><strong>${esc(p.nombre)}</strong><small>${sub}</small></span>
      </label>`;
  }).join('');
  const todos = lista.length > 0 && n === lista.length;
  const acciones = enPapelera
    ? `<button type="button" class="btn" data-action="papelera-restaurar" ${n ? '' : 'disabled'}>Restaurar${n ? ` (${n})` : ''}</button>
       <button type="button" class="btn peligro" data-action="papelera-eliminar" ${n ? '' : 'disabled'}>Eliminar definitivamente${n ? ` (${n})` : ''}</button>
       <span class="espaciador"></span>
       <button type="button" class="btn ghost peligro" data-action="papelera-vaciar" ${lista.length ? '' : 'disabled'}>Vaciar papelera</button>`
    : `<span class="espaciador"></span>
       <button type="button" class="btn peligro" data-action="enviar-papelera" ${n ? '' : 'disabled'}>Enviar a la papelera${n ? ` (${n})` : ''}</button>`;
  $('#perfiles-cuerpo').innerHTML = `
    <div class="seccion-cab"><h2>Perfiles</h2><button type="button" class="btn ghost sm" data-action="cerrar-dialogo">Cerrar ✕</button></div>
    <div class="segmentado" role="tablist">
      <button type="button" class="seg ${enPapelera ? '' : 'activa'}" data-action="gestion-tab" data-tab="perfiles">Mis perfiles (${store.perfiles.length})</button>
      <button type="button" class="seg ${enPapelera ? 'activa' : ''}" data-action="gestion-tab" data-tab="papelera">Papelera (${store.papelera.length})</button>
    </div>
    ${enPapelera ? `
      <div class="papelera-config">
        <p class="nota-aviso">Los perfiles de la papelera se eliminan automáticamente al abrir la app cuando superan el plazo.</p>
        <label class="campo-linea">Eliminar después de
          <select data-gestion-dias>${opts(DIAS_PAPELERA.map(d => [d, `${d} días`]), store.config.diasPapelera)}</select>
        </label>
      </div>` : `<button type="button" class="btn-nuevo-perfil" data-action="nuevo-perfil">
        <span class="icono-mas" aria-hidden="true">＋</span>
        <span><strong>Crear perfil nuevo</strong><small>Para otro año, otra persona o una etapa distinta (escolar o universitaria). Tus perfiles actuales no cambian.</small></span>
      </button>
      <p class="nota-aviso">Marca uno o varios perfiles para enviarlos a la papelera. Siempre queda al menos un perfil activo.</p>`}
    ${lista.length ? `
      <label class="check-label seleccionar-todos"><input type="checkbox" data-gestion-todos ${todos ? 'checked' : ''}> Seleccionar todos</label>
      <div class="lista-gestion">${filas}</div>`
      : `<p class="muted vacio-lista">${enPapelera ? 'La papelera está vacía.' : 'No hay perfiles.'}</p>`}
    <div class="fila-botones">${acciones}</div>`;
}

function cambioGestion(t) {
  const lista = gestion.tab === 'papelera' ? store.papelera : store.perfiles;
  if (t.dataset.gestionSel) {
    if (t.checked) gestion.sel.add(t.dataset.gestionSel); else gestion.sel.delete(t.dataset.gestionSel);
  } else if (t.dataset.gestionTodos !== undefined) {
    gestion.sel = t.checked ? new Set(lista.map(p => p.id)) : new Set();
  } else if (t.dataset.gestionDias !== undefined) {
    store.config.diasPapelera = Number(t.value);
    guardar();
    toast(`Los perfiles se eliminarán tras ${t.value} días en la papelera`);
  }
  renderGestion();
}

/** Envía perfiles a la papelera (con fecha `eliminadoEn`), dejando siempre al menos uno activo. */
function enviarAPapelera(ids) {
  const set = new Set(ids);
  if (!set.size) return;
  if (store.perfiles.every(p => set.has(p.id))) { toast('Debe quedar al menos un perfil activo: deja uno sin marcar'); return; }
  const nombresP = store.perfiles.filter(p => set.has(p.id)).map(p => p.nombre);
  conDeshacer(set.size === 1 ? `“${nombresP[0]}” enviado a la papelera` : `${set.size} perfiles enviados a la papelera`, () => {
    const ahora = Date.now();
    store.papelera.push(...store.perfiles.filter(p => set.has(p.id)).map(p => ({ ...p, eliminadoEn: ahora })));
    store.perfiles = store.perfiles.filter(p => !set.has(p.id));
    if (!store.perfiles.some(p => p.id === store.perfilActivo)) store.perfilActivo = store.perfiles[0].id;
  });
  sim = {}; simNEM = null;
}

function restaurarDePapelera(ids) {
  const set = new Set(ids);
  conDeshacer(`${set.size} perfil(es) restaurado(s)`, () => {
    const volver = store.papelera.filter(p => set.has(p.id)).map(({ eliminadoEn, ...p }) => p);
    store.papelera = store.papelera.filter(p => !set.has(p.id));
    store.perfiles.push(...volver);
  });
}

function eliminarDefinitivo(ids, mensajeConfirmacion) {
  const set = new Set(ids);
  if (!set.size || !confirm(mensajeConfirmacion)) return;
  conDeshacer(`${set.size} perfil(es) eliminado(s) definitivamente`, () => {
    store.papelera = store.papelera.filter(p => !set.has(p.id));
  });
}

/* =========================================================
 * 6. Importar notas desde foto (siempre con confirmación)
 * ========================================================= */

function abrirImportarFoto() {
  // destinoPrevio: '__auto' (detectar desde la imagen), id de asignatura o '__nueva'
  const sel = asigSeleccionada();
  importacion = { imagenURL: null, texto: '', estado: '', grupos: null, avisos: [], destinoPrevio: '__auto', nuevaPrevia: '', modoPeso: 'auto' };
  if (sel && materiasDestino().some(([v]) => v === sel.id)) importacion.sugerida = sel.id;
  renderImportar();
  $('#dlg-foto').showModal();
}

function ocrDisponible() {
  if ('TextDetector' in window) return 'Tu navegador tiene reconocimiento de texto integrado.';
  if (store.config.ocrTesseract) return 'Se usará Tesseract.js (se descarga la primera vez desde jsDelivr).';
  return 'Tu navegador no trae OCR integrado. Activa el OCR opcional o pega el texto (por ejemplo, copiado con Google Lens o Texto en vivo del celular).';
}

function renderImportar() {
  const imp = importacion;
  const cuerpo = $('#foto-cuerpo');
  if (!imp.grupos) {
    cuerpo.innerHTML = `
      <h2>Importar notas</h2>
      <p class="muted">Sube una foto o PDF, o pega una imagen (Ctrl+V). Nada se guarda sin confirmar.</p>
      <div class="form-fila destino-previo">
        <label>¿A qué materia van estas notas?
          <select data-imp-previo>
            <option value="__informe" ${imp.destinoPrevio === '__informe' ? 'selected' : ''}>📄 Informe completo (varias asignaturas)</option>
            <option value="__auto" ${imp.destinoPrevio === '__auto' ? 'selected' : ''}>🔍 Detectar automáticamente desde la imagen</option>
            ${materiasDestino().map(([v, t]) => `<option value="${esc(v)}" ${v === imp.destinoPrevio ? 'selected' : ''}>${esc(t)}${v === imp.sugerida ? ' (seleccionada)' : ''}</option>`).join('')}
          </select>
        </label>
        ${imp.destinoPrevio === '__nueva'
          ? `<label>Nombre de la nueva asignatura <input data-imp-previo-nueva data-key="imp-previo-nueva" value="${esc(imp.nuevaPrevia)}" placeholder="Ej. Química"></label>`
          : imp.destinoPrevio === '__informe' ? '<p class="nota-aviso">Para informes de notas del colegio con una fila por asignatura (ej. “Informe Notas Semestrales”). Se importan solo las notas parciales; las columnas de promedio (PRO, NS1, NS2, NF, PG), conceptos y asistencia se usan para verificar, no como notas.</p>'
          : `<p class="nota-aviso">${imp.destinoPrevio === '__auto'
            ? 'Se reconocen nombres y abreviaturas (Mat, Leng, Hist, Cs. Nat, Biol, Ing, Ed. Fís…). Puedes corregir el destino antes de confirmar.'
            : 'Todas las notas detectadas irán a esta materia; los encabezados de otras asignaturas en el texto se ignorarán.'}</p>`}
      </div>
      <div class="zona-foto" id="zona-foto" tabindex="0" aria-label="Zona para soltar o pegar una imagen">
        ${imp.imagenURL ? `<img src="${imp.imagenURL}" alt="Imagen a importar">`
          : imp.archivoPDF ? `<span class="pdf-cargado">📄 <strong>${esc(imp.archivoPDF)}</strong><br><small>Texto extraído abajo</small></span>`
          : '<span>Arrastra una imagen o un PDF aquí, pega una imagen con Ctrl+V o usa los botones</span>'}
      </div>
      <div class="fila-botones inicio">
        <label class="btn">Elegir imagen o PDF<input type="file" accept="image/*,application/pdf,.pdf" data-foto-archivo hidden></label>
        <label class="btn ghost">Tomar foto<input type="file" accept="image/*" capture="environment" data-foto-archivo hidden></label>
        <button type="button" class="btn primario" data-action="foto-ocr" ${imp.imagenURL ? '' : 'disabled'}>Leer texto de la imagen</button>
      </div>
      <fieldset><legend>Reconocimiento de texto (OCR)</legend>
        <p class="nota-aviso">${esc(ocrDisponible())}</p>
        <label class="check-label"><input type="checkbox" data-config="ocrTesseract" ${store.config.ocrTesseract ? 'checked' : ''}>
          Usar OCR opcional en el navegador (Tesseract.js, descarga de varios MB; la imagen no sale de tu equipo)</label>
        ${imp.estado ? `<p class="aviso">${esc(imp.estado)}</p>` : ''}
      </fieldset>
      <div class="form-fila">
        <label>Formato de ponderación en la imagen
          <select data-imp-modo-peso>${opts([['auto', 'Automático (detecta “0,2 %” = 20 % si suman 1)'], ['pct', 'Porcentaje literal (25 % = 25 %)'], ['dec', 'Decimal / fracción (0,25 = 25 %)']], imp.modoPeso)}</select>
        </label>
        <p class="nota-aviso">El signo % se asocia siempre al número que lo precede; “N°1” se trata como parte del nombre, no como nota.</p>
      </div>
      <label>Texto detectado (revísalo, corrígelo o pégalo aquí)
        <textarea id="foto-texto" rows="7" placeholder="Matemática&#10;Control 1  6,5  10%&#10;Control 2  5,8  0,1&#10;Prueba 1: 6.1 (25%)&#10;Leng.  Prueba 1  64  1/4">${esc(imp.texto)}</textarea>
      </label>
      <div class="fila-botones">
        <button type="button" class="btn ghost" data-action="cerrar-dialogo">Cancelar</button>
        <button type="button" class="btn primario" data-action="foto-analizar">Analizar texto</button>
      </div>`;
    return;
  }
  // Paso 2: propuesta + confirmación explícita
  const opcionesMateria = materiasDestino();
  const grupos = imp.grupos.map((g, i) => {
    const filas = g.filas.map((f, j) => `
      <tr class="${f.incluir ? '' : 'excluida'}">
        <td><input type="checkbox" data-imp-incluir="${i}:${j}" ${f.incluir ? 'checked' : ''} aria-label="Incluir"></td>
        <td><input data-imp="${i}:${j}:evaluacion" data-key="imp-${i}-${j}-ev" value="${esc(f.evaluacion)}" aria-label="Evaluación"></td>
        <td><input type="text" inputmode="decimal" step="${paso()}" data-imp="${i}:${j}:nota" data-key="imp-${i}-${j}-nota" value="${fmtNota(f.nota)}" placeholder="pendiente" aria-label="Nota"></td>
        <td><div class="input-sufijo"><input type="text" inputmode="decimal" data-imp="${i}:${j}:peso" data-key="imp-${i}-${j}-peso" value="${fmtPesoInput(f.peso)}" placeholder="?" title="${ayudaPeso()}" aria-label="Ponderación"><span>${sufijoPeso()}</span></div></td>
        <td class="avisos-fila">${f.avisos.map(a => `<small>⚠ ${esc(a)}</small>`).join('')}</td>
      </tr>`).join('');
    const incluidas = g.filas.filter(f => f.incluir);
    const nombreMateria = g.destino === '__nueva' ? (g.nuevaNombre || 'Nueva asignatura') + ' (nueva)' : (perfil().asignaturas.find(a => a.id === g.destino)?.nombre ?? '—');
    const notasTexto = incluidas.map(f => (f.nota === null ? 'pendiente' : fmt(f.nota, 1))).join(', ') || '(ninguna)';
    return `
      <section class="grupo-import">
        <div class="form-fila">
          <label>Materia de destino
            <select data-imp-materia="${i}">${opcionesMateria.map(([v, t]) => `<option value="${esc(v)}" ${v === g.destino ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
          </label>
          ${g.destino === '__nueva' ? `<label>Nombre de la nueva asignatura <input data-imp-nueva="${i}" data-key="imp-nueva-${i}" value="${esc(g.nuevaNombre)}"></label>` : `<div class="detectado"><small>Detectado en el texto: ${g.nombreDetectado ? `“${esc(g.nombreDetectado)}”` : 'sin nombre de asignatura'}</small></div>`}
        </div>
        ${g.informe ? htmlVerificacionInforme(g, i) : ''}
        ${g.avisos.map(a => `<p class="aviso warn">${esc(a)}</p>`).join('')}
        <div class="tabla-scroll"><table class="tabla tabla-compacta tabla-import">
          <thead><tr><th></th><th>Evaluación</th><th>Nota</th><th>Ponderación</th><th>Avisos</th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>
        ${g.informe ? '' : `<label class="check-label"><input type="checkbox" data-imp-bloque="${i}" ${g.comoBloque ? 'checked' : ''}> Agrupar como <strong>bloque de controles</strong></label>`}
        ${g.comoBloque ? `<label class="campo-linea">Ponderación del bloque <div class="input-sufijo"><input type="text" inputmode="decimal" data-imp-bloque-peso="${i}" data-key="imp-bp-${i}" value="${fmtPesoInput(g.pesoBloque)}" placeholder="?" title="${ayudaPeso()}"><span>${sufijoPeso()}</span></div></label>` : ''}
        ${g.requiereConfirmar ? `<label class="check-label confirmar-materia"><input type="checkbox" data-imp-confirmar="${i}" ${g.materiaConfirmada ? 'checked' : ''}> Sí, es esta materia: <strong>${esc(nombreMateria)}</strong></label>` : ''}
        <p class="confirmacion">Se incluirán las siguientes notas en la materia <strong>${esc(nombreMateria)}</strong>: <strong>${esc(notasTexto)}</strong> (revisa ponderaciones y asignatura antes de confirmar). ¿Desea confirmar?</p>
      </section>`;
  }).join('');
  cuerpo.innerHTML = `
    <h2>Confirma las notas detectadas</h2>
    ${imp.informe ? htmlResumenInforme() : ''}
    ${imp.avisos.map(a => `<p class="aviso">${esc(a)}</p>`).join('')}
    ${grupos || '<p class="muted">No hay notas para incluir.</p>'}
    <div class="fila-botones">
      <button type="button" class="btn ghost" data-action="foto-volver">Volver al texto</button>
      <span class="espaciador"></span>
      <button type="button" class="btn ghost" data-action="cerrar-dialogo">Cancelar</button>
      <button type="button" class="btn primario" data-action="foto-confirmar" ${imp.grupos.some(g => g.filas.some(f => f.incluir)) && !imp.grupos.some(g => g.requiereConfirmar && !g.materiaConfirmada && g.filas.some(f => f.incluir)) ? '' : 'disabled'}>Sí, confirmar e incluir</button>
    </div>`;
}

/**
 * Informe completo: lee todas las asignaturas, detecta el período ("Segundo Semestre") y propone
 * asociar cada fila con la asignatura del perfil (o crearla). Solo notas parciales.
 */
function analizarInforme() {
  const imp = importacion;
  const p = perfil();
  const r = Importador.parsearInforme(imp.texto, p.escala, []);
  // Período de destino: el elegido a mano, o el detectado en el texto si existe en el perfil, o el activo
  let periodoDestino = imp.informe?.periodoElegido;
  if (!periodoDestino && r.periodo && r.periodo.numero <= p.periodos.length) periodoDestino = p.periodos[r.periodo.numero - 1].id;
  if (!periodoDestino) periodoDestino = esConsolidado() ? p.periodos.at(-1).id : p.periodoActivo;
  const candidatas = p.asignaturas.filter(a => a.periodoId === periodoDestino);
  const r2 = Importador.parsearInforme(imp.texto, p.escala, candidatas);
  imp.informe = { periodoDetectado: r2.periodo, periodoDestino, periodoElegido: imp.informe?.periodoElegido, columnasResumen: r2.columnasResumen };
  imp.avisos = r2.avisos;
  imp.grupos = r2.grupos.map(g => ({
    ...g,
    destino: g.coincidencia ? g.coincidencia.asig.id : '__nueva',
    nuevaNombre: g.nombreDetectado,
    requiereConfirmar: false, materiaConfirmada: true, comoBloque: false, pesoBloque: null,
    filas: g.filas.map(fl => ({ ...fl, incluir: true })),
  }));
  renderImportar();
}

/** Resumen superior del informe: período, asignaturas y verificación de promedios. */
function htmlResumenInforme() {
  const imp = importacion;
  const p = perfil();
  const det = imp.informe.periodoDetectado;
  const filas = imp.grupos.map((g, i) => {
    const v = verificacionGrupo(g);
    const destino = g.destino === '__nueva' ? `<em>Crear “${esc(g.nuevaNombre)}”</em>` : esc(p.asignaturas.find(a => a.id === g.destino)?.nombre ?? '—');
    return `<tr class="${g.filas.some(fl => fl.incluir) ? '' : 'excluida'}">
      <td><label class="check-label"><input type="checkbox" data-imp-grupo-incluir="${i}" ${g.filas.some(fl => fl.incluir) ? 'checked' : ''} aria-label="Incluir ${esc(g.nombreDetectado)}"> ${esc(g.nombreDetectado)}</label></td>
      <td class="num">${v.n}</td><td class="num">${v.informe === null ? '—' : fmt(v.informe, 1)}</td><td class="num">${v.calculado === null ? '—' : fmt(v.calculado)}</td>
      <td>${v.coincide === null ? '—' : v.coincide ? '<span class="ok-texto">✓</span>' : '<span class="warn-texto">⚠ revisar</span>'}</td><td>${destino}</td></tr>`;
  }).join('');
  return `
    <div class="informe-resumen">
      <div class="form-fila">
        <label>Período de destino
          <select data-imp-periodo>${opts(p.periodos.map(x => [x.id, x.nombre]), imp.informe.periodoDestino)}</select>
        </label>
        <p class="nota-aviso">${det ? `Detectado en el informe: ${esc(det.numero)}° ${esc(det.tipo)}.` : 'No se detectó el período en el texto.'}
          ${imp.informe.columnasResumen ? `Se separaron ${imp.informe.columnasResumen} columna(s) de promedios por fila: no se importan como notas.` : ''}</p>
      </div>
      <div class="tabla-scroll"><table class="tabla tabla-compacta">
        <thead><tr><th>Asignatura (incluir)</th><th>Notas</th><th>Prom. informe</th><th>Prom. calculado</th><th>¿Coincide?</th><th>Destino</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <p class="nota-aviso">El promedio calculado usa solo las notas incluidas y se actualiza al corregirlas. Si no coincide, puede haber notas en cursiva (no inciden), ponderaciones o una nota mal leída.</p>
    </div>`;
}

/** Promedio del informe vs promedio simple de las notas incluidas (redondeado a 1 decimal para comparar). */
function verificacionGrupo(g) {
  const notas = g.filas.filter(fl => fl.incluir && fl.nota !== null).map(fl => fl.nota);
  const calculado = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const informe = g.informe?.promedioInforme ?? null;
  const coincide = informe === null || calculado === null ? null : Math.abs(Calc.redondear(calculado, 1) - informe) <= 0.1 + Calc.EPS;
  return { n: notas.length, calculado, informe, coincide };
}

function htmlVerificacionInforme(g, i) {
  const v = verificacionGrupo(g);
  if (v.informe === null) return '';
  return `<p class="verificacion-informe ${v.coincide ? 'ok' : 'warn'}">${v.coincide ? '✓' : '⚠'} Promedio del informe: <strong>${fmt(v.informe, 1)}</strong> · calculado con estas ${v.n} nota(s): <strong>${fmt(v.calculado)}</strong>
    ${g.informe.resumen.length > 1 ? `<small>(otras columnas de resumen: ${g.informe.resumen.slice(1).map(x => fmt(x, 1)).join(' · ')})</small>` : ''}
    <label class="check-label"><input type="checkbox" data-imp-grupo-incluir="${i}" ${g.filas.some(fl => fl.incluir) ? 'checked' : ''}> Incluir esta asignatura</label></p>`;
}

/** Asignaturas posibles de destino (período activo, o todas en vista consolidada) + crear nueva. */
function materiasDestino() {
  const p = perfil();
  const periodoInforme = importacion?.grupos && importacion?.informe?.periodoDestino;
  const lista = p.asignaturas.filter(a => (periodoInforme ? a.periodoId === periodoInforme : esConsolidado() || a.periodoId === p.periodoActivo))
    .map(a => [a.id, esConsolidado() ? `${a.nombre} · ${nombrePeriodo(a.periodoId)}` : a.nombre]);
  return [...lista, ['__nueva', '+ Crear nueva asignatura']];
}

/** Entrada única del importador: PDF → lector de PDF; imagen → OCR. */
function cargarArchivoImportar(archivo) {
  if (!archivo) return;
  if (archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name || '')) leerPDF(archivo);
  else cargarImagen(archivo);
}

function cargarImagen(archivo) {
  if (!archivo || !archivo.type.startsWith('image/')) { toast('El archivo no es una imagen ni un PDF'); return; }
  if (archivo.size > 25 * 1024 * 1024) { toast('La imagen es demasiado grande (máx. 25 MB)'); return; }
  const vigente = nuevaLectura(importacion);
  const lector = new FileReader();
  lector.onload = () => { if (!vigente()) return; importacion.imagenURL = lector.result; importacion.archivoPDF = null; importacion.estado = ''; renderImportar(); };
  lector.onerror = () => toast('No se pudo leer la imagen');
  lector.readAsDataURL(archivo);
}

/**
 * (v25) Carga un script externo con integridad (SRI) y CORS anónimo. La promesa se reutiliza si ya se
 * está cargando (dos clics seguidos no insertan dos <script>), vence a los 30 s para no dejar la app
 * esperando sin conexión, y si falla se retira el <script> para poder reintentar después.
 */
const cargasExternas = new Map();
function cargarScriptSeguro(url, integridad, listo) {
  if (listo()) return Promise.resolve();
  if (cargasExternas.has(url)) return cargasExternas.get(url);
  const promesa = new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = url;
    s.integrity = integridad;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    const fallar = msg => { clearTimeout(reloj); s.remove(); cargasExternas.delete(url); rechazar(new Error(msg)); };
    const reloj = setTimeout(() => fallar('la descarga tardó demasiado (¿conexión lenta o sin internet?)'), 30000);
    s.onload = () => { clearTimeout(reloj); listo() ? resolver() : fallar('la biblioteca no se inicializó'); };
    s.onerror = () => fallar('no se pudo descargar o no pasó la verificación de integridad (¿sin conexión?)');
    document.head.appendChild(s);
  });
  cargasExternas.set(url, promesa);
  return promesa;
}

/** pdf.js + su worker. El worker se descarga con fetch verificando su hash y se usa como blob (mismo origen). */
let workerPdfURL = null;
async function cargarPdfjs() {
  await cargarScriptSeguro(URL_PDFJS, SRI_PDFJS, () => !!window.pdfjsLib);
  if (!workerPdfURL) {
    const r = await fetch(URL_PDFJS_WORKER, { integrity: SRI_PDFJS_WORKER, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .catch(() => { throw new Error('no se pudo descargar el lector de PDF (¿sin conexión?)'); });
    if (!r.ok) throw new Error('no se pudo descargar el lector de PDF');
    workerPdfURL = URL.createObjectURL(await r.blob());
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerPdfURL;
  return window.pdfjsLib;
}

const PDF_MAX_PAGINAS = 5;   // un informe de notas ocupa 1–2 páginas; se limita para no colgar el navegador

/**
 * Lee un PDF en el navegador:
 * 1) PDF con texto (informes generados por el sistema del colegio): extrae el texto con su posición
 *    y reconstruye las filas (Importador.textoDesdePDF). Si parece un informe completo, activa ese modo.
 * 2) PDF escaneado (sin texto): dibuja las páginas como imagen para pasarlas por el OCR.
 */
/** (v25) Cada lectura (PDF, imagen, OCR) recibe un número; si empieza otra o se cierra el importador, la anterior no pisa el estado. */
let lecturaImport = 0;
const nuevaLectura = imp => { const n = ++lecturaImport; return () => n === lecturaImport && importacion === imp; };

async function leerPDF(archivo) {
  const imp = importacion;
  const vigente = nuevaLectura(imp);
  if (archivo.size > 30 * 1024 * 1024) { imp.estado = 'El PDF es demasiado grande (máx. 30 MB).'; renderImportar(); return; }
  imp.texto = $('#foto-texto')?.value ?? imp.texto;   // no perder lo que ya estaba escrito si el PDF falla
  imp.imagenURL = null;
  imp.archivoPDF = archivo.name || 'documento.pdf';
  imp.estado = 'Leyendo el PDF…';
  renderImportar();
  try {
    const pdfjsLib = await cargarPdfjs();
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise;
    const total = Math.min(doc.numPages, PDF_MAX_PAGINAS);
    const paginas = [];
    for (let n = 1; n <= total; n++) {
      const tc = await (await doc.getPage(n)).getTextContent();
      paginas.push(tc.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height || Math.abs(i.transform[3]) })));
    }
    if (!vigente()) { doc.destroy?.(); return; }   // el usuario eligió otro archivo o cerró el importador
    const texto = Importador.textoDesdePDF(paginas).trim();
    const extra = doc.numPages > total ? ` Solo se leyeron las primeras ${total} de ${doc.numPages} páginas.` : '';
    if (texto.replace(/\s/g, '').length < 30) {
      // Sin capa de texto: se convierte a imagen y se usa el OCR habitual
      const imagen = await paginasComoImagen(doc, total);
      if (!vigente()) { doc.destroy?.(); return; }
      imp.imagenURL = imagen;
      imp.archivoPDF = null;
      imp.estado = `El PDF parece escaneado (sin texto seleccionable). Lo convertí a imagen: presiona “Leer texto de la imagen”.${extra}`;
    } else {
      imp.texto = texto;
      const informe = Importador.parsearInforme(texto, perfil().escala, []);
      if (informe.grupos.length >= 2) {
        imp.destinoPrevio = '__informe';
        imp.estado = `PDF leído: se reconocieron ${informe.grupos.length} asignaturas${informe.periodo ? ` (${informe.periodo.numero}° ${informe.periodo.tipo})` : ''}. Activé el modo “Informe completo”; revisa el texto y presiona “Analizar texto”.${extra}`;
      } else {
        imp.estado = `PDF leído. Revisa el texto y presiona “Analizar texto”.${extra}`;
      }
    }
    doc.destroy?.();
  } catch (e) {
    if (!vigente()) return;
    imp.archivoPDF = null;
    imp.estado = /password/i.test(e?.name || e?.message || '')
      ? 'El PDF está protegido con contraseña. Ábrelo en tu visor, copia el texto y pégalo abajo.'
      : `No se pudo leer el PDF (${e.message}). Puedes copiar su texto desde el visor y pegarlo abajo.`;
  }
  renderImportar();
}

/** Dibuja las páginas de un PDF escaneado, una bajo otra, en una sola imagen para el OCR. */
async function paginasComoImagen(doc, total) {
  const lienzos = [];
  for (let n = 1; n <= total; n++) {
    const pagina = await doc.getPage(n);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: Calc.limitar(1600 / base.width, 1, 3) });
    const c = document.createElement('canvas');
    c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
    await pagina.render({ canvasContext: c.getContext('2d'), viewport }).promise;
    lienzos.push(c);
  }
  const final = document.createElement('canvas');
  final.width = Math.max(...lienzos.map(c => c.width));
  final.height = lienzos.reduce((s, c) => s + c.height, 0);
  const ctx = final.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, final.width, final.height);
  let y = 0;
  for (const c of lienzos) { ctx.drawImage(c, 0, y); y += c.height; }
  return final.toDataURL('image/png');
}

function cargarTesseract() {
  return cargarScriptSeguro(URL_TESSERACT, SRI_TESSERACT, () => !!window.Tesseract);
}

/**
 * Preprocesa la imagen para el OCR: escala a un ancho cómodo (≈1800 px), pasa a grises,
 * invierte si el fondo es oscuro (capturas en modo oscuro) y estira el contraste.
 * Devuelve un canvas; si algo falla, devuelve null y se usa la imagen original.
 */
async function prepararImagenOCR(url) {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escalaImg = Calc.limitar(1800 / img.naturalWidth, 1, 2.5);
    const w = Math.round(img.naturalWidth * escalaImg), h = Math.round(img.naturalHeight * escalaImg);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h);
    const px = datos.data;
    const gris = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      gris[j] = y;
    }
    // Solo escala + grises: invertir o forzar contraste destruye el texto en capturas con fondos mixtos
    // (barras de color, tarjetas oscuras), y Tesseract ya binariza e invierte por su cuenta.
    for (let i = 0, j = 0; i < px.length; i += 4, j++) px[i] = px[i + 1] = px[i + 2] = gris[j];
    ctx.putImageData(datos, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

/** TextDetector entrega cajas sueltas: se agrupan en filas por su altura y se ordenan de izquierda a derecha. */
function textoDesdeCajas(bloques) {
  const cajas = bloques.filter(b => b.rawValue?.trim()).map(b => {
    const r = b.boundingBox;
    return { t: b.rawValue.trim(), x: r.x, cy: r.y + r.height / 2, h: r.height };
  }).sort((a, b) => a.cy - b.cy);
  const filas = [];
  for (const c of cajas) {
    const fila = filas.find(f => Math.abs(f.cy - c.cy) < Math.max(f.h, c.h) * 0.55);
    if (fila) { fila.items.push(c); fila.cy = (fila.cy + c.cy) / 2; fila.h = Math.max(fila.h, c.h); } else filas.push({ cy: c.cy, h: c.h, items: [c] });
  }
  return filas.sort((a, b) => a.cy - b.cy).map(f => f.items.sort((a, b) => a.x - b.x).map(i => i.t).join('  ')).join('\n');
}

let trabajadorOCR = null;   // promesa del worker de Tesseract reutilizable (se crea una sola vez aunque haya dos lecturas a la vez)
async function leerConTesseract(fuente) {
  await cargarTesseract();
  if (window.Tesseract.createWorker) {
    trabajadorOCR ??= window.Tesseract.createWorker('spa').catch(e => { trabajadorOCR = null; throw e; });
    const worker = await trabajadorOCR;
    // Mantener los espacios entre columnas ayuda a separar nombre, nota y ponderación
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const r = await worker.recognize(fuente);
    return r.data.text || '';
  }
  const r = await window.Tesseract.recognize(fuente, 'spa');
  return r.data.text || '';
}

/** Intenta leer texto: 1) TextDetector nativo, 2) Tesseract.js si está activado. Nunca rompe. */
async function ejecutarOCR() {
  const imp = importacion;
  if (!imp.imagenURL) return;
  const vigente = nuevaLectura(imp);
  imp.texto = $('#foto-texto')?.value ?? imp.texto;
  imp.estado = 'Leyendo la imagen…';
  renderImportar();
  try {
    let texto = '';
    const preparada = await prepararImagenOCR(imp.imagenURL);
    if ('TextDetector' in window) {
      try {
        const fuente = preparada ?? Object.assign(new Image(), { src: imp.imagenURL });
        if (fuente instanceof HTMLImageElement) await fuente.decode();
        texto = textoDesdeCajas(await new window.TextDetector().detect(fuente));
      } catch { texto = ''; }   // si el detector nativo falla, se intenta con Tesseract
    }
    if (!texto.trim() && store.config.ocrTesseract) {
      // 1) Imagen original; 2) si rinde poco, versión escalada en grises. Se queda la lectura con más notas válidas.
      texto = await leerConTesseract(imp.imagenURL);
      const puntaje = t => Importador.parsearTexto(t, perfil().escala, []).grupos.reduce((s, g) => s + g.filas.filter(f => f.nota !== null).length, 0);
      if (preparada && puntaje(texto) < 3) {
        imp.estado = 'Reintentando con la imagen mejorada…';
        renderImportar();
        const alternativo = await leerConTesseract(preparada);
        if (puntaje(alternativo) > puntaje(texto)) texto = alternativo;
      }
    }
    if (!vigente()) return;   // llegó tarde: ya hay otra imagen o se cerró el importador
    // Limpieza mínima: espacios duros, líneas vacías repetidas y espacios al final
    texto = texto.replace(/ /g, ' ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
    if (!texto.trim()) {
      imp.estado = 'No se pudo extraer texto automáticamente (sin OCR disponible, imagen borrosa o incompleta). Escribe o pega el texto abajo.';
    } else {
      imp.texto = texto.trim();
      imp.estado = 'Texto leído. Revísalo y corrígelo antes de analizar: el OCR puede confundir comas, 1/7 o 5/6.';
    }
  } catch (e) {
    if (!vigente()) return;
    imp.estado = `No se pudo leer la imagen (${e.message}). Puedes escribir o pegar el texto manualmente.`;
  }
  renderImportar();
}

/** Analiza el texto y propone destino por grupo: coincidencia por nombre → asignatura seleccionada → crear nueva. */
function analizarTextoImportado() {
  const imp = importacion;
  imp.texto = $('#foto-texto').value;
  if (imp.destinoPrevio === '__informe') { analizarInforme(); return; }
  imp.informe = null;
  const p = perfil();
  const candidatas = p.asignaturas.filter(a => esConsolidado() || a.periodoId === p.periodoActivo);
  const fija = imp.destinoPrevio !== '__auto';
  const r = Importador.parsearTexto(imp.texto, p.escala, candidatas, { materiaFija: fija, modoPeso: imp.modoPeso });
  const seleccionada = asigSeleccionada();
  imp.avisos = r.avisos;
  imp.grupos = r.grupos.map(g => {
    let destino, nuevaNombre = g.nombreDetectado || 'Nueva asignatura';
    let requiereConfirmar = false;
    const avisos = [...g.avisos];
    // Categoría de materia: por el nombre detectado ("Biol") o, si no, por los contenidos ("ADN", "Fuerzas")
    const catNombre = g.nombreDetectado ? [...Importador.categoriasDe(g.nombreDetectado)][0] : null;
    const cat = catNombre || g.tema?.categoria || null;
    const propuesta = !fija && !g.coincidencia && cat ? proponerMateria(cat, candidatas) : null;
    if (fija) {
      // Materia elegida antes de leer: todo va ahí; solo se informa lo ignorado
      destino = imp.destinoPrevio;
      nuevaNombre = imp.nuevaPrevia || g.ignorados?.[0] || 'Nueva asignatura';
      const elegida = candidatas.find(a => a.id === destino);
      const otras = (g.ignorados || []).filter(n => !elegida || Importador.buscarAsignatura(n, [elegida]) === null);
      if (otras.length) avisos.push(`El texto menciona ${otras.map(n => `“${n}”`).join(', ')}; se ignoró porque elegiste ${elegida ? elegida.nombre : 'una asignatura nueva'}.`);
    } else if (g.coincidencia) destino = g.coincidencia.asig.id;
    else if (propuesta) {
      // Inferida por palabras clave o por el currículum: SIEMPRE con confirmación explícita
      requiereConfirmar = true;
      const porque = catNombre ? `“${g.nombreDetectado}”` : `los contenidos (${g.filas.slice(0, 2).map(f => `“${f.evaluacion}”`).join(', ')})`;
      if (propuesta.asig) {
        destino = propuesta.asig.id;
        avisos.push(`Por ${porque}, estas notas parecen de ${propuesta.asig.nombre}. Confírmalo abajo antes de guardar.`);
      } else {
        destino = '__nueva';
        nuevaNombre = propuesta.nombre;
        avisos.push(`Por ${porque}, se propone crear “${propuesta.nombre}” (asignatura del currículum escolar). Confírmalo abajo antes de guardar.`);
      }
    } else if (!g.nombreDetectado && seleccionada && candidatas.includes(seleccionada)) {
      destino = seleccionada.id;
      avisos.push(`Se propone incluirlas en la asignatura seleccionada (${seleccionada.nombre}). Cámbiala si no corresponde.`);
    } else {
      destino = '__nueva';
      avisos.push(g.nombreDetectado ? `Se propone crear la asignatura “${g.nombreDetectado}” o elegir una existente.` : 'Elige la asignatura de destino o crea una nueva.');
    }
    return {
      ...g, avisos, destino, nuevaNombre, requiereConfirmar, materiaConfirmada: false,
      comoBloque: Importador.parecenControles(g.filas), pesoBloque: null, filas: g.filas.map(f => ({ ...f, incluir: true })),
    };
  });
  renderImportar();
}

/**
 * Propone una materia para una categoría (fisica, biologia…):
 *   1) una asignatura del perfil de esa categoría (o relacionada: Biología ↔ Ciencias);
 *   2) si no hay, una asignatura del currículum escolar (o de la malla universitaria) para crearla.
 * Devuelve { asig } o { nombre } o null.
 */
function proponerMateria(cat, candidatas) {
  const relacionada = nombre => {
    const cs = Importador.categoriasDe(nombre);
    const padre = Importador.ALIAS_MATERIAS[cat]?.padre;
    return cs.has(cat) || (padre && cs.has(padre)) || [...cs].some(c => Importador.ALIAS_MATERIAS[c]?.padre === cat);
  };
  const p = perfil();
  const nombres = esEscolar(p)
    ? REF.seccionesCurriculo(p.modalidad, p.nivel, p.especialidad).flatMap(s => s.items)
    : (p.uni.malla?.semestres || []).flatMap(s => s.ramos.map(r => r.nombre)).filter(Boolean);
  // Orden: misma materia en el perfil → misma materia en el currículum → materia relacionada (perfil / currículum)
  const exacta = candidatas.find(a => Importador.categoriasDe(a.nombre).has(cat));
  if (exacta) return { asig: exacta };
  const curriculoExacta = nombres.find(n => Importador.categoriasDe(n).has(cat));
  if (curriculoExacta) return { nombre: curriculoExacta };
  const relacionadaPerfil = candidatas.find(a => relacionada(a.nombre));
  if (relacionadaPerfil) return { asig: relacionadaPerfil };
  const curriculoRelacionada = nombres.find(relacionada);
  return curriculoRelacionada ? { nombre: curriculoRelacionada } : null;
}

function confirmarImportacion() {
  const p = perfil();
  const E = p.escala;
  // Validación final de notas y ponderaciones
  for (const g of importacion.grupos) {
    for (const f of g.filas.filter(x => x.incluir)) {
      if (f.nota !== null && (f.nota < E.min || f.nota > E.max)) { toast(`La nota de “${f.evaluacion}” está fuera de la escala ${E.min}–${E.max}`); return; }
      if (f.peso !== null && (f.peso < 0 || f.peso > 100)) { toast(`La ponderación de “${f.evaluacion}” debe estar entre 0 y 100`); return; }
    }
  }
  const sinConfirmar = importacion.grupos.find(g => g.requiereConfirmar && !g.materiaConfirmada && g.filas.some(f => f.incluir));
  if (sinConfirmar) { toast('Confirma la materia propuesta (casilla “Sí, es esta materia”) o elige otra antes de guardar'); return; }
  let total = 0;
  const destinos = [];
  const unidasImport = [];   // asignaturas "nuevas" que ya existían con otra escritura
  const creadasImport = new Set();
  puntoAutomatico('importar notas');   // v26: para comparar después cómo cambió tu promedio con lo importado
  conDeshacer('Notas incluidas', () => {
    for (const g of importacion.grupos) {
      const filas = g.filas.filter(f => f.incluir);
      if (!filas.length) continue;
      let asig = p.asignaturas.find(a => a.id === g.destino);
      if (!asig) {
        const periodoId = importacion.informe?.periodoDestino || (esConsolidado() ? p.periodos.at(-1).id : p.periodoActivo);
        const nombreNuevo = (g.nuevaNombre || 'Nueva asignatura').trim();
        asig = buscarDuplicada(nombreNuevo, periodoId);
        if (asig) { if (!creadasImport.has(asig.id) && !unidasImport.includes(asig.nombre)) unidasImport.push(asig.nombre); }
        else {
          asig = { id: uid(), nombre: nombreNuevo, meta: null, periodoId, evaluaciones: [], checklist: [] };
          p.asignaturas.push(asig);
          creadasImport.add(asig.id);
        }
      }
      if (g.comoBloque) {
        asig.evaluaciones.push({ id: uid(), tipo: 'bloque', nombre: 'Controles', peso: g.pesoBloque ?? 0, controles: filas.map(f => ({ id: uid(), nombre: f.evaluacion, nota: f.nota })) });
      } else {
        filas.forEach(f => asig.evaluaciones.push({ id: uid(), tipo: 'simple', nombre: f.evaluacion, nota: f.nota, pendiente: f.nota === null, peso: f.peso ?? 0 }));
      }
      total += filas.length;
      destinos.push(asig);
    }
    if (destinos[0]) p.seleccionada = destinos[0].id;
  });
  $('#dlg-foto').close();
  const excelentes = importacion.grupos.flatMap(g => g.filas.filter(f => f.incluir && f.nota !== null && f.nota >= E.max - (E.max - E.min) / 12 - Calc.EPS)).length;
  const enDestinos = destinos.length > 3 ? `${destinos.length} asignaturas` : destinos.map(a => a.nombre).join(', ');
  const unidas = unidasImport.length ? ` ${unidasImport.length === 1 ? `“${unidasImport[0]}” ya existía` : `${unidasImport.length} asignaturas ya existían`} con otra escritura: se usaron las existentes.` : '';
  toast(`Se incluyeron ${total} nota(s) en ${enDestinos}.${excelentes ? ` ¡${excelentes} nota(s) excelente(s)! 🎉` : ''}${unidas} Revisa las ponderaciones.`, {
    etiqueta: 'Deshacer', fn: accionToast,
  });
}

/* =========================================================
 * 6b. Ficha de notas (PDF / TXT / CSV) · Novedades · Apoyo
 * ========================================================= */

const SLOGAN = 'Planifica tus metas, sigue tu progreso';
const SELLO_FICHA = 'Resumen personal generado por el estudiante con Ruta Académica como apoyo para organizar su estudio. '
  + 'No es un certificado ni un documento oficial de ningún establecimiento o institución, y no tiene validez oficial.';

function abrirFicha() {
  const p = perfil();
  const f = $('#form-ficha');
  const periodoTxt = esConsolidado() ? 'Todos los períodos' : nombrePeriodo(p.periodoActivo);
  f.innerHTML = `
    <h2>Exportar ficha de notas</h2>
    <p class="muted">Un resumen ordenado de tus asignaturas, evaluaciones y promedios para guardar, imprimir o abrir en Excel.</p>
    <fieldset><legend>Formato</legend>
      <div class="opciones-formato">
        <label class="opcion-formato"><input type="radio" name="formato" value="pdf" checked><span><strong>PDF</strong><small>Vista de impresión: elige “Guardar como PDF”</small></span></label>
        <label class="opcion-formato"><input type="radio" name="formato" value="txt"><span><strong>TXT</strong><small>Texto plano tabulado</small></span></label>
        <label class="opcion-formato"><input type="radio" name="formato" value="csv"><span><strong>CSV</strong><small>Para Excel o Google Sheets</small></span></label>
      </div>
    </fieldset>
    <div class="form-fila">
      <label>Alcance
        <select name="alcance">
          <option value="vista">${esc(esConsolidado() ? 'Consolidado (todos los períodos)' : `Período activo · ${periodoTxt}`)}</option>
          ${esConsolidado() ? '' : '<option value="todos">Consolidado (todos los períodos)</option>'}
        </select>
      </label>
      <label class="check-label"><input type="checkbox" name="detalle" checked> Incluir evaluaciones y ponderaciones</label>
    </div>
    <p class="nota-aviso">${esc(SELLO_FICHA)}</p>
    <div class="fila-botones">
      <button type="button" class="btn ghost" data-action="cerrar-dialogo">Cancelar</button>
      <button type="submit" class="btn primario">Exportar</button>
    </div>`;
  $('#dlg-ficha').showModal();
}

/** Reúne los datos de la ficha (sin DOM): perfil, períodos, asignaturas y evaluaciones con peso efectivo. */
function datosFicha(todos) {
  const p = perfil();
  const periodos = todos || esConsolidado() ? p.periodos : p.periodos.filter(x => x.id === p.periodoActivo);
  const analisis = p.asignaturas.filter(a => periodos.some(x => x.id === a.periodoId)).map(a => Calc.analizarAsignatura(a, p.escala));
  return {
    perfil: p,
    alcance: periodos.length === 1 ? periodos[0].nombre : 'Consolidado',
    generado: new Date(),
    periodos: periodos.map(per => {
      const lista = analisis.filter(a => a.asig.periodoId === per.id);
      return {
        nombre: per.nombre,
        promedio: Calc.promedioGeneral(lista),
        asignaturas: lista.map(a => ({
          nombre: a.asig.nombre, meta: a.asig.meta, promedio: a.actual, estado: estadoVisual(a).texto.replace('🔒 ', ''), cerrada: a.cerradaManual,
          equiponderado: a.modoAuto,
          evaluaciones: a.asig.evaluaciones.map(ev => {
            const w = a.pesoEfectivo(ev.id);
            if (Calc.esBloque(ev)) {
              const nb = Calc.notaBloque(ev);
              return { nombre: `${ev.nombre} (bloque de ${ev.controles.length} controles)`, nota: nb.actual, peso: w, pendiente: !nb.completo,
                controles: ev.controles.map(c => ({ nombre: c.nombre, nota: c.nota })) };
            }
            return { nombre: ev.nombre, nota: ev.nota, peso: w, pendiente: ev.nota === null };
          }),
        })),
      };
    }),
    general: Calc.promedioGeneral(analisis),
  };
}

const notaFicha = n => (typeof n === 'number' && Number.isFinite(n) ? Calc.redondear(n, dec()).toFixed(dec()).replace('.', ',') : '—');
const pesoFicha = w => (w > 0 ? `${String(Calc.redondear(w, 2)).replace('.', ',')}%` : '—');
const fechaFicha = d => d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

function htmlFicha(d, detalle) {
  const p = d.perfil;
  const filasPeriodo = per => per.asignaturas.map(a => `
    <tr class="fila-asig">
      <td><strong>${esc(a.nombre)}</strong>${a.equiponderado ? '<br><small>Equiponderado automático</small>' : ''}</td>
      <td class="n">${notaFicha(a.meta)}</td><td class="n fuerte">${notaFicha(a.promedio)}</td><td>${esc(a.estado)}</td>
    </tr>
    ${detalle && a.evaluaciones.length ? `<tr><td colspan="4" class="sub"><table class="evals">
      <thead><tr><th>Evaluación</th><th class="n">Nota</th><th class="n">Ponderación</th></tr></thead>
      <tbody>${a.evaluaciones.map(ev => `<tr><td>${esc(ev.nombre)}${ev.controles ? `<br><small>${ev.controles.map(c => `${esc(c.nombre)}: ${notaFicha(c.nota)}`).join(' · ')}</small>` : ''}</td>
        <td class="n">${ev.pendiente && ev.nota === null ? (a.cerrada ? 'Pendiente (no cuenta)' : 'Pendiente') : notaFicha(ev.nota)}</td><td class="n">${pesoFicha(ev.peso)}</td></tr>`).join('')}</tbody>
    </table></td></tr>` : ''}`).join('');
  const secciones = d.periodos.map(per => `
    <section>
      <h2>${esc(per.nombre)} <span>Promedio del período: <strong>${notaFicha(per.promedio)}</strong></span></h2>
      ${per.asignaturas.length ? `<table class="principal">
        <thead><tr><th>Asignatura</th><th class="n">Meta</th><th class="n">Promedio actual</th><th>Estado</th></tr></thead>
        <tbody>${filasPeriodo(per)}</tbody></table>` : '<p class="vacio">Sin asignaturas en este período.</p>'}
    </section>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha de notas · ${esc(p.nombre)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; color: #1b2033; margin: 0; font-size: 11pt; line-height: 1.4; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #1b2033; padding-bottom: 10px; margin-bottom: 14px; }
  header h1 { font-size: 18pt; margin: 0 0 2px; letter-spacing: -.01em; }
  header .datos { color: #4a5268; font-size: 10pt; }
  .marca { text-align: right; font-size: 9pt; color: #4a5268; }
  .marca strong { display: block; font-size: 11pt; color: #3d35c4; letter-spacing: .02em; }
  .resumen { display: flex; gap: 12px; margin: 0 0 14px; }
  .resumen div { border: 1px solid #d6d9e3; border-radius: 6px; padding: 6px 12px; }
  .resumen small { display: block; color: #4a5268; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; }
  .resumen strong { font-size: 15pt; }
  section { margin-bottom: 16px; break-inside: auto; }
  h2 { font-size: 12.5pt; margin: 0 0 6px; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #d6d9e3; padding-bottom: 3px; }
  h2 span { font-size: 10pt; font-weight: 400; color: #4a5268; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #4a5268; border-bottom: 1px solid #b9bdcb; padding: 4px 6px; }
  td { padding: 4px 6px; vertical-align: top; }
  .principal > tbody > .fila-asig > td { border-top: 1px solid #e3e6ee; }
  .n { text-align: right; white-space: nowrap; }
  .fuerte { font-weight: 700; }
  td.sub { padding: 0 6px 8px 22px; }
  .evals { font-size: 9.5pt; table-layout: fixed; }
  .evals th:first-child, .evals td:first-child { width: 64%; }
  .evals th { font-size: 7.5pt; border-bottom: 1px dotted #b9bdcb; }
  .evals td { padding: 2px 6px; color: #333a4f; }
  small { color: #5d6478; font-size: 8.5pt; }
  .vacio { color: #5d6478; font-style: italic; }
  footer { margin-top: 18px; border-top: 1px solid #b9bdcb; padding-top: 8px; font-size: 8.5pt; color: #4a5268; }
  footer .sello { display: inline-block; border: 1px solid #8c92a4; border-radius: 4px; padding: 4px 8px; margin-bottom: 4px; font-weight: 600; color: #333a4f; }
  tr { break-inside: avoid; }
</style></head><body>
<header>
  <div>
    <h1>Ficha de notas</h1>
    <div class="datos">${esc(p.nombre)} · ${esc(contextoPerfil(p))}<br>Alcance: ${esc(d.alcance)} · Escala ${p.escala.min}–${p.escala.max} (aprobación ${p.escala.aprobacion})${p.carreraPreferida && p.modalidad !== 'uni' ? `<br>Carrera preferida: ${esc(p.carreraPreferida)}` : ''}</div>
  </div>
  <div class="marca"><strong>Ruta Académica</strong>${esc(SLOGAN)}</div>
</header>
<div class="resumen">
  <div><small>Promedio general</small><strong>${notaFicha(d.general)}</strong></div>
  <div><small>Asignaturas</small><strong>${d.periodos.reduce((s, x) => s + x.asignaturas.length, 0)}</strong></div>
  <div><small>Generada</small><strong style="font-size:11pt">${esc(fechaFicha(d.generado))}</strong></div>
</div>
${secciones}
<footer>
  <div class="sello">Documento no oficial · sin validez de certificado</div>
  <div>${esc(SELLO_FICHA)} Promedios calculados con las notas y ponderaciones ingresadas por el estudiante.</div>
</footer>
</body></html>`;
}

function textoFicha(d, detalle) {
  const p = d.perfil;
  const ancho = 74;
  const linea = c => c.repeat(ancho);
  const col = (s, n, der) => { s = String(s); s = s.length > n ? `${s.slice(0, n - 1)}…` : s; return der ? s.padStart(n) : s.padEnd(n); };
  const out = [
    `${col('FICHA DE NOTAS', ancho - 16)}Ruta Académica`, col('', ancho - SLOGAN.length) + SLOGAN, linea('='),
    `Perfil:   ${p.nombre} · ${contextoPerfil(p)}`,
    `Alcance:  ${d.alcance}    Escala: ${p.escala.min}–${p.escala.max} (aprobación ${p.escala.aprobacion})`,
    ...(p.carreraPreferida && p.modalidad !== 'uni' ? [`Carrera preferida: ${p.carreraPreferida}`] : []),
    `Generada: ${fechaFicha(d.generado)}    Promedio general: ${notaFicha(d.general)}`, '',
  ];
  for (const per of d.periodos) {
    out.push(linea('-'), `${per.nombre.toUpperCase()}  ·  Promedio del período: ${notaFicha(per.promedio)}`, linea('-'));
    out.push(`${col('Asignatura', 36)}${col('Meta', 7, true)}${col('Promedio', 10, true)}  Estado`);
    for (const a of per.asignaturas) {
      out.push(`${col(a.nombre, 36)}${col(notaFicha(a.meta), 7, true)}${col(notaFicha(a.promedio), 10, true)}  ${a.estado}`);
      if (detalle) {
        for (const ev of a.evaluaciones) {
          out.push(`    ${col(ev.nombre, 44)}${col(ev.pendiente && ev.nota === null ? 'Pendiente' : notaFicha(ev.nota), 10, true)}${col(pesoFicha(ev.peso), 10, true)}`);
          for (const c of ev.controles || []) out.push(`        · ${col(c.nombre, 40)}${col(notaFicha(c.nota), 10, true)}`);
        }
      }
    }
    if (!per.asignaturas.length) out.push('  (sin asignaturas)');
    out.push('');
  }
  out.push(linea('='), 'DOCUMENTO NO OFICIAL · SIN VALIDEZ DE CERTIFICADO', ...partirTexto(SELLO_FICHA, ancho));
  return out.join('\r\n');
}

function partirTexto(t, ancho) {
  const lineas = [];
  let l = '';
  for (const w of t.split(' ')) { if ((l + ' ' + w).trim().length > ancho) { lineas.push(l.trim()); l = w; } else l += ` ${w}`; }
  if (l.trim()) lineas.push(l.trim());
  return lineas;
}

/** CSV con ";" y coma decimal (como lo abre Excel en configuración regional de Chile), con BOM UTF-8. */
function csvFicha(d, detalle) {
  const c = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const filas = [['Ruta Académica', SLOGAN], ['Ficha de notas', d.perfil.nombre, contextoPerfil(d.perfil)], ['Alcance', d.alcance, 'Generada', fechaFicha(d.generado)], ['Promedio general', notaFicha(d.general)], [],
    ['Período', 'Asignatura', 'Meta', 'Promedio actual', 'Estado', 'Evaluación', 'Nota', 'Ponderación']];
  for (const per of d.periodos) {
    for (const a of per.asignaturas) {
      filas.push([per.nombre, a.nombre, notaFicha(a.meta), notaFicha(a.promedio), a.estado, '', '', '']);
      if (detalle) for (const ev of a.evaluaciones) filas.push([per.nombre, a.nombre, '', '', '', ev.nombre, ev.pendiente && ev.nota === null ? 'Pendiente' : notaFicha(ev.nota), pesoFicha(ev.peso)]);
    }
    filas.push([per.nombre, 'PROMEDIO DEL PERÍODO', '', notaFicha(per.promedio), '', '', '', '']);
  }
  filas.push([], ['Aviso', SELLO_FICHA]);
  return '﻿' + filas.map(f => f.map(c).join(';')).join('\r\n');
}

function descargarTexto(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** PDF: se imprime la ficha desde un iframe oculto (sin la interfaz de la app); el navegador ofrece “Guardar como PDF”. */
function imprimirFicha(html) {
  const marco = document.createElement('iframe');
  marco.className = 'marco-impresion';
  marco.setAttribute('aria-hidden', 'true');
  document.body.appendChild(marco);
  marco.onload = () => {
    try { marco.contentWindow.focus(); marco.contentWindow.print(); } catch { toast('No se pudo abrir la impresión: prueba con TXT o CSV'); }
    setTimeout(() => marco.remove(), 60000);
  };
  marco.srcdoc = html;
}

function exportarFicha(form) {
  const datos = new FormData(form);
  const formato = datos.get('formato');
  const d = datosFicha(datos.get('alcance') === 'todos');
  const detalle = datos.get('detalle') === 'on';
  const base = `ficha-notas-${slug(d.perfil.nombre)}-${slug(d.alcance)}-${hoy()}`;
  $('#dlg-ficha').close();
  if (formato === 'txt') descargarTexto(`${base}.txt`, textoFicha(d, detalle), 'text/plain;charset=utf-8');
  else if (formato === 'csv') descargarTexto(`${base}.csv`, csvFicha(d, detalle), 'text/csv;charset=utf-8');
  else imprimirFicha(htmlFicha(d, detalle));
  toast(formato === 'pdf' ? 'Ficha lista: en la ventana de impresión elige “Guardar como PDF”' : `Ficha exportada en ${formato.toUpperCase()}`);
}

/* ---------- Novedades (campana) y apoyo ---------- */

const novedadesNoLeidas = () => REF.NOVEDADES.filter(n => !store.config.novedadesLeidas.includes(n.id));

function renderCampana() {
  const n = novedadesNoLeidas().length;
  const punto = $('#n-novedades');
  punto.textContent = n > 9 ? '9+' : n;
  punto.hidden = !n;
  $('[data-action="novedades"]').setAttribute('aria-label', n ? `Novedades: ${n} sin leer` : 'Novedades');
  if (!$('#panel-novedades').hidden) renderPanelNovedades();
}

function renderPanelNovedades() {
  const leidas = new Set(store.config.novedadesLeidas);
  const iconos = { version: '🚀', mejora: '✨', aviso: '🔔' };
  $('#panel-novedades').innerHTML = `
    <div class="novedades-cab"><strong>Novedades</strong>
      ${novedadesNoLeidas().length ? '<button class="enlace" data-action="novedades-leer-todas">Marcar todo como leído</button>' : '<small class="muted">Todo al día</small>'}</div>
    <ul class="lista-novedades">${REF.NOVEDADES.map(n => `
      <li class="${leidas.has(n.id) ? '' : 'no-leida'}">
        <button class="novedad" data-action="novedad-leer" data-id="${n.id}">
          <span class="novedad-icono" aria-hidden="true">${iconos[n.tipo] || '•'}</span>
          <span class="novedad-cuerpo"><strong>${esc(n.titulo)}</strong>${n.fecha ? ` <small>${esc(fechaFicha(new Date(`${n.fecha}T12:00:00`)))}</small>` : ''}<span>${esc(n.texto)}</span></span>
          ${leidas.has(n.id) ? '' : '<span class="novedad-punto" aria-label="Sin leer"></span>'}
        </button>
      </li>`).join('')}</ul>`;
}

/** Botones que abren un panel flotante del pie (Tema, Novedades, Apoyar). */
const SEL_BOTONES_FLOTANTES = '[data-action="novedades"], [data-action="apoyar"], [data-action="alternar-tema"]';
function cerrarFlotantes() {
  document.querySelectorAll('.panel-flotante').forEach(x => { x.hidden = true; });
  document.querySelectorAll(SEL_BOTONES_FLOTANTES).forEach(b => b.setAttribute('aria-expanded', 'false'));
}
function alternarFlotante(id, boton) {
  const panel = $(id);
  const abrir = panel.hidden;
  cerrarFlotantes();
  panel.hidden = !abrir;
  boton.setAttribute('aria-expanded', String(abrir));
  // En pantallas angostas el panel es fijo: se ubica justo bajo el botón
  panel.style.top = window.innerWidth <= 640 ? `${Math.round(boton.getBoundingClientRect().bottom + 8)}px` : '';
  if (abrir && id === '#panel-novedades') renderPanelNovedades();
  if (abrir && id === '#panel-tema') { renderPanelTema(); panel.querySelector('[aria-checked="true"]')?.focus(); }
}
// v26: Escape cierra el panel flotante abierto (o el menú "Más") y devuelve el foco a su botón
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const abierto = [...document.querySelectorAll('.panel-flotante')].find(x => !x.hidden);
  if (abierto) {
    const boton = abierto.closest('.flotante-ancla')?.querySelector(SEL_BOTONES_FLOTANTES);
    cerrarFlotantes();
    boton?.focus();
    return;
  }
  const menu = document.querySelector('details.menu[open]');
  if (menu) { menu.removeAttribute('open'); menu.querySelector('summary')?.focus(); }
});
// Flechas dentro del selector de fondo (patrón de grupo de opciones)
document.addEventListener('keydown', e => {
  const actual = e.target.closest?.('.tema-muestra');
  if (!actual || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  const todas = [...document.querySelectorAll('.tema-muestra')];
  const i = todas.indexOf(actual) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
  todas[(i + todas.length) % todas.length]?.focus();
  e.preventDefault();
});

/** (v26) "Compartir Ruta Académica": hoja nativa del sistema o, si no existe, copia el enlace (solo http/https). */
async function compartirApp() {
  const url = /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}` : '';
  if (!url) { toast('Comparte la app desde su dirección web publicada.'); return; }
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Ruta Académica', text: 'Organiza tus notas, metas y puntajes de admisión. Gratis y sin anuncios.', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado: ¡gracias por compartir Ruta Académica!');
  } catch (e) {
    if (e?.name !== 'AbortError') toast(`Copia este enlace para compartir: ${url}`, null, { duracion: 9000 });
  }
}

function marcarNovedades(ids) {
  store.config.novedadesLeidas = [...new Set([...store.config.novedadesLeidas, ...ids])];
  guardar();
  renderCampana();
}

/* ---------- (v26) Puntos de control: resúmenes guardados para comparar el avance ---------- */

/**
 * Resumen ACTUAL del perfil activo, con la misma forma que guarda un punto de control:
 * promedio general (todos los períodos), NEM (solo perfiles escolares de 1°–4° Medio), puntaje
 * ponderado de la carrera elegida, último puntaje de cada prueba PAES y promedio de cada asignatura
 * (emparejada por nombre entre períodos). Son ~2 KB: nunca se copian las notas completas.
 */
function resumenActual() {
  const p = perfil();
  const todos = p.asignaturas.map(a => Calc.analizarAsignatura(a, p.escala));
  const porAsig = Calc.promediosPorAsignatura(todos, p.periodos);
  const ens = p.ensayos.map(e => ({ fecha: e.fecha, puntaje: puntajeEnsayo(e).valor, prueba: pruebaEnsayo(e.prueba)?.componente || e.prueba }));
  const paes = {};
  for (const [k, r] of Object.entries(Calc.resumenEnsayos(ens))) {
    if (RE_CLAVE_PAES.test(k) && Number.isFinite(r.ultimo?.puntaje)) paes[k] = r.ultimo.puntaje;
  }
  const nem = esEscolar(p) && REF.AÑOS_MEDIA.includes(p.nivel) ? nemActual() : { prom: null, puntaje: null };
  const sel = store.catalogoCortes.find(c => c.id === p.admision.seleccion) || null;
  const pond = sel ? Calc.puntajePonderado(puntajesEfectivos(), sel.ponderaciones).total : null;
  return {
    escala: { ...p.escala },
    general: Calc.promedioAcumulado(todos),
    nem: { prom: nem.prom ?? null, puntaje: nem.puntaje ?? null },
    ponderado: Number.isFinite(pond) ? Calc.redondear(pond, 2) : null,
    carrera: sel ? `${sel.carrera} · ${sel.universidad}` : '',
    paes,
    asignaturas: porAsig.slice(0, 80).map(x => ({
      clave: x.clave.slice(0, 80), nombre: x.nombre, promedio: x.promedio === null ? null : Calc.redondear(x.promedio, 3),
    })),
  };
}

const fechaSnap = ms => new Date(ms).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
const fechaHoraSnap = ms => new Date(ms).toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Guarda un punto de control del perfil activo. Tope MAX_SNAPSHOTS: al llegar, uno automático deja
 * espacio quitando el automático más antiguo; uno manual pide borrar alguno (nunca se pierde uno
 * manual en silencio). Devuelve el punto creado o null.
 */
function guardarSnapshot(etiqueta, origen = 'manual') {
  const p = perfil();
  if (p.snapshots.length >= MAX_SNAPSHOTS) {
    const iAuto = p.snapshots.findIndex(s => s.origen === 'auto');
    if (iAuto >= 0) p.snapshots.splice(iAuto, 1);
    else {
      if (origen === 'manual') toast(`Llegaste al máximo de ${MAX_SNAPSHOTS} puntos de control. Elimina alguno antiguo para guardar otro.`);
      return null;
    }
  }
  const s = snapshotSano({ id: uid(), etiqueta: etiqueta || `Punto de control · ${fechaSnap(Date.now())}`, creado: Date.now(), origen, ...resumenActual() });
  if (!s) return null;
  p.snapshots.push(s);
  return s;
}

/** Antes de una acción masiva (importar notas, agregar una malla, eliminar un período): punto automático. */
function puntoAutomatico(motivo) {
  const p = perfil();
  if (!p.asignaturas.length && !p.ensayos.length) return;   // sin datos no hay nada que comparar después
  const s = guardarSnapshot(`Antes de ${motivo} · ${fechaSnap(Date.now())}`, 'auto');
  if (s) snapshotComparado = s.id;
}

let snapshotComparado = null;   // id del punto de control que se compara con el estado actual
function abrirSnapshots() {
  const lista = perfil().snapshots;
  if (!lista.some(s => s.id === snapshotComparado)) snapshotComparado = lista.at(-1)?.id ?? null;
  renderSnapshots();
  $('#dlg-snapshots').showModal();
}

/** Etiqueta legible de cada fila de la comparación. */
function etiquetaFilaSnapshot(f) {
  if (f.tipo === 'paes') return `PAES · ${etiquetaComponente(f.clave)}`;
  return f.etiqueta;
}
/** Formato según el tipo: notas con los decimales de la escala, puntajes con 1 decimal. */
const esNotaSnap = f => f.tipo === 'general' || f.tipo === 'asignatura' || f.clave === 'nem-prom';
const esEnteroSnap = f => f.tipo === 'paes' || f.clave === 'nem-pts';   // puntajes PAES y NEM: enteros
function fmtFilaSnapshot(f, x) {
  if (esNotaSnap(f)) return fmt(x);
  return esEnteroSnap(f) ? (Number.isFinite(x) ? String(Math.round(x)) : '—') : fmtPts(x);
}
function deltaFilaSnapshot(f) {
  if (f.delta === null) return '<span class="muted">sin dato</span>';
  const d = esNotaSnap(f) ? decDelta() : esEnteroSnap(f) ? 0 : 1;
  const sufijo = f.tipo === 'paes' || f.tipo === 'ponderado' || f.clave === 'nem-pts' ? ' pts' : '';
  return `<span class="delta ${claseSigno(f.delta, d)}">${fmtSigno(f.delta, d)}${sufijo}</span>`;
}

function htmlComparacionSnapshot(s) {
  const filas = Calc.compararResumenes(s, resumenActual());
  if (!filas.length) return '<p class="muted">Aún no hay datos para comparar: agrega notas o ensayos y vuelve aquí.</p>';
  const principales = filas.filter(f => f.tipo !== 'asignatura');
  const ramos = filas.filter(f => f.tipo === 'asignatura')
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  const fila = f => `
    <tr><th scope="row">${esc(etiquetaFilaSnapshot(f))}</th>
      <td class="num">${fmtFilaSnapshot(f, f.antes)}</td><td class="num">${fmtFilaSnapshot(f, f.ahora)}</td><td class="num">${deltaFilaSnapshot(f)}</td></tr>`;
  const cambiaron = ramos.filter(f => f.delta !== null && Math.abs(f.delta) >= 0.005).length;
  return `
    <div class="tabla-scroll">
      <table class="tabla tabla-snap">
        <caption class="visualmente-oculto">Comparación entre “${esc(s.etiqueta)}” y hoy</caption>
        <thead><tr><th scope="col">Indicador</th><th scope="col">${esc(fechaSnap(s.creado))}</th><th scope="col">Hoy</th><th scope="col">Cambio</th></tr></thead>
        <tbody>${principales.map(fila).join('')}</tbody>
        ${ramos.length ? `<tbody class="snap-ramos"><tr><th colspan="4" class="snap-sub" scope="colgroup">Por asignatura · ${cambiaron} con cambios</th></tr>${ramos.map(fila).join('')}</tbody>` : ''}
      </table>
    </div>
    ${s.carrera ? `<p class="nota-aviso">Ponderado de ese momento calculado para: ${esc(s.carrera)}.</p>` : ''}`;
}

function renderSnapshots() {
  const p = perfil();
  const lista = p.snapshots.slice().reverse();   // más reciente primero
  const sel = lista.find(s => s.id === snapshotComparado) || null;
  $('#snapshots-cuerpo').innerHTML = `
    <div class="seccion-cab"><h2>Puntos de control</h2><button type="button" class="btn ghost sm" data-action="cerrar-dialogo">Cerrar ✕</button></div>
    <p class="nota-aviso">Guarda cómo vas hoy (promedios, NEM, PAES y ponderado) y compáralo después: “¿cuánto tenía hace un mes?”. Se guardan en este navegador, dentro del perfil “${esc(p.nombre)}” (máximo ${MAX_SNAPSHOTS}).</p>
    <form class="form-snapshot" data-form-snapshot autocomplete="off">
      <input name="etiqueta" maxlength="60" placeholder="Ej. Cierre Trimestre 1 · Antes del ensayo 4" aria-label="Nombre del punto de control">
      <button class="btn primario sm" type="submit">Guardar punto de control</button>
    </form>
    ${lista.length ? `
      <ul class="lista-snapshots" aria-label="Puntos de control guardados">${lista.map(s => `
        <li class="snap-item ${s.id === snapshotComparado ? 'activo' : ''}">
          <button type="button" class="snap-elegir" data-action="snapshot-comparar" data-id="${esc(s.id)}" aria-pressed="${s.id === snapshotComparado}">
            <strong>${esc(s.etiqueta)}</strong>
            <small>${esc(fechaHoraSnap(s.creado))}${s.origen === 'auto' ? ' · automático' : ''}${s.general !== null ? ` · promedio ${fmt(s.general)}` : ''}</small>
          </button>
          <button type="button" class="icono snap-borrar" data-action="snapshot-eliminar" data-id="${esc(s.id)}" title="Eliminar este punto de control" aria-label="Eliminar ${esc(s.etiqueta)}">✕</button>
        </li>`).join('')}</ul>
      <div class="snap-comparacion" aria-live="polite">
        ${sel ? `<h3>“${esc(sel.etiqueta)}” → hoy</h3>${htmlComparacionSnapshot(sel)}` : '<p class="muted">Elige un punto de control para compararlo con hoy.</p>'}
      </div>
      <div class="fila-botones snap-pie">
        <button type="button" class="btn ghost sm peligro" data-action="snapshot-limpiar-auto" ${lista.some(s => s.origen === 'auto') ? '' : 'disabled'}>Eliminar los automáticos</button>
      </div>`
    : '<p class="muted vacio-lista">Todavía no guardas ninguno. Se crea uno automático antes de importar notas, agregar ramos de una malla o eliminar un período.</p>'}`;
}

/* =========================================================
 * 7. Respaldo (exportar / importar JSON)
 * ========================================================= */

function exportarRespaldo(soloPerfil) {
  if (soloPerfil) {
    const p = perfil();
    descargarJSON(`ruta-academica-${slug(p.nombre)}-${hoy()}.json`, { tipo: 'ruta-academica-perfil', version: 4, exportado: new Date().toISOString(), perfil: p });
  } else {
    descargarJSON(`ruta-academica-respaldo-${hoy()}.json`, { tipo: 'ruta-academica-respaldo', exportado: new Date().toISOString(), ...store });
  }
  toast('Respaldo exportado');
}

function importarRespaldo(texto) {
  let datos;
  try { datos = JSON.parse(texto); } catch { toast('El archivo no es un JSON válido'); return; }
  if (!esObjeto(datos)) { toast('No se reconoció el formato del respaldo'); return; }
  // v25: todo pasa por la validación estricta; si algo se corrigió o descartó, se avisa con el número de ajustes
  saneo.ajustes = 0;
  const conAviso = msg => (saneo.ajustes ? `${msg}. Se corrigieron o descartaron ${saneo.ajustes} dato(s) inválidos del archivo` : msg);
  if (datos.tipo === 'ruta-academica-perfil' && esObjeto(datos.perfil)) {
    const p = normalizarPerfil({ ...datos.perfil, id: uid() });
    if (store.perfiles.some(x => x.nombre === p.nombre)) p.nombre = `${p.nombre.slice(0, 48)} (importado)`;
    conDeshacer(conAviso(`Perfil “${p.nombre}” importado`), () => { store.perfiles.push(p); store.perfilActivo = p.id; });
    return;
  }
  if (Array.isArray(datos.perfiles)) {
    const n = datos.perfiles.length;
    if (!n) { toast('El respaldo no trae perfiles'); return; }
    if (confirm(`El respaldo trae ${n} perfil(es). ¿Reemplazar TODOS tus datos actuales por el respaldo? (podrás deshacerlo)`)) {
      const nuevo = normalizarStore(datos);
      conDeshacer(conAviso('Respaldo restaurado'), () => { store = nuevo; });
    } else if (confirm(`¿Agregar los ${n} perfil(es) del respaldo junto a los actuales?`)) {
      const nuevos = datos.perfiles.slice(0, 100).filter(esObjeto).map(x => normalizarPerfil({ ...x, id: uid() }));
      conDeshacer(conAviso(`${nuevos.length} perfil(es) agregados`), () => { store.perfiles.push(...nuevos); });
    }
    return;
  }
  if (Array.isArray(datos.asignaturas)) { // respaldo con formato v1
    const p = perfilDesdeV1(datos);
    conDeshacer(conAviso('Datos v1 importados como perfil'), () => { store.perfiles.push(p); store.perfilActivo = p.id; });
    return;
  }
  toast('No se reconoció el formato del respaldo');
}


/* =========================================================
 * 8. Validación de entradas
 * ========================================================= */

/** El NEM siempre usa notas 1,0–7,0, sin importar la escala del perfil. */
const ESCALA_NEM = { min: 1, max: 7, aprobacion: 4 };
/** Promedio NEM escrito: "6,25" · "6.25" · "62" (→ 6,2) · "625" (→ 6,25). null si no es válido. */
function leerPromedioNEM(texto) {
  const s = String(texto ?? '').trim();
  const r = Calc.parsearNota(s, ESCALA_NEM);
  if (r && !Number.isNaN(r)) return r.nota;
  if (/^\d{3}$/.test(s) && Number(s) >= 100 && Number(s) <= 700) return Number(s) / 100;
  return null;
}

let avisoNotaEscalada = '';   // "65 se leyó como 6,5": se muestra junto al siguiente mensaje
/** Nota o meta escrita con coma o punto; en escalas cortas "65" → 6,5 (se avisa). null = vacío, NaN = inválida. */
function leerNota(texto) {
  const r = Calc.parsearNota(texto, escala());
  if (r === null || Number.isNaN(r)) return r;
  if (r.escalada) {
    avisoNotaEscalada = `“${String(texto).trim()}” se leyó como ${fmtNota(r.nota)}.`;
    toast(avisoNotaEscalada);
  }
  return r.nota;
}
/** Nota para mostrar en un campo editable (con coma decimal, como se escribe en Chile). */
const fmtNota = n => (typeof n === 'number' && Number.isFinite(n) ? String(Calc.redondear(n, 2)).replace('.', ',') : '');
/** Ponderación escrita por el estudiante → % (vacío = 0). Acepta 25 · 25% · 0,25 · 1/4 (ver Calc.parsearPeso). */
function leerPeso(texto) {
  const w = leerPesoUsuario(texto);
  return w === null ? 0 : w;
}
const MSG_PESO = 'Ponderación no válida: usa 0–100 %, un decimal 0–1 (0,25) o una fracción (1/4)';
const leerNumeroONulo = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

/* =========================================================
 * 9. Eventos (delegados en document)
 * ========================================================= */

document.addEventListener('click', e => {
  const cabPleg = e.target.closest?.('[data-plegable] > .seccion-cab, [data-plegable] > .promocion-cab');
  if (cabPleg && !e.target.closest('button, a, input, select, label, textarea')) {
    const id = cabPleg.parentElement.dataset.plegable;
    if (plegados.has(id)) plegados.delete(id); else plegados.add(id);
    aplicarPlegables();
    return;
  }
  // Cerrar el menú "Más" al hacer clic fuera
  document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  if (!e.target.closest('.flotante-ancla')) cerrarFlotantes();

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  btn.closest('details.menu')?.removeAttribute('open');
  const p = perfil();
  const asig = asigSeleccionada();

  switch (btn.dataset.action) {
    case 'toast-accion': {
      const fn = accionToast;
      accionToast = null;
      $('#toast').classList.remove('visible');
      fn?.();
      break;
    }
    /* --- Navegación --- */
    case 'vista': {
      store.vista = btn.dataset.vista;
      actualizar();
      window.scrollTo({ top: 0 });
      const etiqueta = btn.querySelector('span:not(.pill)');
      if (esMovil() && etiqueta && getComputedStyle(etiqueta).display === 'none') mostrarEtiquetaSeccion(etiqueta.textContent.trim());
      break;
    }
    case 'subvista': store.subvista = btn.dataset.sub; actualizar(); break;
    case 'periodo': p.periodoActivo = btn.dataset.id; actualizar(); break;
    case 'seleccionar':
      if (p.seleccionada !== btn.dataset.id) rotacionConsejos[btn.dataset.id] = (rotacionConsejos[btn.dataset.id] || 0) + 1;
      p.seleccionada = btn.dataset.id;
      actualizar();
      if (window.innerWidth < 900) setTimeout(() => $('#detalle').scrollIntoView({ behavior: 'smooth' }), 30);
      break;

    /* --- Perfiles y datos --- */
    case 'abrir-perfil': abrirPerfil(false); break;
    case 'nuevo-perfil': abrirPerfil(true); break;
    case 'eliminar-perfil': // v4: el perfil va a la papelera (no se borra de golpe)
      if (store.perfiles.length === 1) { toast('Debe quedar al menos un perfil activo'); return; }
      $('#dlg-perfil').close();
      enviarAPapelera([p.id]);
      break;
    case 'abrir-gestion': abrirGestion('perfiles'); break;
    case 'abrir-ficha': abrirFicha(); break;
    case 'abrir-ayuda': abrirGuia('ayuda'); break;
    case 'combo-limpiar': abrirCombo(true); break;
    case 'combo-alternar': if (combo.abierto) cerrarCombo(); else { $('#combo-input')?.focus(); abrirCombo(false); } break;
    case 'editar-corte-sel': abrirEditorCorte(btn.dataset.id); break;
    case 'abrir-guia': abrirGuia('inicio'); break;
    case 'guia-paso-a-paso': guia = { modo: 'inicio', paso: 0 }; renderGuia(); break;
    case 'guia-siguiente': guia.paso = Math.min(REF.GUIA_INICIO.length - 1, guia.paso + 1); renderGuia(); break;
    case 'guia-anterior': guia.paso = Math.max(0, guia.paso - 1); renderGuia(); break;
    case 'guia-ir': guia.paso = Number(btn.dataset.paso); renderGuia(); break;
    case 'guia-accion': {
      // Lleva directo a la función del paso (la guía se cierra; se puede reabrir desde Ayuda)
      $('#dlg-guia').close();
      const accion = btn.dataset.accion;
      // v16: al cerrar el Perfil (o el importador) se vuelve a la guía en este mismo paso
      if (accion === 'abrir-perfil' || accion === 'abrir-foto') guiaRetorno = { ...guia };
      if (accion === 'abrir-perfil') abrirPerfil(false);
      else if (accion === 'abrir-foto') abrirImportarFoto();
      else if (accion === 'ir-admision') { store.vista = 'admision'; actualizar(); }
      break;
    }
    case 'decimas-aplicar': {
      const ids = new Set(Calc.analizarAsignatura(asig, p.escala).evals.map(ev => ev.id));
      const sinAplicar = (asig.decimas || []).filter(x => !(x.evalId && ids.has(x.evalId)));
      conDeshacer(`Décimas aplicadas en una evaluación (${sinAplicar.length})`, () => { sinAplicar.forEach(x => { x.evalId = btn.dataset.eval; }); });
      break;
    }
    case 'decima-eliminar': {
      const id = btn.closest('[data-decima]').dataset.decima;
      conDeshacer('Décimas eliminadas', () => { asig.decimas = (asig.decimas || []).filter(x => x.id !== id); });
      break;
    }
    case 'novedades': alternarFlotante('#panel-novedades', btn); break;
    case 'novedad-leer': marcarNovedades([btn.dataset.id]); break;
    case 'novedades-leer-todas': marcarNovedades(REF.NOVEDADES.map(n => n.id)); break;
    case 'apoyar': alternarFlotante('#panel-apoyo', btn); break;
    case 'apoyar-proximamente': e.preventDefault(); toast('¡Gracias! El enlace de donaciones estará disponible próximamente.'); break;
    case 'compartir-app': compartirApp(); break;
    /* --- Puntos de control (v26) --- */
    case 'abrir-snapshots': abrirSnapshots(); break;
    case 'snapshot-comparar': snapshotComparado = btn.dataset.id; renderSnapshots(); $(`#snapshots-cuerpo [data-action="snapshot-comparar"][data-id="${CSS.escape(btn.dataset.id)}"]`)?.focus(); break;
    case 'snapshot-eliminar': {
      const s = p.snapshots.find(x => x.id === btn.dataset.id);
      if (!s) return;
      conDeshacer(`Punto de control “${s.etiqueta}” eliminado`, () => { p.snapshots = p.snapshots.filter(x => x.id !== s.id); });
      if (snapshotComparado === s.id) snapshotComparado = p.snapshots.at(-1)?.id ?? null;
      renderSnapshots();
      break;
    }
    case 'snapshot-limpiar-auto': {
      const n = p.snapshots.filter(x => x.origen === 'auto').length;
      if (!n) return;
      conDeshacer(`${n} punto(s) de control automáticos eliminados`, () => { p.snapshots = p.snapshots.filter(x => x.origen !== 'auto'); });
      if (!p.snapshots.some(x => x.id === snapshotComparado)) snapshotComparado = p.snapshots.at(-1)?.id ?? null;
      renderSnapshots();
      break;
    }
    case 'abrir-papelera': abrirGestion('papelera'); break;
    case 'gestion-tab': gestion = { tab: btn.dataset.tab, sel: new Set() }; renderGestion(); break;
    case 'enviar-papelera': enviarAPapelera([...gestion.sel]); gestion.sel.clear(); break;
    case 'papelera-restaurar': restaurarDePapelera([...gestion.sel]); gestion.sel.clear(); break;
    case 'papelera-eliminar':
      eliminarDefinitivo([...gestion.sel], `¿Eliminar definitivamente ${gestion.sel.size} perfil(es) con todas sus notas? Solo podrás deshacerlo durante unos segundos.`);
      break;
    case 'papelera-vaciar':
      eliminarDefinitivo(store.papelera.map(x => x.id), `¿Vaciar la papelera? Se eliminarán definitivamente ${store.papelera.length} perfil(es). Solo podrás deshacerlo durante unos segundos.`);
      break;
    case 'otra-frase': fraseDesplazamiento++; fraseAnimar = true; renderFrase(); break;
    case 'unidad-peso':
      p.unidadPeso = btn.dataset.unidad === 'dec' ? 'dec' : 'pct';
      actualizar();
      toast(p.unidadPeso === 'dec' ? 'Ponderaciones en decimal (0–1): 0,25 = 25%' : 'Ponderaciones en porcentaje');
      break;
    case 'cerrar-dialogo': {
      const dlg = btn.closest('dialog');
      dlg.close();
      if (['dlg-perfil', 'dlg-foto'].includes(dlg.id)) volverAGuia();   // v16: regreso a la guía
      break;
    }
    case 'cargar-ejemplo':
      if (!confirm('Esto reemplazará TODOS tus perfiles por datos de ejemplo (podrás deshacerlo). ¿Continuar?')) return;
      conDeshacer('Datos de ejemplo cargados: 3 perfiles', () => { store = datosEjemplo(); });
      sim = {}; simNEM = null;
      break;
    case 'reiniciar':
      if (!confirm('¿Borrar todos los perfiles, notas y configuración? Podrás deshacerlo solo durante unos segundos.')) return;
      conDeshacer('Datos borrados', () => { store = storeVacio(); });
      sim = {}; simNEM = null;
      break;
    case 'exportar-todo': exportarRespaldo(false); break;
    case 'exportar-perfil': exportarRespaldo(true); break;
    case 'importar-respaldo': $('#archivo-respaldo').click(); break;

    /* --- Períodos --- */
    case 'agregar-periodo': {
      const r = REGIMENES[p.regimen];
      const nuevo = { id: uid(), nombre: `${r.nombre} ${p.periodos.length + 1}` };
      p.periodos.push(nuevo);
      p.periodoActivo = nuevo.id;
      actualizar();
      break;
    }
    case 'renombrar-periodo': abrirMenuPeriodo(p.periodoActivo, btn, 'renombrar'); break;
    case 'menu-periodo': abrirMenuPeriodo(btn.dataset.id, btn); break;
    case 'menu-renombrar': abrirMenuPeriodo(menuPeriodo.id, null, 'renombrar'); break;
    case 'menu-mover': { const id = menuPeriodo.id; cerrarMenuPeriodo(false); moverPeriodo(id, Number(btn.dataset.delta)); break; }
    case 'menu-cerrar': cerrarMenuPeriodo(); break;
    case 'menu-eliminar':
    case 'eliminar-periodo': {
      if (btn.dataset.action === 'menu-eliminar') { p.periodoActivo = menuPeriodo.id; cerrarMenuPeriodo(false); }
      if (p.periodos.length === 1) { toast('Debe existir al menos un período'); return; }
      const per = p.periodos.find(x => x.id === p.periodoActivo);
      if (!per) return;
      puntoAutomatico(`eliminar ${per.nombre}`);   // v26: queda registro de cómo ibas antes de borrarlo
      conDeshacer(`“${per.nombre}” eliminado`, () => {
        p.asignaturas = p.asignaturas.filter(a => a.periodoId !== per.id);
        p.periodos = p.periodos.filter(x => x.id !== per.id);
        delete p.metaGeneral.periodos[per.id];
        p.periodoActivo = p.periodos[0].id;
      });
      break;
    }

    /* --- Meta general --- */
    case 'aplicar-metas-sugeridas': {
      const plan = Calc.planMetaGeneral(analisisVisibles(), metaGeneralVista(), p.escala);
      const abiertas = plan ? plan.sugerencias.filter(s => s.abierta) : [];
      if (!abiertas.length) { toast('No hay asignaturas con evaluaciones pendientes a las que ajustar la meta'); break; }
      conDeshacer(`Metas actualizadas en ${abiertas.length} asignatura(s)`, () => {
        abiertas.forEach(s => {
          const a = p.asignaturas.find(x => x.id === s.id);
          a.meta = Calc.limitar(Calc.redondearArriba(s.metaSugerida, 1), p.escala.min, p.escala.max);
        });
      });
      sim = {};
      break;
    }
    case 'ajustar-meta-general-max': {
      const plan = Calc.planMetaGeneral(analisisVisibles(), metaGeneralVista(), p.escala);
      if (esConsolidado()) p.metaGeneral.global = plan.metaMaximaGeneral;
      else p.metaGeneral.periodos[p.periodoActivo] = plan.metaMaximaGeneral;
      actualizar();
      toast(`Meta general ajustada a ${plan.metaMaximaGeneral.toFixed(1)}`);
      break;
    }

    /* --- Asignaturas, evaluaciones y controles --- */
    case 'eliminar-asignatura':
      salirYLuego(`#lista [data-id="${CSS.escape(asig.id)}"], #detalle > *`, () => conDeshacer(`“${asig.nombre}” eliminada`, () => {
        p.asignaturas = p.asignaturas.filter(x => x.id !== asig.id);
        p.seleccionada = null;
      }));
      break;
    case 'ajustar-meta-max': {
      const m = Calc.metaMaximaAlcanzable(Calc.analizarAsignatura(asig, p.escala));
      asig.meta = m;
      delete sim[asig.id];
      actualizar();
      toast(`Nueva meta: ${m.toFixed(1)}. ¡A trabajar por ella!`);
      break;
    }
    case 'eliminar-eval': {
      const ev = asig.evaluaciones.find(x => x.id === btn.closest('[data-eval]').dataset.eval);
      conDeshacer(`“${ev.nombre}” eliminada`, () => { asig.evaluaciones = asig.evaluaciones.filter(x => x !== ev); });
      delete sim[asig.id];
      break;
    }
    case 'plegar-bloque': {
      const id = btn.closest('[data-eval]').dataset.eval;
      if (bloquesCerrados.has(id)) bloquesCerrados.delete(id); else bloquesCerrados.add(id);
      render();
      break;
    }
    case 'agregar-control': {
      const b = asig.evaluaciones.find(x => x.id === btn.closest('[data-bloque]').dataset.bloque);
      b.controles.push({ id: uid(), nombre: `Control ${b.controles.length + 1}`, nota: null });
      delete sim[asig.id];
      actualizar();
      break;
    }
    case 'eliminar-control': {
      const fila = btn.closest('[data-ctrl]');
      const b = asig.evaluaciones.find(x => x.id === fila.dataset.bloque);
      const c = b.controles.find(x => x.id === fila.dataset.ctrl);
      conDeshacer(`“${c.nombre}” eliminado`, () => { b.controles = b.controles.filter(x => x !== c); });
      delete sim[asig.id];
      break;
    }
    case 'distribuir': {
      const r = Calc.distribuirPonderacion(asig.evaluaciones);
      if (!r.ok) { toast('No hay porcentaje restante que distribuir'); return; }
      asig.evaluaciones.forEach(ev => { if (ev.id in r.pesos) ev.peso = r.pesos[ev.id]; });
      delete sim[asig.id];
      actualizar();
      toast(`Se repartió ${fmtPct(r.restante)} entre ${r.destinatarios} evaluación(es) pendiente(s)`);
      break;
    }
    case 'sim-reset': delete sim[asig.id]; render(); break;
    case 'otros-consejos': rotacionConsejos[asig.id] = (rotacionConsejos[asig.id] || 0) + 1; render(); break;
    case 'unificar-duplicadas': {
      const grupo = btn.dataset.ids.split(',').map(id => p.asignaturas.find(a => a.id === id)).filter(Boolean);
      if (grupo.length < 2) break;
      conDeshacer(`${grupo.length} asignaturas unificadas en “${grupo[0].nombre}”`, () => grupo.slice(1).forEach(o => unificarAsignaturas(grupo[0], o)));
      break;
    }
    case 'toggle-cierre':
      asig.cerrada = !asig.cerrada;
      delete sim[asig.id];
      actualizar();
      toast(asig.cerrada ? `“${asig.nombre}” cerrada: su promedio se calcula con lo ya rendido. Puedes reabrirla cuando quieras.` : `“${asig.nombre}” reabierta: vuelven a contar sus evaluaciones pendientes.`);
      break;
    case 'guia-check':
    case 'guia-check-todas': {
      const a = Calc.analizarAsignatura(asig, p.escala);
      const lista = btn.dataset.action === 'guia-check'
        ? REF.GUIA_EVALUACION.consejos.filter(c => c.id === btn.dataset.consejo)
        : consejosGuia(enfoqueGuia(a), asig.id);
      const nuevas = lista.filter(c => !enChecklist(asig, c.check));
      asig.checklist ??= [];
      nuevas.forEach(c => asig.checklist.push({ id: uid(), texto: c.check, hecho: false }));
      actualizar();
      toast(nuevas.length ? `${nuevas.length} tarea(s) agregada(s) al checklist de ${asig.nombre}` : 'Ya estaban en tu checklist');
      break;
    }
    case 'eliminar-item': {
      const id = btn.closest('[data-item]').dataset.item;
      asig.checklist = asig.checklist.filter(i => i.id !== id);
      actualizar();
      break;
    }

    /* --- Currículum y malla --- */
    case 'abrir-curriculo': abrirCurriculo(); break;
    case 'agregar-curriculo': agregarDesdeCurriculo(); break;
    case 'abrir-malla': abrirMalla(); break;
    case 'cargar-malla': {
      const carrera = $('#malla-carrera').value.trim();
      const universidad = $('#malla-uni').value.trim();
      if (!REF.MALLAS[carrera]) { toast('Elige una carrera de la lista (o empieza una malla en blanco)'); return; }
      if (p.uni.malla && !confirm('¿Reemplazar tu malla actual por la plantilla referencial?')) return;
      p.uni.malla = REF.construirMalla(carrera, universidad);
      p.uni.carrera = carrera;
      p.uni.universidad = universidad;
      guardar(); renderMalla(); render();
      toast('Malla referencial cargada: revísala y edítala con tu plan real');
      break;
    }
    case 'malla-vacia':
      if (p.uni.malla && !confirm('¿Reemplazar tu malla actual por una en blanco?')) return;
      p.uni.malla = {
        universidad: $('#malla-uni').value.trim(), carrera: $('#malla-carrera').value.trim(),
        semestres: [{ nombre: 'Semestre 1', ramos: [{ nombre: '' }] }],
        fuente: 'Malla creada por el estudiante', version: hoy(), actualizada: hoy(),
      };
      guardar(); renderMalla(); render();
      break;
    case 'malla-add-ramo': {
      const s = p.uni.malla.semestres[btn.dataset.sem];
      s.ramos.push({ nombre: '' });
      marcarMallaEditada(p.uni.malla); guardar(); renderMalla();
      document.querySelector(`[data-key="malla-ramo-${btn.dataset.sem}-${s.ramos.length - 1}"]`)?.focus();
      break;
    }
    case 'malla-del-ramo':
      p.uni.malla.semestres[btn.dataset.sem].ramos.splice(Number(btn.dataset.ramo), 1);
      marcarMallaEditada(p.uni.malla); guardar(); renderMalla();
      break;
    case 'malla-add-sem':
      p.uni.malla.semestres.push({ nombre: `Semestre ${p.uni.malla.semestres.length + 1}`, ramos: [{ nombre: '' }] });
      marcarMallaEditada(p.uni.malla); guardar(); renderMalla();
      break;
    case 'malla-del-sem': {
      const s = p.uni.malla.semestres[btn.dataset.sem];
      if (!confirm(`¿Eliminar “${s.nombre}” de la malla?`)) return;
      p.uni.malla.semestres.splice(Number(btn.dataset.sem), 1);
      marcarMallaEditada(p.uni.malla); guardar(); renderMalla();
      break;
    }
    case 'malla-a-asignaturas': {
      const s = p.uni.malla.semestres[btn.dataset.sem];
      const destino = esConsolidado() ? p.periodos.at(-1).id : p.periodoActivo;
      const antes = new Set(p.asignaturas.map(a => a.id));
      puntoAutomatico(`agregar ramos de ${s.nombre}`);
      const n = agregarAsignaturas(s.ramos.map(r => r.nombre), destino, metaInicialAsignatura(p));
      mostrarAgregadas(p, destino, antes);
      renderMalla();
      toast(n ? `${n} ramo(s) de ${s.nombre} agregados a ${nombrePeriodo(destino)}` : 'Esos ramos ya estaban en el período');
      break;
    }
    case 'malla-exportar': {
      const texto = JSON.stringify(p.uni.malla ?? { semestres: [] }, null, 2);
      $('#malla-texto').value = texto;
      $('#malla-texto').closest('details')?.setAttribute('open', '');
      navigator.clipboard?.writeText(texto).then(() => toast('JSON copiado al portapapeles'), () => toast('JSON listo en el cuadro de texto'));
      break;
    }
    case 'malla-importar':
      try {
        const r = parsearMalla($('#malla-texto').value);
        if (!r || !r.semestres.length) { toast('Pega una malla en JSON o texto'); return; }
        // v25: la malla pegada (JSON o texto) se valida igual que la guardada: textos acotados y estructura fija
        p.uni.malla = mallaSana({
          universidad: r.universidad ?? $('#malla-uni').value.trim(), carrera: r.carrera ?? $('#malla-carrera').value.trim(),
          semestres: r.semestres, fuente: r.fuente ? `${r.fuente} · importada` : 'Importada por el estudiante',
          version: r.version ?? hoy(), actualizada: hoy(),
        });
        guardar(); renderMalla(); render();
        toast(`Malla importada: ${r.semestres.length} semestre(s)`);
      } catch (err) {
        toast(`No se pudo importar: ${err.message}`);
      }
      break;

    /* --- Importar desde foto --- */
    case 'abrir-foto': abrirImportarFoto(); break;
    case 'abrir-fechas': abrirFechas(); break;
    case 'ir-a-notas': cerrarSidebar(); irAMisNotas(); break;
    case 'alternar-sidebar': alternarSidebar(); break;
    case 'sb-grupo': alternarSbGrupo(btn.dataset.grupo); break;
    case 'ir-metodos': estudioSel = { asig: btn.dataset.asig }; store.vista = 'estudio'; actualizar(); window.scrollTo({ top: 0 }); break;
    case 'estudio-sel': estudioSel = btn.dataset.asig ? { asig: btn.dataset.asig } : { grupo: btn.dataset.grupo }; renderEstudio(); break;
    case 'estudio-check': {
      const a2 = p.asignaturas.find(x => x.id === btn.dataset.asig);
      if (!a2) break;
      a2.checklist ??= [];
      if (a2.checklist.some(c => Calc.claveAsignatura(c.texto) === Calc.claveAsignatura(btn.dataset.check))) { toast('Esa tarea ya está en el checklist'); break; }
      a2.checklist.push({ id: uid(), texto: btn.dataset.check, hecho: false });
      guardar(); renderEstudio();
      toast(`Agregado al checklist de ${a2.nombre}`);
      break;
    }
    case 'enfocar-nueva-materia': {
      const campo = $('#form-asignatura [name=nombre]');
      campo?.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => campo?.focus({ preventScroll: true }), movimientoReducido() ? 0 : 300);
      break;
    }
    case 'ir-ensayos': store.vista = 'paes'; store.paesSub = 'ensayos'; guardar(); render(); window.scrollTo({ top: 0 }); $('#paes-cuerpo [data-key="ens-correctas"]')?.focus(); break;
    case 'escala-prueba': paesEscala.prueba = btn.dataset.prueba; renderPaes(); break;
    case 'uni-filtro': uniFiltro.tipo = btn.dataset.tipo; renderUniversidades(); break;
    case 'uni-ver-carreras': {
      store.vista = 'admision'; store.subvista = 'cortes';
      combo = { abierto: true, query: btn.dataset.sigla, activo: 0, resultados: [] };
      guardar(); render(); window.scrollTo({ top: 0 });
      $('#combo-input')?.focus();
      break;
    }
    case 'bienvenida-crear': crearPerfilBienvenida(false); break;
    case 'bienvenida-detalles': crearPerfilBienvenida(true); break;
    case 'paes-sub': store.paesSub = btn.dataset.sub; ensayoEdicion = null; actualizar(); break;
    case 'ensayo-editar': {
      const e = p.ensayos.find(x => x.id === btn.dataset.id);
      if (!e) break;
      ensayoEdicion = e.id;
      ensayoBorrador = { nombre: e.nombre, fecha: e.fecha, prueba: e.prueba, correctas: e.correctas ?? '', puntaje: e.puntajeManual ?? '', escala: e.escala };
      renderPaes();
      $('#paes-cuerpo [data-key="ens-correctas"]')?.focus();
      $('#paes-cuerpo .ens-form-panel')?.scrollIntoView({ block: 'nearest', behavior: movimientoReducido() ? 'auto' : 'smooth' });
      break;
    }
    case 'ensayo-cancelar': ensayoEdicion = null; ensayoBorrador = { ...ensayoBorrador, correctas: '', puntaje: '' }; renderPaes(); break;
    case 'ensayo-eliminar': {
      const e = p.ensayos.find(x => x.id === btn.dataset.id);
      if (!e) break;
      if (ensayoEdicion === e.id) ensayoEdicion = null;
      conDeshacer(`Ensayo “${e.nombre}” eliminado`, () => { p.ensayos = p.ensayos.filter(x => x.id !== e.id); });
      break;
    }
    case 'ensayos-al-simulador': ensayosAlSimulador(btn.dataset.modo); break;
    case 'alternar-tema': alternarFlotante('#panel-tema', btn); break;
    case 'elegir-tema': {
      elegirTema(btn.dataset.tema, btn);
      renderPanelTema();
      $(`#panel-tema [data-tema="${CSS.escape(btn.dataset.tema)}"]`)?.focus();
      toast(`Fondo: ${TEMAS[store.config.tema].nombre}`);
      break;
    }
    case 'fecha-quitar': {
      const cal = p.calendario;
      const ev = cal.eventos.find(x => x.id === btn.dataset.id);
      if (!ev) break;
      cal.eventos = cal.eventos.filter(x => x.id !== ev.id);
      if (ev.origen === 'ref' && !cal.quitadosRef.includes(ev.id)) cal.quitadosRef.push(ev.id);
      actualizar(); renderFechas();
      toast(`“${ev.nombre}” quitada`, { etiqueta: 'Deshacer', fn: () => { cal.eventos.push(ev); cal.quitadosRef = cal.quitadosRef.filter(id => id !== ev.id); actualizar(); if ($('#dlg-fechas').open) renderFechas(); } });
      break;
    }
    case 'fechas-restaurar': {
      const n = p.calendario.quitadosRef.length;
      p.calendario.quitadosRef = [];
      p.calendario.versionRef = 0;
      p.calendario = migrarCalendario(p.calendario);
      actualizar(); renderFechas();
      toast(n ? `Se restauraron ${n} fecha(s) de referencia` : 'No había fechas de referencia quitadas');
      break;
    }
    case 'fechas-pasadas': fechasVerPasadas = !fechasVerPasadas; renderFechas(); break;
    case 'foto-ocr': ejecutarOCR(); break;
    case 'foto-analizar': analizarTextoImportado(); break;
    case 'foto-volver': importacion.grupos = null; renderImportar(); break;
    case 'foto-confirmar': confirmarImportacion(); break;

    /* --- NEM --- */
    case 'importar-nem': {
      const g = $('#nem-import-grupo').value;
      const r = Calc.parsearTablaNEM($('#nem-import-texto').value);
      if (!r.ok) { toast(r.errores); return; }
      store.tablasNEM[g] = { tabla: r.tabla, fecha: hoy() };
      actualizar();
      toast(`Tabla ${g} cargada (${r.tabla.length} filas)`);
      break;
    }
    case 'quitar-nem':
      conDeshacer('Tabla quitada', () => { delete store.tablasNEM[btn.dataset.grupo]; });
      break;

    /* --- Catálogo de cortes --- */
    case 'nuevo-corte': abrirEditorCorte(null); break;
    case 'editar-corte': abrirEditorCorte(btn.closest('[data-corte]').dataset.corte); break;
    case 'simular-corte':
      p.admision.seleccion = btn.closest('[data-corte]').dataset.corte;
      actualizar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'eliminar-corte': {
      const id = btn.closest('[data-corte]').dataset.corte;
      const c = store.catalogoCortes.find(x => x.id === id);
      conDeshacer(`“${c.carrera}” eliminada del catálogo`, () => { store.catalogoCortes = store.catalogoCortes.filter(x => x.id !== id); });
      break;
    }
    case 'exportar-catalogo':
      descargarJSON(`catalogo-cortes-${hoy()}.json`, { tipo: 'ruta-academica-catalogo', exportado: new Date().toISOString(), catalogo: store.catalogoCortes });
      break;
    case 'importar-catalogo': $('#archivo-catalogo').click(); break;
    case 'restaurar-catalogo':
      conDeshacer('Catálogo restaurado a la plantilla', () => { store.catalogoCortes = clonar(REF.CATALOGO_CORTES); });
      break;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  const p = perfil();

  if (t.dataset.escalaSel !== undefined) { paesEscala.escala = t.value; renderPaes(); return; }
  if (t.dataset.ens === 'prueba' || t.dataset.ens === 'escala') { ensayoBorrador[t.dataset.ens] = t.value; preservarFoco(renderPaes); return; }
  if (t.dataset.fechaCampo) {
    const ev = p.calendario.eventos.find(x => x.id === t.closest('[data-fecha-id]')?.dataset.fechaId);
    if (!ev) return;
    const campo = t.dataset.fechaCampo;
    if (campo === 'nombre') ev.nombre = t.value.trim().slice(0, 80) || ev.nombre;
    else if (campo === 'fecha') ev.fecha = /^\d{4}-\d{2}-\d{2}$/.test(t.value) ? t.value : '';
    else if (campo === 'tipo' && TIPOS_FECHA[t.value]) ev.tipo = t.value;
    if (ev.origen === 'ref') ev.origen = 'editada';   // ya no es el dato de referencia original
    actualizar();
    setTimeout(() => preservarFoco(renderFechas), 0);
    return;
  }
  if (t.id === 'sel-perfil' && t.value === '__nuevo') { t.value = store.perfilActivo; abrirPerfil(true); return; }
  if (t.id === 'sel-perfil') { store.perfilActivo = t.value; sim = {}; simNEM = null; actualizar(); return; }

  /* Archivos: respaldo, catálogo, foto */
  if (t.id === 'archivo-respaldo' || t.id === 'archivo-catalogo') {
    const archivo = t.files?.[0];
    t.value = '';
    if (!archivo) return;
    // v25: un respaldo real pesa kilobytes; un archivo enorme congelaría la página al leerlo
    if (archivo.size > 10 * 1024 * 1024) { toast('El archivo es demasiado grande (máx. 10 MB). ¿Elegiste el archivo correcto?'); return; }
    archivo.text().catch(() => { toast('No se pudo leer el archivo'); return null; }).then(texto => {
      if (texto === null) return;
      if (t.id === 'archivo-respaldo') { importarRespaldo(texto); return; }
      try {
        const nuevas = importarCatalogo(texto);
        const reemplazar = confirm(`Se leyeron ${nuevas.length} carrera(s). ¿Reemplazar el catálogo actual? (Cancelar = agregarlas al catálogo)`);
        conDeshacer(`${nuevas.length} carrera(s) importadas`, () => {
          store.catalogoCortes = reemplazar ? nuevas : [...store.catalogoCortes, ...nuevas];
        });
      } catch (err) { toast(`No se pudo importar el catálogo: ${err.message}`); }
    });
    return;
  }
  if (t.dataset.fotoArchivo !== undefined) { cargarArchivoImportar(t.files?.[0]); t.value = ''; return; }
  if (t.dataset.impPrevio !== undefined) {
    importacion.destinoPrevio = t.value;
    importacion.texto = $('#foto-texto')?.value ?? importacion.texto;
    renderImportar();
    if (t.value === '__nueva') $('[data-imp-previo-nueva]')?.focus();
    return;
  }
  if (t.dataset.impPrevioNueva !== undefined) { importacion.nuevaPrevia = t.value.trim(); return; }
  if (t.dataset.impModoPeso !== undefined) { importacion.modoPeso = t.value; return; }
  if (t.dataset.impPeriodo !== undefined) { importacion.informe.periodoElegido = t.value; analizarInforme(); return; }
  if (t.dataset.impGrupoIncluir !== undefined) {
    importacion.grupos[Number(t.dataset.impGrupoIncluir)].filas.forEach(fl => { fl.incluir = t.checked; });
    setTimeout(() => preservarFoco(renderImportar), 0);
    return;
  }
  if (t.dataset.impConfirmar !== undefined) {
    importacion.grupos[Number(t.dataset.impConfirmar)].materiaConfirmada = t.checked;
    setTimeout(() => preservarFoco(renderImportar), 0);
    return;
  }
  if (t.closest('#dlg-perfiles')) { cambioGestion(t); return; }
  if (t.dataset.config === 'ocrTesseract') {
    store.config.ocrTesseract = t.checked;
    guardar();
    importacion.texto = $('#foto-texto')?.value ?? importacion.texto;
    renderImportar();
    return;
  }

  /* Confirmación de importación: ediciones en la propuesta */
  if (t.dataset.imp || t.dataset.impIncluir || t.dataset.impMateria || t.dataset.impNueva !== undefined || t.dataset.impBloque || t.dataset.impBloquePeso) {
    const g = i => importacion.grupos[Number(i)];
    if (t.dataset.imp) {
      const [i, j, campo] = t.dataset.imp.split(':');
      const fila = g(i).filas[Number(j)];
      if (campo === 'evaluacion') fila.evaluacion = t.value.trim() || fila.evaluacion;
      else if (campo === 'nota') {
        const n = leerNota(t.value);
        if (Number.isNaN(n)) { toast(`La nota debe estar entre ${p.escala.min} y ${p.escala.max}`); } else fila.nota = n;
      } else if (campo === 'peso') {
        const w = leerPesoUsuario(t.value);
        if (Number.isNaN(w)) toast('Ponderación no válida: usa 0–100 %, un decimal 0–1 (0,25) o una fracción (1/4)'); else fila.peso = w;
        fila.avisos = fila.avisos.filter(a => !a.startsWith('Falta la ponderación'));
        if (fila.peso === null) fila.avisos.push('Falta la ponderación (%).');
      }
    } else if (t.dataset.impIncluir) {
      const [i, j] = t.dataset.impIncluir.split(':');
      g(i).filas[Number(j)].incluir = t.checked;
    } else if (t.dataset.impMateria) {
      g(t.dataset.impMateria).destino = t.value;
      g(t.dataset.impMateria).requiereConfirmar = false; // elegirla a mano ya es una confirmación explícita
    } else if (t.dataset.impNueva !== undefined) {
      g(t.dataset.impNueva).nuevaNombre = t.value.trim();
    } else if (t.dataset.impBloque) {
      g(t.dataset.impBloque).comoBloque = t.checked;
    } else if (t.dataset.impBloquePeso) {
      const w = leerPesoUsuario(t.value);
      if (Number.isNaN(w)) toast('Ponderación no válida: usa 0–100 %, un decimal 0–1 (0,25) o una fracción (1/4)');
      g(t.dataset.impBloquePeso).pesoBloque = Number.isNaN(w) ? null : w;
    }
    setTimeout(() => preservarFoco(renderImportar), 0);
    return;
  }

  /* Formulario de perfil */
  if (t.closest('#form-perfil')) {
    if (t.name === 'modalidad') {
      const f = $('#form-perfil');
      f.dataset.modalidad = t.value;
      llenarNiveles(f, f.nivel.value);
    }
    return;
  }
  if (t.closest('#form-corte')) { if (t.name?.startsWith('w-')) actualizarSumaPonderaciones(); return; }
  if (t.closest('[data-form="eval"]') && t.name === 'tipo') { t.form.dataset.tipo = t.value; return; }

  if (t.id === 'cur-periodo') {
    $('#cur-secciones').innerHTML = htmlSeccionesCurriculo(REF.seccionesCurriculo(p.modalidad, p.nivel, p.especialidad), t.value);
    return;
  }
  /* Malla */
  if (t.dataset.mallaSem !== undefined) {
    const s = p.uni.malla.semestres[t.dataset.mallaSem];
    s.nombre = t.value.trim() || s.nombre;
    marcarMallaEditada(p.uni.malla); guardar();
    setTimeout(() => preservarFoco(renderMalla), 0);
    return;
  }
  if (t.dataset.mallaRamo !== undefined) {
    const [i, j] = t.dataset.mallaRamo.split(':').map(Number);
    p.uni.malla.semestres[i].ramos[j].nombre = t.value.trim();
    marcarMallaEditada(p.uni.malla); guardar();
    setTimeout(() => preservarFoco(renderMalla), 0);
    return;
  }
  /* Meta general */
  if (t.dataset.metaGeneral !== undefined) {
    const v = t.value === '' ? null : leerNota(t.value);
    if (Number.isNaN(v)) { toast(`La meta debe estar entre ${p.escala.min} y ${p.escala.max}`); render(); return; }
    if (esConsolidado()) p.metaGeneral.global = v;
    else if (v === null) delete p.metaGeneral.periodos[p.periodoActivo];
    else p.metaGeneral.periodos[p.periodoActivo] = v;
    metaGeneralAbierta = true;
    actualizar();
    return;
  }
  /* NEM y admisión */
  if (t.dataset.nem === 'grupo') { p.nem.grupo = t.value; actualizar(); return; }
  if (t.dataset.nemManual) {
    const r = Calc.parsearNota(t.value, ESCALA_NEM);
    if (Number.isNaN(r)) { toast('El promedio anual debe estar entre 1,0 y 7,0 (también puedes escribir 62 para 6,2)'); render(); return; }
    const v = r === null ? null : r.nota;
    if (r?.escalada) toast(`“${t.value.trim()}” se leyó como ${fmtNota(v)}`);
    if (v === null) delete p.nem.manual[t.dataset.nemManual]; else p.nem.manual[t.dataset.nemManual] = v;
    simNEM = null;
    actualizar();
    return;
  }
  if (t.dataset.adm) {
    const v = leerNumeroONulo(t.value);
    if (v !== null && !(v >= 100 && v <= 1000)) { toast('Los puntajes PAES/NEM/Ranking van de 100 a 1000'); render(); return; }
    if (v === null) delete p.admision.puntajes[t.dataset.adm]; else p.admision.puntajes[t.dataset.adm] = v;
    actualizar();
    return;
  }
  if (t.dataset.admSel !== undefined) { p.admision.seleccion = t.value || null; actualizar(); return; }
  if (t.dataset.admCorte) {
    const v = leerNumeroONulo(t.value);
    if (v === null || !(v >= 100 && v <= 1000)) { toast('El puntaje de corte va de 100 a 1000'); return; }
    const c = store.catalogoCortes.find(x => x.id === t.dataset.admCorte);
    c.corte = v;
    if (c.fuente === REF.FUENTE_ILUSTRATIVA) c.fuente = `Corte ingresado por el estudiante (${hoy()}); ponderaciones de plantilla ilustrativa`;
    actualizar();
    return;
  }

  const asig = asigSeleccionada();
  if (!asig) return;

  /* Campos de la asignatura */
  if (t.dataset.asigField === 'nombre') {
    asig.nombre = t.value.trim() || asig.nombre;
    actualizar();
    ofrecerUnificar(asig);
  } else if (t.dataset.asigField === 'meta') {
    const m = t.value.trim() === '' ? null : leerNota(t.value);
    if (Number.isNaN(m)) { toast(`La meta debe estar entre ${p.escala.min} y ${p.escala.max} (o déjala vacía)`); render(); return; }
    asig.meta = m;
    delete sim[asig.id];
    actualizar();
  } else if (t.dataset.asigField === 'creditos') {
    const c = t.value.trim() === '' ? null : Number(t.value.replace(',', '.'));
    if (c !== null && (!Number.isFinite(c) || c <= 0 || c > 60)) { toast('Los créditos deben ser un número entre 1 y 60 (o vacío)'); render(); return; }
    if (c === null) delete asig.creditos; else asig.creditos = c;
    actualizar();
  } else if (t.dataset.asigField === 'periodoId') {
    asig.periodoId = t.value;
    if (!esConsolidado()) p.periodoActivo = t.value;
    actualizar();
    if (!ofrecerUnificar(asig)) toast(`Movida a ${nombrePeriodo(t.value)}`);
  }

  /* Décimas extra: cambiar estado */
  if (t.dataset.decimaEval !== undefined) {
    const d = (asig.decimas || []).find(x => x.id === t.closest('[data-decima]').dataset.decima);
    if (d) { d.evalId = t.value || null; actualizar(); }
    return;
  }
  if (t.dataset.decimaEstado !== undefined) {
    const d = (asig.decimas || []).find(x => x.id === t.closest('[data-decima]').dataset.decima);
    if (d) { d.estado = t.value === 'potencial' ? 'potencial' : 'obtenida'; actualizar(); }
    return;
  }

  /* Controles de un bloque */
  const filaCtrl = t.closest('[data-ctrl]');
  if (filaCtrl && t.dataset.cfield) {
    const b = asig.evaluaciones.find(x => x.id === filaCtrl.dataset.bloque);
    const c = b.controles.find(x => x.id === filaCtrl.dataset.ctrl);
    if (t.dataset.cfield === 'nombre') c.nombre = t.value.trim() || c.nombre;
    else {
      const n = leerNota(t.value);
      if (Number.isNaN(n)) { toast(`La nota debe estar entre ${p.escala.min} y ${p.escala.max}`); render(); return; }
      const previoA = Calc.analizarAsignatura(asig, p.escala);
      const antes = previoA.actual;
      const cambio = n !== null && n !== c.nota;
      const previa = notaPrevia(asig, c.id);
      c.nota = n;
      if (cambio) feedbackNota(asig, n, antes, { estadoAntes: previoA.estado, previa });
    }
    delete sim[asig.id];
    actualizar();
    return;
  }

  /* Evaluaciones */
  const fila = t.closest('[data-eval]');
  if (fila && t.dataset.field) {
    const ev = asig.evaluaciones.find(x => x.id === fila.dataset.eval);
    switch (t.dataset.field) {
      case 'nombre': ev.nombre = t.value.trim() || ev.nombre; break;
      case 'nota': {
        const n = leerNota(t.value);
        if (Number.isNaN(n)) { toast(`La nota debe estar entre ${p.escala.min} y ${p.escala.max}`); render(); return; }
        const previoA = Calc.analizarAsignatura(asig, p.escala);
        const antes = previoA.actual;
        const cambio = n !== null && n !== ev.nota;
        const previa = notaPrevia(asig, ev.id);
        ev.nota = n;
        ev.pendiente = n === null;
        if (cambio) feedbackNota(asig, n, antes, { estadoAntes: previoA.estado, previa });
        break;
      }
      case 'pendiente':
        if (t.checked) { ev.pendiente = true; ev.nota = null; }
        else if (ev.nota === null) {
          toast('Escribe la nota obtenida para marcarla como rendida');
          t.checked = true;
          fila.querySelector('[data-field=nota]').focus();
          return;
        }
        break;
      case 'peso': {
        const w = leerPeso(t.value);
        if (Number.isNaN(w)) { toast(MSG_PESO); render(); return; }
        ev.peso = w;
        break;
      }
    }
    delete sim[asig.id];
    actualizar();
  }

  /* Checklist */
  const item = t.closest('[data-item]');
  if (item && t.dataset.checkField) {
    const it = asig.checklist.find(x => x.id === item.dataset.item);
    if (t.dataset.checkField === 'hecho') it.hecho = t.checked; else it.texto = t.value.trim() || it.texto;
    actualizar();
  }
});

/* Entradas en tiempo real (sin redibujar todo) */
document.addEventListener('input', e => {
  if (e.target.dataset?.uniBuscar !== undefined) {
    uniFiltro.q = e.target.value;
    const lista = $('#uni-lista');
    if (lista) { lista.innerHTML = htmlTarjetasUniversidades(); $('#uni-cuenta').textContent = textoCuentaUni(); }
    return;
  }
  if (e.target.dataset?.ens && e.target.tagName === 'INPUT') {
    ensayoBorrador[e.target.dataset.ens] = e.target.value;
    if (['correctas', 'puntaje'].includes(e.target.dataset.ens)) {
      const prev = $('#paes-cuerpo .ens-previa');
      // Solo se redibuja el panel del formulario (no toda la vista) para no mover el cursor
      if (prev) { const tmp = document.createElement('div'); tmp.innerHTML = htmlEnsayos(); prev.replaceWith(tmp.querySelector('.ens-previa')); }
    }
    return;
  }
  const t = e.target;
  if (t.id === 'foto-texto') { importacion.texto = t.value; return; }
  if (t.dataset.impPrevioNueva !== undefined) { importacion.nuevaPrevia = t.value.trim(); return; }
  if (t.dataset.nemSim !== undefined) {
    simNEM = Number(t.value);
    $('#nem-sim-out').textContent = simNEM.toFixed(1);
    actualizarSimNEM();
    return;
  }
  if (t.dataset.nemBuscar !== undefined) {
    const v = leerPromedioNEM(t.value);
    $('#nem-buscar-res').textContent = v !== null ? `${fmtNota(v)} → ${Calc.puntajeNEM(v, tablaNEM(grupoNEM()).tabla)} pts` : '—';
    return;
  }
  if (t.dataset.combo !== undefined) {
    combo.query = t.value;
    combo.abierto = true;
    combo.activo = 0;
    renderListaCombo();
    return;
  }
  if (t.dataset.catBuscar !== undefined) {
    busquedaCatalogo = t.value;
    $('#cat-tabla').innerHTML = htmlTablaCatalogo();
    return;
  }
  if (!t.dataset.sim) return;

  const asig = asigSeleccionada();
  const a = Calc.analizarAsignatura(asig, escala());
  const valor = Number(t.value);
  sim[asig.id] ??= {};
  const pendientes = a.pendientes.filter(ev => Calc.peso(ev) > 0);
  if (t.dataset.sim === '__todas') {
    pendientes.forEach(ev => {
      sim[asig.id][ev.id] = valor;
      const r = document.querySelector(`[data-sim="${ev.id}"]`);
      if (r) r.value = valor;
      const o = document.querySelector(`[data-sim-out="${ev.id}"]`);
      if (o) o.textContent = valor.toFixed(1);
    });
  } else {
    sim[asig.id][t.dataset.sim] = valor;
    const prom = pendientes.reduce((s, ev) => s + valorSim(a, ev), 0) / pendientes.length;
    const gen = document.querySelector('[data-sim="__todas"]');
    if (gen) gen.value = prom;
    const og = document.querySelector('[data-sim-out="__todas"]');
    if (og) og.textContent = prom.toFixed(1);
  }
  const out = document.querySelector(`[data-sim-out="${t.dataset.sim}"]`);
  if (out) out.textContent = valor.toFixed(1);
  actualizarSimResultado(a);
});

/* Buscador de carreras: teclado (↑ ↓ Enter Esc), foco y selección con el mouse */
document.addEventListener('keydown', e => {
  if (e.target.dataset?.combo === undefined) return;
  const max = Math.min(combo.resultados.length, COMBO_MAX) - 1;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!combo.abierto) { abrirCombo(false); return; }
    combo.activo = Calc.limitar(combo.activo + (e.key === 'ArrowDown' ? 1 : -1), 0, Math.max(0, max));
    renderListaCombo();
  } else if (e.key === 'PageDown' || e.key === 'PageUp') {
    e.preventDefault();
    combo.activo = Calc.limitar(combo.activo + (e.key === 'PageDown' ? 8 : -8), 0, Math.max(0, max));
    renderListaCombo();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const c = combo.abierto ? combo.resultados[combo.activo] : null;
    if (c) elegirCarrera(c.id); else abrirCombo(false);
  } else if (e.key === 'Escape') {
    if (combo.abierto) { e.preventDefault(); e.stopPropagation(); cerrarCombo(); }
  }
});
document.addEventListener('focusin', e => {
  if (e.target.dataset?.combo === undefined || combo.abierto) return;
  if (combo.sinReabrir) { combo.sinReabrir = false; return; }
  e.target.select();          // al entrar se selecciona el texto: escribir lo reemplaza
  combo.query = '';
  abrirCombo(false);
});
document.addEventListener('focusout', e => {
  if (e.target.dataset?.combo === undefined) return;
  // Si el foco no fue a la lista ni a los botones del buscador, se cierra
  setTimeout(() => { if (!document.activeElement?.closest?.('#combo-carrera')) cerrarCombo(); }, 120);
});
document.addEventListener('mousedown', e => {
  const op = e.target.closest?.('[data-combo-id]');
  if (!op) return;
  e.preventDefault();         // evita que el input pierda el foco antes de elegir
  elegirCarrera(op.dataset.comboId);
});

document.addEventListener('toggle', e => {
  if (e.target.id === 'meta-general') metaGeneralAbierta = e.target.open;
  if (e.target.dataset?.paes && e.target.open) paesAbierta = e.target.dataset.paes;
  if (e.target.id === 'progreso-detalle') progresoAbierto = e.target.open;
}, true);

/* Períodos: arrastrar y soltar (mouse/trackpad). En pantallas táctiles: toque largo → menú con "Mover". */
let arrastrePeriodo = null;
const limpiarMarcasSoltar = () => document.querySelectorAll('#periodos .soltar-antes, #periodos .soltar-despues').forEach(x => x.classList.remove('soltar-antes', 'soltar-despues'));
document.addEventListener('dragstart', e => {
  const b = e.target.closest?.('#periodos [data-periodo]');
  if (!b) return;
  arrastrePeriodo = b.dataset.periodo;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', b.textContent.trim());
  requestAnimationFrame(() => b.classList.add('arrastrando'));
});
document.addEventListener('dragover', e => {
  if (!arrastrePeriodo) return;
  const b = e.target.closest?.('#periodos [data-periodo]');
  limpiarMarcasSoltar();
  if (!b || b.dataset.periodo === arrastrePeriodo) return;
  e.preventDefault();
  const r = b.getBoundingClientRect();
  b.classList.add(e.clientX < r.left + r.width / 2 ? 'soltar-antes' : 'soltar-despues');
});
document.addEventListener('drop', e => {
  if (!arrastrePeriodo) return;
  const b = e.target.closest?.('#periodos [data-periodo]');
  limpiarMarcasSoltar();
  if (!b || b.dataset.periodo === arrastrePeriodo) return;
  e.preventDefault();
  const lista = perfil().periodos;
  const r = b.getBoundingClientRect();
  let destino = lista.findIndex(x => x.id === b.dataset.periodo) + (e.clientX < r.left + r.width / 2 ? 0 : 1);
  if (lista.findIndex(x => x.id === arrastrePeriodo) < destino) destino--;   // al sacarlo, los de la derecha se corren
  const id = arrastrePeriodo;
  arrastrePeriodo = null;
  reordenarPeriodo(id, destino);
});
document.addEventListener('dragend', () => {
  arrastrePeriodo = null;
  limpiarMarcasSoltar();
  document.querySelectorAll('#periodos .arrastrando').forEach(x => x.classList.remove('arrastrando'));
});
document.addEventListener('contextmenu', e => {
  const b = e.target.closest?.('#periodos [data-periodo]');
  if (!b) return;
  e.preventDefault();
  // Con teclado (Shift+F10 / tecla Menú) el evento llega sin coordenadas: se ancla al botón
  abrirMenuPeriodo(b.dataset.periodo, b, 'acciones', e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : null);
});
let toqueLargo = null;
document.addEventListener('pointerdown', e => {
  const b = e.target.closest?.('#periodos [data-periodo]');
  if (!b || e.pointerType === 'mouse') return;
  const x = e.clientX, y = e.clientY;
  toqueLargo = { x, y, t: setTimeout(() => { toqueLargo = null; abrirMenuPeriodo(b.dataset.periodo, b, 'acciones', { x, y: y + 8 }); }, 550) };
});
const cancelarToqueLargo = e => {
  if (!toqueLargo) return;
  if (e.type === 'pointermove' && Math.hypot(e.clientX - toqueLargo.x, e.clientY - toqueLargo.y) < 10) return;
  clearTimeout(toqueLargo.t);
  toqueLargo = null;
};
['pointermove', 'pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, cancelarToqueLargo));
// Un toque fuera del menú lo cierra (se ignora el que sigue justo a un toque largo)
document.addEventListener('pointerdown', e => {
  const m = $('#menu-contextual');
  if (!m || m.hidden || m.contains(e.target) || Date.now() - menuPeriodo.abiertoEn < 400) return;
  cerrarMenuPeriodo(false);
}, true);
addEventListener('resize', () => cerrarMenuPeriodo(false));
document.addEventListener('keydown', e => {
  const m = $('#menu-contextual');
  if (m && !m.hidden && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarMenuPeriodo(); return; }
  if (m && !m.hidden && menuPeriodo.modo === 'acciones' && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
    const items = [...m.querySelectorAll('button:not([disabled])')];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    e.preventDefault();
    return;
  }
  const b = e.target.closest?.('#periodos [data-periodo]');
  if (b && e.altKey && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    moverPeriodo(b.dataset.periodo, e.key === 'ArrowLeft' ? -1 : 1);
  }
}, true);

/* v17: Enter o espacio sobre el encabezado de un bloque plegable lo abre o cierra (celular) */
document.addEventListener('keydown', e => {
  const cabPleg = e.target.closest?.('[data-plegable] > .seccion-cab, [data-plegable] > .promocion-cab');
  if (cabPleg && e.target === cabPleg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cabPleg.click(); }
});

/* Pegar o soltar imágenes en el asistente de foto */
document.addEventListener('paste', e => {
  if (!$('#dlg-foto').open || importacion?.grupos) return;
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (item) { e.preventDefault(); cargarImagen(item.getAsFile()); }
});
document.addEventListener('dragover', e => { if (e.target.closest?.('#zona-foto')) e.preventDefault(); });
document.addEventListener('drop', e => {
  if (!e.target.closest?.('#zona-foto')) return;
  e.preventDefault();
  cargarArchivoImportar(e.dataTransfer?.files?.[0]);
});

document.addEventListener('submit', e => {
  const f = e.target;
  e.preventDefault();
  const datos = new FormData(f);
  const p = perfil();

  if (f.matches('[data-menu-form]')) { guardarNombrePeriodo(); return; }
  if (f.matches('[data-form-ensayo]')) { guardarEnsayo(); return; }
  if (f.matches('[data-form-snapshot]')) {
    const s = guardarSnapshot(String(datos.get('etiqueta') || '').trim().slice(0, 60), 'manual');
    if (!s) return;
    snapshotComparado = s.id;
    guardar(); renderSnapshots();
    toast(`Punto de control guardado: “${s.etiqueta}”`);
    $('#snapshots-cuerpo [name=etiqueta]')?.focus();
    return;
  }
  if (f.matches('[data-form-fecha]')) {
    const nombre = String(datos.get('nombre') || '').trim();
    const fecha = String(datos.get('fecha') || '');
    if (!nombre || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { toast('Escribe un nombre y una fecha'); return; }
    const tipo = TIPOS_FECHA[datos.get('tipo')] ? datos.get('tipo') : 'hito';
    p.calendario.eventos.push({ id: uid(), nombre: nombre.slice(0, 80), fecha, tipo, origen: 'propio' });
    animar.fecha = p.calendario.eventos.at(-1).id;
    actualizar(); renderFechas();
    $('#fechas-cuerpo [name=nombre]')?.focus();
    return;
  }
  if (f.id === 'form-perfil') { guardarPerfil(f); return; }
  if (f.id === 'form-corte') { guardarCorte(f); return; }
  if (f.id === 'form-ficha') { exportarFicha(f); return; }

  if (f.id === 'form-asignatura') {
    const textoM = String(datos.get('meta') || '').trim();
    const meta = textoM ? leerNota(textoM) : null;   // v14: la meta es opcional
    if (Number.isNaN(meta)) { toast(`La meta debe estar entre ${p.escala.min} y ${p.escala.max} (o déjala vacía)`); return; }
    const periodoId = esConsolidado() ? datos.get('periodo') : p.periodoActivo;
    const nombre = datos.get('nombre').trim();
    const existente = buscarDuplicada(nombre, periodoId);
    if (existente && confirm(`Ya tienes “${existente.nombre}” en ${nombrePeriodo(periodoId)} (mismo nombre sin tildes ni mayúsculas).

Aceptar: abrir la existente (recomendado, no se duplican notas ni metas).
Cancelar: crear otra asignatura igualmente.`)) {
      p.seleccionada = existente.id;
      if (!esConsolidado()) p.periodoActivo = periodoId;
      f.reset();
      actualizar();
      toast(`Abrí “${existente.nombre}”, que ya existía`);
      return;
    }
    const nueva = { id: uid(), nombre, meta, periodoId, evaluaciones: [], checklist: [] };
    p.asignaturas.push(nueva);
    p.seleccionada = nueva.id;
    animar.asig = nueva.id;
    f.reset();
    actualizar();
    return;
  }

  const asig = asigSeleccionada();
  if (!asig) return;

  if (f.dataset.form === 'eval') {
    const peso = leerPeso(datos.get('peso'));
    if (Number.isNaN(peso)) { toast(MSG_PESO); return; }
    const nombre = datos.get('nombre').trim();
    if (datos.get('tipo') === 'bloque') {
      const k = Calc.limitar(Math.round(Number(datos.get('controles')) || 1), 1, 20);
      animar.eval = uid();
      asig.evaluaciones.push({ id: animar.eval, tipo: 'bloque', nombre, peso, controles: Array.from({ length: k }, (_, i) => ({ id: uid(), nombre: `Control ${i + 1}`, nota: null })) });
    } else {
      const nota = leerNota(datos.get('nota'));
      if (Number.isNaN(nota)) { toast(`La nota debe estar entre ${p.escala.min} y ${p.escala.max}`); return; }
      const previoA = Calc.analizarAsignatura(asig, p.escala);
      const antes = previoA.actual;
      const previa = notaPrevia(asig, null);
      const idEval = uid();
      asig.evaluaciones.push({ id: idEval, tipo: 'simple', nombre, nota, pendiente: nota === null, peso });
      animar.eval = idEval;
      if (nota !== null) feedbackNota(asig, nota, antes, { estadoAntes: previoA.estado, previa });
    }
    delete sim[asig.id];
    actualizar();
    setTimeout(() => $('[data-form=eval] [name=nombre]')?.focus(), 10);
    return;
  }

  if (f.dataset.form === 'decimas') {
    const v = Calc.parsearDecimas(datos.get('valor'));
    if (v === null || Number.isNaN(v)) { toast('Escribe cuántas décimas (ej. 2 = +0,2) o el valor en nota (ej. 0,2). Máximo 20 décimas'); return; }
    asig.decimas ??= [];
    const estado = datos.get('estado') === 'potencial' ? 'potencial' : 'obtenida';
    const idDecima = uid();
    const evalId = idSano(String(datos.get('evalId') || ''));
    asig.decimas.push({ id: idDecima, motivo: String(datos.get('motivo') || '').trim().slice(0, 60) || 'Décimas', valor: v, estado, evalId });
    animar.decima = idDecima;
    actualizar();
    toast(estado === 'obtenida' ? `+${fmtDecimas(v)} registradas en ${asig.nombre}. ¡Bien ganadas!` : `Décimas potenciales registradas: ve por ellas.`);
    return;
  }

  if (f.dataset.form === 'check') {
    asig.checklist ??= [];
    asig.checklist.push({ id: uid(), texto: datos.get('texto').trim(), hecho: false });
    actualizar();
    setTimeout(() => $('[data-form=check] [name=texto]')?.focus(), 10);
  }
});

/* =========================================================
 * 10. Datos de ejemplo: 3 perfiles que muestran todas las funciones
 * ========================================================= */

function datosEjemplo() {
  const ev = (nombre, nota, peso) => ({ id: uid(), tipo: 'simple', nombre, nota, pendiente: nota === null, peso });
  const bloque = (nombre, peso, notas) => ({ id: uid(), tipo: 'bloque', nombre, peso, controles: notas.map((n, i) => ({ id: uid(), nombre: `Control ${i + 1}`, nota: n })) });
  const tarea = (texto, hecho = false) => ({ id: uid(), texto, hecho });
  const asig = (nombre, meta, periodoId, evaluaciones, checklist = []) => ({ id: uid(), nombre, meta, periodoId, evaluaciones, checklist });
  const cerrada = (nombre, meta, periodoId, [n1, n2, n3]) =>
    asig(nombre, meta, periodoId, [ev('Prueba 1', n1, 30), ev('Prueba 2', n2, 30), ev('Examen', n3, 40)]);

  /* Perfil 1: Sofía, 3° Medio CH (S1 cerrado, S2 en curso con bloque de controles) */
  const p1 = nuevoPerfil('Sofía · 3° Medio');
  Object.assign(p1, { modalidad: 'ch', nivel: '3M' });
  const [s1, s2] = p1.periodos;
  p1.asignaturas = [
    cerrada('Lengua y Literatura', 6.0, s1.id, [6.2, 6.5, 6.3]),
    cerrada('Matemática', 5.5, s1.id, [5.4, 5.9, 5.5]),
    cerrada('Inglés', 6.0, s1.id, [6.6, 6.3, 6.8]),
    cerrada('Educación Ciudadana', 6.0, s1.id, [6.4, 6.1, 6.5]),
    cerrada('Filosofía', 6.0, s1.id, [5.8, 6.0, 5.7]),
    cerrada('Física', 6.0, s1.id, [4.6, 5.0, 4.8]),
    asig('Matemática', 5.5, s2.id,
      [bloque('Controles', 30, [4.8, 5.2, null]), ev('Prueba 1', 4.5, 25), ev('Prueba 2', null, 25), ev('Examen', null, 20)],
      [tarea('Repasar funciones y ecuaciones', true), tarea('Guía de ejercicios (1–20)'), tarea('Resolver prueba del año anterior')]),
    asig('Lengua y Literatura', 6.0, s2.id,
      [ev('Ensayo', 6.5, 30), ev('Exposición', 6.2, 20), ev('Prueba', 5.8, 25), ev('Trabajo final', null, 25)],
      [tarea('Elegir obra para el trabajo final', true), tarea('Reunir 3 fuentes')]),
    asig('Física', 6.5, s2.id,
      [ev('Laboratorio 1', 5.0, 20), ev('Prueba 1', 4.2, 30), ev('Laboratorio 2', null, 20), ev('Prueba 2', null, 30)],
      [tarea('Rehacer ejercicios de cinemática'), tarea('Preparar informe de laboratorio 2')]),
    asig('Inglés', 5.0, s2.id,
      [ev('Quiz 1', 6.0, 10), ev('Quiz 2', 5.5, 10), ev('Oral', null, 0), ev('Examen final', null, 0)],
      [tarea('Practicar speaking 15 min diarios')]),
    asig('Educación Ciudadana', 6.0, s2.id, [ev('Debate', 6.3, 40), ev('Proyecto', null, 60)]),
    asig('Filosofía', 6.0, s2.id, [ev('Ensayo 1', null, 50), ev('Ensayo 2', null, 50)]),
    // Sin ponderaciones → modo equiponderado automático (cada una vale 1/3)
    asig('Ciencias para la Ciudadanía', 6.0, s2.id, [ev('Guía 1', 6.2, 0), ev('Prueba 1', 5.6, 0), ev('Prueba 2', null, 0)]),
  ];
  p1.periodoActivo = s2.id;
  p1.metaGeneral = { global: 6.0, periodos: { [s2.id]: 6.0 } };
  // v6: el NEM usa solo este perfil → los años anteriores se escriben a mano
  p1.nem = { grupo: 'A', manual: { '1M': 6.1, '2M': 5.9 } };
  // Décimas extra de ejemplo en Matemática (S2)
  p1.asignaturas[6].decimas = [
    { id: uid(), motivo: 'Participación en clases', valor: 0.2, estado: 'obtenida' },
    { id: uid(), motivo: 'Guía de ejercicios extra', valor: 0.3, estado: 'potencial' },
  ];
  p1.seleccionada = p1.asignaturas[6].id;
  p1.carreraPreferida = 'Medicina';

  /* Catálogo: plantilla + una carrera de ejemplo con corte FICTICIO para demostrar el simulador */
  const catalogo = clonar(REF.CATALOGO_CORTES);
  const demo = {
    id: 'demo-1', universidad: 'Universidad de ejemplo', carrera: 'Carrera de ejemplo (datos ficticios)',
    ponderaciones: { nem: 15, ranking: 25, cl: 15, m1: 25, ciencias: 20 }, corte: 735.5, anio: 'Ejemplo',
    ponderadoMinimo: null, notas: '', fuente: 'Dato ficticio incluido solo para demostrar el simulador',
  };
  catalogo.unshift(demo);
  p1.admision = { puntajes: { cl: 760, m1: 690, m2: 610, ciencias: 700 }, seleccion: demo.id };

  /* Perfil 2: Sofía, 2° Medio (año anterior, cerrado) → alimenta el NEM de 2° Medio */
  const p2 = nuevoPerfil('Sofía · 2° Medio (2025)');
  Object.assign(p2, { modalidad: 'ch', nivel: '2M', regimen: 'anual', periodos: [{ id: uid(), nombre: 'Año 2025' }] });
  p2.periodoActivo = p2.periodos[0].id;
  const a2 = p2.periodos[0].id;
  p2.asignaturas = [
    cerrada('Lengua y Literatura', 6.0, a2, [6.0, 6.2, 5.9]),
    cerrada('Matemática', 6.0, a2, [5.6, 5.9, 5.8]),
    cerrada('Historia, Geografía y Ciencias Sociales', 6.0, a2, [6.3, 6.1, 6.2]),
    cerrada('Biología', 6.0, a2, [5.5, 5.8, 5.4]),
    cerrada('Inglés', 6.0, a2, [6.7, 6.5, 6.6]),
    cerrada('Educación Física y Salud', 6.0, a2, [6.8, 6.9, 6.7]),
    cerrada('Artes Visuales', 6.0, a2, [6.4, 6.6, 6.5]),
    cerrada('Tecnología', 6.0, a2, [6.2, 6.5, 6.4]),
  ];

  /* Perfil 3: Matías, universitario con malla cargada */
  const p3 = nuevoPerfil('Matías · Ing. Civil Industrial');
  const universidad = 'Universidad de Santiago de Chile (USACH)';
  const carrera = 'Ingeniería Civil Industrial';
  Object.assign(p3, { modalidad: 'uni', uni: { universidad, carrera, anio: 1, semestre: 2, malla: REF.construirMalla(carrera, universidad) } });
  const [u1, u2] = p3.periodos;
  p3.asignaturas = [
    cerrada('Cálculo I', 5.0, u1.id, [4.5, 5.2, 4.9]),
    cerrada('Álgebra Lineal', 5.0, u1.id, [5.5, 5.1, 5.8]),
    cerrada('Química General', 5.0, u1.id, [4.2, 4.8, 4.4]),
    asig('Cálculo II', 5.0, u2.id, [bloque('Controles', 10, [4.6, null]), ev('Certamen 1', 4.1, 30), ev('Certamen 2', null, 30), ev('Examen', null, 30)]),
    asig('Física I', 5.0, u2.id, [ev('Laboratorio', 5.8, 20), ev('Certamen 1', 5.0, 40), ev('Certamen 2', null, 40)]),
    asig('Programación', 5.5, u2.id, [ev('Tarea 1', 6.5, 20), ev('Tarea 2', 6.0, 20), ev('Proyecto', null, 60)]),
  ];
  p3.periodoActivo = u2.id;
  p3.metaGeneral = { global: 5.3, periodos: { [u2.id]: 5.3 } };

  const s = storeVacio();
  return { ...s, perfilActivo: p1.id, perfiles: [p1, p2, p3], catalogoCortes: catalogo, config: { ...store.config } };
}

/* =========================================================
 * Arranque
 * ========================================================= */

$('#dl-universidades').innerHTML = REF.UNIVERSIDADES.map(u => `<option value="${esc(u)}"></option>`).join('');
/**
 * (v15) Carreras sin repetir: se agrupan por nombre normalizado (sin tildes, mayúsculas, puntuación
 * ni espacios extra) y de cada grupo queda la escritura con tildes ("Psicología" y no "Psicologia").
 */
function carrerasUnicas(nombres) {
  const grupos = new Map();
  const tildes = t => (t.normalize('NFD').match(/[̀-ͯ]/g) || []).length;
  for (const bruto of nombres) {
    const nombre = String(bruto ?? '').replace(/\s+/g, ' ').trim();
    if (!nombre) continue;
    const k = Calc.claveAsignatura(nombre);
    const actual = grupos.get(k);
    if (!actual || tildes(nombre) > tildes(actual)) grupos.set(k, nombre);
  }
  return [...grupos.values()].sort((a, b) => a.localeCompare(b, 'es'));
}
const opcionesDatalist = lista => lista.map(c => `<option value="${esc(c)}"></option>`).join('');
$('#dl-carreras').innerHTML = opcionesDatalist(carrerasUnicas([...Object.keys(REF.MALLAS), ...REF.CARRERAS]));
// Carreras para la "carrera preferida": plantillas de malla + catálogo de cortes (sin repetir)
$('#dl-carreras-pref').innerHTML = opcionesDatalist(carrerasUnicas([...Object.keys(REF.MALLAS), ...REF.CARRERAS, ...store.catalogoCortes.map(c => c.carrera.replace(/\s*\(.*\)$/, ''))]));
render();
if (avisoMigracion) {
  guardar();
  toast(avisoMigracion);
}
if (primerInicio) setTimeout(abrirBienvenida, 150);

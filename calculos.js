'use strict';
/**
 * calculos.js — Motor matemático de "Ruta Académica".
 *
 * Aquí viven TODAS las fórmulas. Son funciones puras: reciben datos y devuelven
 * resultados, sin tocar el DOM ni localStorage. Así se pueden revisar y probar aisladas
 * (por ejemplo, desde la consola del navegador: Calc.notaNecesaria(...)).
 *
 * Notación usada en los comentarios:
 *   n_i = nota de la evaluación i        w_i = ponderación (%) de la evaluación i
 *   C   = evaluaciones calificadas       P   = evaluaciones pendientes
 *   W   = Σ w_i (todas)   W_C = Σ w_i (i ∈ C)   W_P = Σ w_i (i ∈ P)
 *   M   = meta de promedio de la asignatura
 *
 * Si las ponderaciones no suman 100 %, todo se calcula sobre W (normalización),
 * y la interfaz avisa del porcentaje que falta asignar.
 */
const Calc = (() => {
  const EPS = 1e-9;

  /* ---------- Utilidades numéricas ---------- */

  function redondear(x, dec = 2) {
    const f = 10 ** dec;
    return Math.round((x + Number.EPSILON) * f) / f;
  }

  /**
   * Redondeo hacia ARRIBA: la nota necesaria nunca se muestra menor que la real.
   * Tolerancia de 1e-4 décimas para que errores de coma flotante (ej. pesos de 33,33…%)
   * no conviertan un 6,2 exacto en 6,3.
   */
  function redondearArriba(x, dec = 1) {
    const f = 10 ** dec;
    return Math.ceil(x * f - 1e-4) / f;
  }

  function limitar(x, min, max) {
    return Math.min(max, Math.max(min, x));
  }

  /** Ponderación válida de una evaluación (vacío, negativo o texto → 0). */
  function peso(ev) {
    const w = Number(ev.peso);
    return Number.isFinite(w) && w > 0 ? w : 0;
  }

  /** Una evaluación cuenta como calificada si no está pendiente y tiene nota numérica. */
  function estaCalificada(ev) {
    return !ev.pendiente && typeof ev.nota === 'number' && Number.isFinite(ev.nota);
  }

  /* ---------- Bloques de controles ---------- */

  /** Una evaluación de tipo "bloque" agrupa varios controles parciales. */
  function esBloque(ev) {
    return !!ev && ev.tipo === 'bloque';
  }

  const esNota = n => typeof n === 'number' && Number.isFinite(n);

  /**
   * (B1) Expansión de bloques. Un bloque con ponderación w y k controles equivale a
   *      k evaluaciones de peso w/k cada una. Así:
   *        nota efectiva del bloque = promedio simple de sus controles
   *      y TODAS las fórmulas (promedio, nota necesaria, simulador, meta general)
   *      funcionan sin cambios sobre la lista expandida.
   *      Un bloque sin controles cuenta como una única evaluación pendiente de peso w.
   */
  function expandirEvaluaciones(evals) {
    const out = [];
    for (const ev of evals || []) {
      if (!esBloque(ev)) { out.push(ev); continue; }
      const ctrls = ev.controles || [];
      const w = peso(ev);
      if (!ctrls.length) {
        out.push({ id: ev.id, nombre: ev.nombre, nota: null, pendiente: true, peso: w, bloqueId: ev.id });
        continue;
      }
      for (const c of ctrls) {
        out.push({
          id: c.id, nombre: `${ev.nombre} · ${c.nombre}`, nota: esNota(c.nota) ? c.nota : null,
          pendiente: !esNota(c.nota), peso: w / ctrls.length, bloqueId: ev.id,
        });
      }
    }
    return out;
  }

  /**
   * (B2) Nota efectiva de un bloque:
   *   actual     = promedio de los controles RENDIDOS (null si no hay ninguno)
   *   proyectada = promedio de TODOS los controles, usando notaSupuesta(c) en los pendientes
   */
  function notaBloque(bloque, notaSupuesta) {
    const ctrls = bloque.controles || [];
    const rendidos = ctrls.filter(c => esNota(c.nota));
    const media = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
    const actual = rendidos.length ? media(rendidos.map(c => c.nota)) : null;
    const proyectada = notaSupuesta && ctrls.length
      ? media(ctrls.map(c => (esNota(c.nota) ? c.nota : notaSupuesta(c))))
      : null;
    return { actual, proyectada, rendidos: rendidos.length, total: ctrls.length, completo: ctrls.length > 0 && rendidos.length === ctrls.length };
  }

  /** Evaluación completamente rendida (para un bloque: todos sus controles tienen nota). */
  function estaCompleta(ev) {
    return esBloque(ev) ? notaBloque(ev).completo : estaCalificada(ev);
  }

  /* ---------- Ponderaciones ---------- */

  /** Devuelve W, W_C, W_P y cuánto falta / sobra respecto de 100 %. */
  function resumenPesos(evals) {
    let total = 0, calificado = 0, pendiente = 0;
    for (const ev of evals) {
      const w = peso(ev);
      total += w;
      if (estaCalificada(ev)) calificado += w; else pendiente += w;
    }
    return {
      total: redondear(total, 8),
      calificado: redondear(calificado, 8),
      pendiente: redondear(pendiente, 8),
      faltante: Math.max(0, redondear(100 - total, 4)),
      exceso: Math.max(0, redondear(total - 100, 4)),
    };
  }

  /** Σ n_i · w_i sobre las evaluaciones calificadas ("puntos acumulados"). */
  function sumaPuntos(evals) {
    return evals.reduce((s, ev) => (estaCalificada(ev) ? s + ev.nota * peso(ev) : s), 0);
  }

  /* ---------- Fórmulas principales ---------- */

  /**
   * (1) Promedio actual ponderado = Σ_C n_i·w_i / W_C
   * Solo considera lo ya rendido. Devuelve null si no hay notas con ponderación.
   */
  function promedioActual(evals) {
    const { calificado } = resumenPesos(evals);
    if (calificado < EPS) return null;
    return sumaPuntos(evals) / calificado;
  }

  /**
   * (2) Nota necesaria (pareja) en lo pendiente para terminar con promedio M:
   *        M = (Σ_C n_i·w_i + x·W_P) / W    ⇒    x = (M·W − Σ_C n_i·w_i) / W_P
   * Devuelve null si no queda ponderación pendiente.
   */
  function notaNecesaria(evals, meta) {
    if (meta === null || meta === undefined || !Number.isFinite(meta)) return null;   // v14: sin meta no hay “nota necesaria”
    const p = resumenPesos(evals);
    if (p.pendiente < EPS) return null;
    return (meta * p.total - sumaPuntos(evals)) / p.pendiente;
  }

  /**
   * (3) Promedio final proyectado = Σ n_i·w_i / W
   * Usa la nota real en C y la nota supuesta notaSupuesta(ev) en P.
   * Sirve para el simulador y para el rango posible (todo mínimo / todo máximo).
   */
  function proyectarFinal(evals, notaSupuesta) {
    const p = resumenPesos(evals);
    if (p.total < EPS) return null;
    let suma = 0;
    for (const ev of evals) {
      const w = peso(ev);
      if (!w) continue;
      const n = estaCalificada(ev) ? ev.nota : notaSupuesta(ev);
      suma += n * w;
    }
    return suma / p.total;
  }

  /**
   * (4) Promedio general = media simple de los promedios actuales de cada asignatura
   * (solo las que ya tienen al menos una nota).
   */
  function promedioGeneral(analisis) {
    const con = analisis.filter(a => a.actual !== null);
    if (!con.length) return null;
    // v8: si hay créditos (perfil universitario), el promedio se pondera por créditos;
    // sin créditos cada asignatura pesa 1 y el resultado es la media simple de siempre.
    const sw = con.reduce((s, a) => s + pesoAsignatura(a.asig), 0);
    return con.reduce((s, a) => s + a.actual * pesoAsignatura(a.asig), 0) / sw;
  }

  /**
   * (v9) Promedio de cada asignatura entre períodos, emparejando por NOMBRE NORMALIZADO
   * (claveAsignatura: sin tildes, mayúsculas ni puntuación), nunca por posición en la lista.
   *   promedio = media de los promedios de cada período que ya tiene notas
   *   (con 2 semestres: (S1 + S2) / 2, como el promedio anual escolar).
   * Devuelve, en el orden de la primera aparición:
   *   { clave, nombre, porPeriodo: [{ periodoId, existe, actual, analisis }], promedio,
   *     conNota, totalPeriodos, parcial, pendiente, cerradaManual, items }
   * parcial = falta la asignatura o su nota en algún período.
   */
  function promediosPorAsignatura(analisis, periodos) {
    const grupos = new Map();
    for (const a of analisis) {
      const k = claveAsignatura(a.asig.nombre);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(a);
    }
    return [...grupos.entries()].map(([clave, items]) => {
      const porPeriodo = periodos.map(per => {
        const delPeriodo = items.filter(a => a.asig.periodoId === per.id);
        // Si quedó repetida dentro de un mismo período, se promedian (la app avisa para unificarlas)
        const conNotaP = delPeriodo.filter(a => a.actual !== null);
        const actual = conNotaP.length ? conNotaP.reduce((s, a) => s + a.actual, 0) / conNotaP.length : null;
        return { periodoId: per.id, existe: delPeriodo.length > 0, actual, analisis: delPeriodo };
      });
      const valores = porPeriodo.filter(x => x.actual !== null).map(x => x.actual);
      return {
        clave,
        nombre: items[0].asig.nombre,
        porPeriodo,
        promedio: valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null,
        conNota: valores.length,
        totalPeriodos: periodos.length,
        parcial: valores.length < periodos.length,
        pendiente: items.some(a => a.pesos.pendiente > EPS && !a.cerradaManual),
        cerradaManual: items.every(a => a.cerradaManual),
        items,
      };
    });
  }

  /* =========================================================
   * ENSAYOS PAES (v13)
   * ========================================================= */

  /**
   * Puntaje PAES (100–1000) a partir de las respuestas correctas, con una tabla oficial
   * [[correctas, puntaje], …]. Solo búsqueda exacta: si el valor no está en la tabla (o no hay tabla)
   * devuelve null — nunca se interpola, para no inventar un puntaje que DEMRE no publicó.
   */
  function puntajeDesdeCorrectas(correctas, tabla) {
    if (!Array.isArray(tabla) || !tabla.length || !Number.isInteger(correctas)) return null;
    const fila = tabla.find(([c]) => c === correctas);
    return fila ? fila[1] : null;
  }

  /**
   * Resumen por prueba de una lista de ensayos [{ fecha, prueba, puntaje }] (puntaje ya resuelto):
   * { [prueba]: { n, ultimo, mejor, promedio, primero, cambio (último − primero), serie[] ordenada por fecha } }
   */
  function resumenEnsayos(ensayos) {
    const por = {};
    for (const e of ensayos) {
      if (typeof e.puntaje !== 'number') continue;
      (por[e.prueba] ??= []).push(e);
    }
    const r = {};
    for (const [prueba, lista] of Object.entries(por)) {
      const serie = lista.slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
      const vals = serie.map(e => e.puntaje);
      r[prueba] = {
        n: serie.length,
        ultimo: serie.at(-1),
        mejor: serie.reduce((m, e) => (e.puntaje > m.puntaje ? e : m)),
        promedio: vals.reduce((s, v) => s + v, 0) / vals.length,
        primero: serie[0],
        cambio: serie.length > 1 ? vals.at(-1) - vals[0] : null,
        serie,
      };
    }
    return r;
  }

  /** (v9) Días entre dos fechas "AAAA-MM-DD" (negativo si ya pasó). Usa UTC para no depender del horario de verano. */
  function diasEntre(desde, hasta) {
    const f = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return null;
    return Math.round((f(hasta) - f(desde)) / 86400000);
  }

  /** Peso de una asignatura en el promedio general: sus créditos si los tiene (> 0), si no 1. */
  function pesoAsignatura(asig) {
    const c = Number(asig?.creditos);
    return Number.isFinite(c) && c > 0 ? c : 1;
  }

  /**
   * Clave para detectar asignaturas duplicadas (v8): sin tildes ni diacríticos, minúsculas,
   * sin puntuación y con espacios colapsados. "Matemática " y "MATEMATICA." → "matematica".
   */
  function claveAsignatura(nombre) {
    return String(nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* ---------- Diagnóstico de una asignatura ---------- */

  /**
   * Clasifica el estado frente a la meta:
   *   sin-datos     → no hay evaluaciones
   *   sin-pesos     → hay evaluaciones pendientes pero sin ponderación asignada
   *   lograda / no-lograda → ya no queda nada pendiente
   *   inalcanzable  → nota necesaria > nota máxima
   *   asegurada     → nota necesaria ≤ nota mínima (llega a la meta pase lo que pase)
   *   encaminado    → nota necesaria ≤ promedio actual (basta mantener el ritmo)
   *   subir-ritmo   → nota necesaria > promedio actual (pero ≤ máxima)
   * Si aún no hay notas, se usa la nota de aprobación como referencia del "ritmo".
   */
  function clasificar({ evals, pesos, actual, necesaria, pendientes, meta, escala }) {
    if (!evals.length) return 'sin-datos';
    // v14: la meta de cada asignatura es opcional; sin ella solo se informa el promedio
    if (meta === null || meta === undefined) return pesos.total < EPS && pendientes.length ? 'sin-pesos' : 'sin-meta';
    if (pesos.pendiente < EPS) {
      if (pendientes.length || pesos.total < EPS) return 'sin-pesos';
      return actual + EPS >= meta ? 'lograda' : 'no-lograda';
    }
    if (necesaria > escala.max + EPS) return 'inalcanzable';
    if (necesaria <= escala.min + EPS) return 'asegurada';
    const referencia = actual ?? escala.aprobacion;
    return necesaria <= referencia + EPS ? 'encaminado' : 'subir-ritmo';
  }

  /**
   * (E1) Modo equiponderado automático.
   *      Si NINGUNA evaluación de primer nivel tiene ponderación (todas 0 o vacías), se asume
   *      que todas valen lo mismo: w_i = 100 / N  (N = evaluaciones de primer nivel; un bloque
   *      de controles cuenta como UNA evaluación y luego reparte su parte entre sus controles).
   *      Si al menos una tiene %, NO se aplica (se respetan los % definidos y la interfaz avisa).
   * Devuelve { evaluaciones (copias con peso efectivo), auto, pesoAuto }.
   */
  function aplicarEquiponderado(evaluaciones) {
    const lista = evaluaciones || [];
    if (!lista.length || lista.some(ev => peso(ev) > 0)) return { evaluaciones: lista, auto: false, pesoAuto: null };
    const w = 100 / lista.length;
    return { evaluaciones: lista.map(ev => ({ ...ev, peso: w })), auto: true, pesoAuto: w };
  }

  /**
   * Reúne todos los indicadores de una asignatura en un solo objeto.
   * (E3) Cierre manual (asig.cerrada = true): el estudiante decide que la asignatura terminó,
   *      sumen o no 100 % sus ponderaciones. Se calcula SOLO con lo rendido (los pendientes
   *      se descartan y los pesos de lo rendido se normalizan); si lo rendido no tiene %,
   *      cada nota rendida vale lo mismo. El estado queda en lograda / no-lograda.
   */
  function analizarAsignatura(asig, escala) {
    // (E1) Sin ninguna ponderación → todas valen lo mismo
    const eq = aplicarEquiponderado(asig.evaluaciones);
    // Se trabaja sobre la lista EXPANDIDA (cada control de un bloque cuenta como evaluación)
    let evals = expandirEvaluaciones(eq.evaluaciones);
    const cerradaManual = !!asig.cerrada;
    if (cerradaManual) {
      evals = evals.filter(estaCalificada);
      if (evals.length && resumenPesos(evals).total < EPS) evals = evals.map(ev => ({ ...ev, peso: 100 / evals.length }));
    }
    const pesos = resumenPesos(evals);
    const actual = promedioActual(evals);
    const pendientes = evals.filter(ev => !estaCalificada(ev));
    const necesaria = notaNecesaria(evals, asig.meta);
    const necesariaAprobar = notaNecesaria(evals, escala.aprobacion);
    const finalMinimo = proyectarFinal(evals, () => escala.min);
    const finalMaximo = proyectarFinal(evals, () => escala.max);
    const avance = pesos.total > EPS ? pesos.calificado / pesos.total : 0;
    const estado = clasificar({ evals, pesos, actual, necesaria, pendientes, meta: asig.meta, escala });
    return {
      asig, evals, pesos, actual, pendientes, necesaria, necesariaAprobar, finalMinimo, finalMaximo, avance, estado,
      modoAuto: eq.auto, pesoAuto: eq.pesoAuto, cerradaManual,
      // Peso efectivo de cada evaluación de primer nivel (útil para mostrar el reparto automático)
      pesoEfectivo: id => peso(eq.evaluaciones.find(ev => ev.id === id) || {}),
    };
  }

  /**
   * (E4) Meta ambiciosa: qué haría falta para "ir más allá" de la meta, hasta la nota máxima.
   * Devuelve los escalones (meta+0,5 …, máximo) con la nota pareja necesaria en lo pendiente
   * y el techo real (promedio final con nota máxima en todo lo pendiente).
   */
  function metaAmbiciosa(a, escala) {
    if (a.pesos.pendiente < EPS || a.asig.meta === null || a.asig.meta === undefined) return null;
    const objetivos = [];
    const paso = (escala.max - escala.min) > 20 ? 5 : 0.5;
    for (let m = a.asig.meta + paso; m < escala.max - EPS; m += paso) objetivos.push(redondear(m, 2));
    objetivos.push(escala.max);
    return {
      techo: a.finalMaximo,
      escalones: objetivos.map(m => ({ meta: m, necesaria: notaNecesaria(a.evals, m) }))
        .filter(e => e.necesaria !== null),
    };
  }

  /* ---------- Décimas extra (bonificaciones fuera del registro de notas) ---------- */

  /**
   * (D1) Lee décimas escritas por el estudiante, en "décimas" o en puntos de nota:
   *   "2" → 0,2 (2 décimas)   "0,3" → 0,3 (ya en puntos de nota)   "1,5" → 0,15 (1,5 décimas)
   * Devuelve null si está vacío, NaN si no es válido, o el valor en puntos de nota (0–2).
   */
  function parsearDecimas(texto) {
    const s = String(texto ?? '').trim().replace(/\s+/g, '').replace('+', '');
    if (!s) return null;
    const v = Number(s.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) return NaN;
    const puntos = /[.,]/.test(s) && v < 1 ? v : v / 10;
    return puntos <= 2 + EPS ? redondear(puntos, 3) : NaN;
  }

  /** Suma de décimas por estado: obtenidas (ya ganadas) y potenciales (a las que puede optar). */
  function sumaDecimas(decimas) {
    let obtenidas = 0, potenciales = 0;
    for (const d of decimas || []) {
      const v = Number(d.valor);
      if (!Number.isFinite(v) || v <= 0) continue;
      if (d.estado === 'potencial') potenciales += v; else obtenidas += v;
    }
    return { obtenidas: redondear(obtenidas, 3), potenciales: redondear(potenciales, 3) };
  }

  /**
   * (D2, v14) Las décimas se aplican a UNA NOTA concreta (d.evalId = id de la evaluación o del
   * control), nunca directo al promedio de la asignatura:
   *   nota con décimas = mín(máx, nota + décimas asignadas a esa evaluación)
   * y desde ahí entran al promedio ponderado como cualquier nota. Las décimas aún sin asignar
   * no cambian nada: se informan y se recomienda dónde aplicarlas (ver recomendarDecimas).
   * En una evaluación pendiente, las décimas asignadas bajan lo que necesitas en ella.
   */
  function bonusPorEvaluacion(decimas, evals, incluirPotenciales) {
    const ids = new Set(evals.map(ev => ev.id));
    const bonus = {};
    for (const d of decimas || []) {
      const v = Number(d.valor);
      if (!Number.isFinite(v) || v <= 0 || !d.evalId || !ids.has(d.evalId)) continue;
      if (d.estado === 'potencial' && !incluirPotenciales) continue;
      bonus[d.evalId] = (bonus[d.evalId] || 0) + v;
    }
    return bonus;
  }

  /** Lista expandida con las décimas aplicadas a las notas ya rendidas (tope: nota máxima). */
  function evalsConDecimas(evals, bonus, escala) {
    return evals.map(ev => (bonus[ev.id] && estaCalificada(ev) ? { ...ev, nota: Math.min(escala.max, ev.nota + bonus[ev.id]) } : ev));
  }

  function impactoDecimas(a, escala) {
    const lista = a.asig.decimas || [];
    const { obtenidas, potenciales } = sumaDecimas(lista);
    if (!obtenidas && !potenciales) return null;
    const ids = new Set(a.evals.map(ev => ev.id));
    const asignada = d => d.evalId && ids.has(d.evalId);
    const sinAsignar = sumaDecimas(lista.filter(d => !asignada(d)));
    const bonusOb = bonusPorEvaluacion(lista, a.evals, false);
    const bonusTodas = bonusPorEvaluacion(lista, a.evals, true);
    const conOb = evalsConDecimas(a.evals, bonusOb, escala);
    const conTodas = evalsConDecimas(a.evals, bonusTodas, escala);
    // En pendientes con décimas asignadas: la nota que necesitas ahí baja en esas décimas
    const necesariaCon = bonus => {
      if (a.pesos.pendiente < EPS || a.asig.meta === null || a.asig.meta === undefined) return null;
      const ev2 = evalsConDecimas(a.evals, bonus, escala);
      const extraPend = a.evals.filter(ev => !estaCalificada(ev) && bonus[ev.id]).reduce((s, ev) => s + bonus[ev.id] * peso(ev), 0);
      const pr = resumenPesos(ev2);
      return (a.asig.meta * pr.total - sumaPuntos(ev2) - extraPend) / pr.pendiente;
    };
    return {
      obtenidas, potenciales,
      sinAsignarObtenidas: sinAsignar.obtenidas, sinAsignarPotenciales: sinAsignar.potenciales,
      bonusObtenidas: bonusOb,
      actualConObtenidas: promedioActual(conOb),
      actualConTodas: promedioActual(conTodas),
      finalMaximoConObtenidas: proyectarFinal(conOb, () => escala.max),
      necesariaConDecimas: necesariaCon(bonusOb),
      necesariaConTodas: necesariaCon(bonusTodas),
    };
  }

  /**
   * (v14) Ponderaciones mezcladas: algunas evaluaciones (de primer nivel) tienen % y otras no.
   * En ese caso las que no tienen % valen 0 y el promedio queda ambiguo (el modo equiponderado
   * solo se aplica cuando NINGUNA tiene %). Devuelve null si no hay mezcla, o { con, sin }.
   */
  function pesosMezclados(evaluaciones) {
    const lista = evaluaciones || [];
    const con = lista.filter(ev => peso(ev) > 0);
    const sin = lista.filter(ev => peso(ev) === 0);
    return con.length && sin.length ? { con, sin } : null;
  }

  /**
   * (v14) Promedio de las metas definidas en las asignaturas (ponderado por créditos si los hay).
   * Las asignaturas sin meta no cuentan. Devuelve { promedio, conMeta, sinMeta } o null.
   */
  function promedioMetas(asignaturas) {
    const con = (asignaturas || []).filter(a => typeof a.meta === 'number' && Number.isFinite(a.meta));
    if (!con.length) return null;
    const W = con.reduce((s, a) => s + pesoAsignatura(a), 0);
    return { promedio: con.reduce((s, a) => s + a.meta * pesoAsignatura(a), 0) / W, conMeta: con.length, sinMeta: (asignaturas || []).length - con.length };
  }

  /**
   * (D3, v14) ¿En qué evaluación conviene aplicar `valor` décimas?
   * Impacto en el promedio final de la asignatura al sumarlas a la evaluación i:
   *     Δ_i = mín(valor, máx − nota_i) · w_i / W
   * (nota_i = nota rendida, o la nota que necesitas si está pendiente). Gana la de mayor Δ:
   * normalmente la de MAYOR ponderación que todavía tiene margen bajo la nota máxima.
   * Devuelve las opciones ordenadas [{ ev, delta, tope }] (tope = se pierden décimas por el máximo).
   */
  function recomendarDecimas(a, valor, escala) {
    const W = a.pesos.total;
    if (!(valor > 0) || W < EPS) return [];
    const referencia = ev => (estaCalificada(ev) ? ev.nota : Math.min(escala.max, Math.max(escala.min, a.necesaria ?? a.actual ?? escala.aprobacion)));
    return a.evals.filter(ev => peso(ev) > 0).map(ev => {
      const margen = Math.max(0, escala.max - referencia(ev));
      const usado = Math.min(valor, margen);
      return { ev, delta: (usado * peso(ev)) / W, tope: usado < valor - EPS, pendiente: !estaCalificada(ev) };
    }).filter(o => o.delta > EPS).sort((x, y) => y.delta - x.delta || Number(x.pendiente) - Number(y.pendiente));
  }

  /* ---------- Promoción escolar (referencia: Decreto 67/2018 MINEDUC) ---------- */

  /**
   * (P1) Situación de promoción según el criterio estándar chileno (referencial):
   *   - Aprueba todas las asignaturas                                   → promueve
   *   - Reprueba 1 asignatura y su promedio general (incluida) ≥ 4,5    → promueve
   *   - Reprueba 2 asignaturas y su promedio general (incluidas) ≥ 5,0  → promueve
   *   - En otro caso                                                     → en riesgo (decide el establecimiento)
   * Los promedios de asignatura se redondean a 1 decimal (práctica escolar). En escalas distintas
   * de 1–7, los umbrales 4,5 y 5,0 se trasladan proporcionalmente sobre la nota de aprobación.
   * La asistencia (≥ 85 %) también es requisito, pero la app no la registra.
   * Recibe análisis de asignaturas ya filtrados (sin Religión/Orientación, que no inciden).
   */
  function evaluarPromocion(analisis, escala) {
    const tramo = (escala.max - escala.aprobacion) / 6;               // 1–7: 0,5
    const umbral1 = redondear(escala.aprobacion + tramo, 2);          // 4,5
    const umbral2 = redondear(escala.aprobacion + 2 * tramo, 2);      // 5,0
    const conNota = analisis.filter(a => a.actual !== null);
    const finales = conNota.map(a => ({ a, nota: redondear(a.actual, 1) }));
    const reprobadas = finales.filter(x => x.nota < escala.aprobacion - EPS);
    const general = finales.length ? redondear(finales.reduce((s, x) => s + x.nota, 0) / finales.length, 1) : null;
    const abiertas = conNota.filter(a => a.pesos.pendiente > EPS && !a.cerradaManual).length;
    let estado;
    if (!finales.length) estado = 'sin-datos';
    else if (!reprobadas.length) estado = 'promueve';
    else if (reprobadas.length === 1 && general >= umbral1 - EPS) estado = 'promueve-con-1';
    else if (reprobadas.length === 2 && general >= umbral2 - EPS) estado = 'promueve-con-2';
    else estado = 'riesgo';
    return { estado, general, reprobadas, umbral1, umbral2, abiertas, sinNotas: analisis.length - conNota.length, total: analisis.length };
  }

  /* ---------- Lectura de notas: coma o punto, y enteros escalados ---------- */

  /**
   * (E5) Lee una nota escrita por el estudiante o detectada en una foto.
   *   "6,5" · "6.5"  → 6,5
   *   "65" · "70"    → 6,5 · 7,0 (solo en escalas cortas como 1–7, sin separador decimal y
   *                    si el entero cae entre mín·10 y máx·10) → escalada = true, para informarlo.
   * Devuelve null si está vacío, NaN si no es una nota válida, o { nota, escalada }.
   */
  function parsearNota(texto, escala) {
    const s = String(texto ?? '').trim().replace(/\s+/g, '');
    if (!s) return null;
    const n = Number(s.replace(',', '.'));
    if (!Number.isFinite(n)) return NaN;
    if (n >= escala.min - EPS && n <= escala.max + EPS) return { nota: n, escalada: false };
    const corta = escala.max - escala.min <= 20;
    if (corta && /^\d+$/.test(s) && n >= escala.min * 10 && n <= escala.max * 10) return { nota: n / 10, escalada: true };
    return NaN;
  }

  /* ---------- Lectura de ponderaciones: % o decimal/racional ---------- */

  /**
   * (E2) Convierte lo que escribe el estudiante a PORCENTAJE (0–100), que es como se guarda.
   *   "25" · "25%" · "12,5"           → 25 · 25 · 12,5   (porcentaje)
   *   "0,25" · "0.25" · ",1" · "1/4"  → 25 · 25 · 10 · 25 (decimal o fracción ≤ 1 → × 100)
   *   unidad 'dec': todo valor ≤ 1 se lee como decimal ("1" → 100 %); un valor > 1 se lee como %.
   * Devuelve null si está vacío y NaN si no es válido o queda fuera de 0–100.
   */
  function parsearPeso(texto, unidad = 'pct') {
    let s = String(texto ?? '').trim().replace(/\s+/g, '');
    if (!s) return null;
    let v, esDecimal = false;
    if (s.endsWith('%')) {
      v = Number(s.slice(0, -1).replace(',', '.'));
    } else if (s.includes('/')) {
      const [a, b] = s.split('/').map(x => Number(x.replace(',', '.')));
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0 || a < 0) return NaN;
      v = a / b;
      if (v > 1 + EPS) return NaN;     // 5/4 no es una ponderación
      esDecimal = true;
    } else {
      v = Number(s.replace(',', '.'));
      const tieneSeparador = /[.,]/.test(s);
      esDecimal = unidad === 'dec' ? v <= 1 + EPS : tieneSeparador && v <= 1 + EPS;
    }
    if (!Number.isFinite(v) || v < 0) return NaN;
    const pct = redondear(esDecimal ? v * 100 : v, 4);
    return pct <= 100 + EPS ? pct : NaN;
  }

  /** Muestra un porcentaje guardado en la unidad elegida: 'pct' → "25"; 'dec' → "0,25". */
  function formatearPeso(pct, unidad = 'pct') {
    if (!Number.isFinite(pct) || pct <= 0) return '';
    if (unidad === 'dec') return String(redondear(pct / 100, 4)).replace('.', ',');
    return String(redondear(pct, 2)).replace('.', ',');
  }

  /* ---------- Selección determinista por día (frase diaria) ---------- */

  /**
   * Índice estable para una fecha "AAAA-MM-DD": mismo día → mismo índice; otro día → otro.
   * Hash FNV-1a de 32 bits sobre el texto de la fecha, módulo n (más un desplazamiento opcional).
   */
  function indiceDiario(fecha, n, desplazamiento = 0) {
    if (!n) return 0;
    let h = 0x811c9dc5;
    for (const ch of String(fecha)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return (h + desplazamiento) % n;
  }

  /* ---------- Prioridad ---------- */

  /**
   * Asignatura prioritaria. Puntaje = exigencia + 0,25 · impacto
   *   exigencia = (N_nec − mín) / (máx − mín)   → 0 trivial, 1 exige nota máxima, >1 inalcanzable
   *   impacto   = W_P / W                       → fracción del promedio que aún está en juego
   * Se excluyen asignaturas aseguradas, cerradas o sin datos suficientes.
   * Devuelve la lista ordenada de mayor a menor prioridad.
   */
  function priorizar(analisis, escala) {
    const rango = escala.max - escala.min;
    return analisis
      .filter(a => ['inalcanzable', 'subir-ritmo', 'encaminado'].includes(a.estado))
      .map(a => {
        const exigencia = (a.necesaria - escala.min) / rango;
        const impacto = a.pesos.total > EPS ? a.pesos.pendiente / a.pesos.total : 0;
        return { ...a, exigencia, impacto, puntaje: exigencia + 0.25 * impacto };
      })
      .sort((x, y) => y.puntaje - x.puntaje);
  }

  /* ---------- Asistente de ponderación ---------- */

  /**
   * Trabaja sobre las evaluaciones de primer nivel (un bloque cuenta como una sola).
   * Reparte el % que falta para llegar a 100 entre las evaluaciones pendientes:
   *   - Si hay pendientes SIN ponderación (0 %), el restante se reparte solo entre ellas.
   *   - Si todas tienen %, el restante se suma en partes iguales a todas las pendientes.
   * Los centésimos sobrantes del redondeo se asignan a la última para que la suma sea exacta.
   * No modifica la entrada: devuelve { ok, pesos: { id: nuevoPeso }, restante, destinatarios }.
   */
  function distribuirPonderacion(evals) {
    const p = resumenPesos(evals);
    const restante = redondear(100 - p.total, 2);
    if (restante <= EPS) return { ok: false, motivo: p.exceso > EPS ? 'exceso' : 'completo', pesos: {} };
    const pendientes = evals.filter(ev => !estaCompleta(ev));
    if (!pendientes.length) return { ok: false, motivo: 'sin-pendientes', pesos: {} };

    const sinPeso = pendientes.filter(ev => peso(ev) === 0);
    const destino = sinPeso.length ? sinPeso : pendientes;
    const parte = Math.floor((restante / destino.length) * 100) / 100;
    const pesos = {};
    destino.forEach((ev, i) => {
      const extra = i === destino.length - 1 ? redondear(restante - parte * (destino.length - 1), 2) : parte;
      pesos[ev.id] = redondear(peso(ev) + extra, 2);
    });
    return { ok: true, restante, pesos, destinatarios: destino.length };
  }

  /* ---------- Máximo alcanzable (para mensajes constructivos) ---------- */

  /**
   * Meta realista = promedio final máximo posible, redondeado HACIA ABAJO a 1 decimal
   * (así la meta ajustada siempre es alcanzable sacando la nota máxima en lo pendiente).
   */
  function metaMaximaAlcanzable(analisisAsig) {
    if (analisisAsig.finalMaximo === null) return null;
    return Math.floor(analisisAsig.finalMaximo * 10 + 1e-7) / 10;
  }

  /* =========================================================
   * PERÍODOS
   * ========================================================= */

  /**
   * (5) Promedio de un período = media simple de los promedios actuales de sus asignaturas.
   *     Es la misma fórmula (4), aplicada solo a las asignaturas de ese período.
   */
  function promedioPeriodo(analisis, periodoId) {
    return promedioGeneral(analisis.filter(a => a.asig.periodoId === periodoId));
  }

  /**
   * (6) Promedio general acumulado = media simple de los promedios de TODAS las asignaturas
   *     de todos los períodos (cada asignatura-período cuenta una vez).
   */
  function promedioAcumulado(analisis) {
    return promedioGeneral(analisis);
  }

  /** Promedio anual al estilo escolar chileno: media de asignaturas redondeada a 1 decimal. */
  function promedioAnualEscolar(analisis) {
    const p = promedioGeneral(analisis);
    return p === null ? null : redondear(p, 1);
  }

  /* =========================================================
   * META DE PROMEDIO GENERAL (cálculo cruzado entre asignaturas)
   * ========================================================= */

  /**
   * Cada asignatura i se escribe como una recta en x (nota pareja en sus pendientes):
   *     Final_i(x) = base_i + f_i · x
   *   base_i = Σ_C n·w / W_i     (aporte ya asegurado por lo rendido)
   *   f_i    = W_P,i / W_i       (fracción de la asignatura que aún está en juego)
   * Casos: sin evaluaciones o sin % → base 0, f 1 (todo por rendir).
   *        sin pendientes con %     → base = promedio actual, f 0 (cerrada).
   */
  function rectaAsignatura(a) {
    const W = a.pesos.total, Wp = a.pesos.pendiente;
    if (!a.asig.evaluaciones.length || W < EPS) return { base: 0, f: 1 };
    if (Wp < EPS) return { base: a.actual ?? 0, f: 0 };
    return { base: sumaPuntos(a.evals) / W, f: Wp / W };
  }

  /**
   * (7) Esfuerzo parejo para la meta general G con n asignaturas:
   *     G = (1/n) · Σ (base_i + f_i·x)   ⇒   x = (G·n − Σ base_i) / Σ f_i
   * x es la MISMA nota que habría que sacar en lo pendiente de TODAS las asignaturas abiertas.
   * La meta sugerida de cada asignatura es Final_i(x): las que van mejor “compensan”
   * a las que van peor, y nadie necesita más esfuerzo que el resto.
   */
  function planMetaGeneral(analisis, metaGeneral, escala) {
    const n = analisis.length;
    if (!n || metaGeneral === null || metaGeneral === undefined) return null;
    // v8: cada asignatura pesa w (créditos o 1); con w = 1 es exactamente el cálculo anterior (W = n)
    const rectas = analisis.map(a => ({ a, w: pesoAsignatura(a.asig), ...rectaAsignatura(a) }));
    const W = rectas.reduce((s, r) => s + r.w, 0);
    const sumaBase = rectas.reduce((s, r) => s + r.w * r.base, 0);
    const sumaF = rectas.reduce((s, r) => s + r.w * r.f, 0);
    const minGeneral = (sumaBase + escala.min * sumaF) / W;
    const maxGeneral = (sumaBase + escala.max * sumaF) / W;

    let x = null, estado;
    if (sumaF < EPS) {
      estado = sumaBase / W + EPS >= metaGeneral ? 'lograda' : 'no-lograda';
    } else {
      x = (metaGeneral * W - sumaBase) / sumaF;
      estado = x > escala.max + EPS ? 'inalcanzable' : x <= escala.min + EPS ? 'asegurada' : 'alcanzable';
    }
    const xLim = x === null ? null : limitar(x, escala.min, escala.max);
    const sugerencias = rectas.map(r => ({
      id: r.a.asig.id,
      abierta: r.f > EPS,
      metaSugerida: xLim === null ? r.base : r.base + r.f * xLim,
    }));
    return { n, x, estado, sugerencias, minGeneral, maxGeneral, metaMaximaGeneral: Math.floor(maxGeneral * 10 + 1e-7) / 10 };
  }

  /**
   * (8) Aporte de cada asignatura al promedio general (v8: corregido).
   *     Con pesos w_i (créditos, o 1 si no hay) y W = Σ w_i, el general es P = Σ w_i·p_i / W.
   *  - parte_i   = w_i·p_i / W            → cuántos puntos del general “pone” esa asignatura (suman P).
   *  - efecto_i  = P − P_sin_i = w_i·(p_i − P) / (W − w_i)
   *                                      → cuánto sube (+) o baja (−) el general por incluirla.
   *  - vsMeta_i  = w_i·(p_i − G) / W      → su contribución a la distancia con la meta G (suman P − G).
   *  - sensibilidad_i = w_i / W           → subir 1 punto en ella sube el general en esa cantidad.
   * Antes solo se mostraba vsMeta con n grande: valores del orden de 0,001 que se veían como “+0,00”.
   */
  function aportesAlGeneral(analisis, metaGeneral) {
    const con = analisis.filter(a => a.actual !== null);
    if (!con.length) return [];
    const W = con.reduce((s, a) => s + pesoAsignatura(a.asig), 0);
    const P = con.reduce((s, a) => s + a.actual * pesoAsignatura(a.asig), 0) / W;
    return con.map(a => {
      const w = pesoAsignatura(a.asig);
      return {
        id: a.asig.id,
        parte: (w * a.actual) / W,
        efecto: W - w > EPS ? (w * (a.actual - P)) / (W - w) : 0,
        vsMeta: metaGeneral === null || metaGeneral === undefined ? null : (w * (a.actual - metaGeneral)) / W,
        sensibilidad: w / W,
        peso: w,
      };
    });
  }

  /* =========================================================
   * NEM (Notas de Enseñanza Media)
   * ========================================================= */

  /**
   * (9) Promedio NEM = media de los promedios anuales de 1° a 4° Medio disponibles,
   *     con 2 decimales (así lo usa DEMRE para la tabla de conversión).
   */
  function promedioNEM(promediosAnuales) {
    const vals = promediosAnuales.filter(v => typeof v === 'number' && Number.isFinite(v));
    if (!vals.length) return null;
    return redondear(vals.reduce((s, v) => s + v, 0) / vals.length, 2);
  }

  /**
   * (10) Puntaje NEM a partir de una tabla de pares [promedio, puntaje] ordenada.
   *  - Si la tabla tiene el promedio exacto (tabla oficial con paso 0,01) se usa ese valor.
   *  - Si no, se interpola linealmente entre los dos puntos vecinos (tabla de aproximación).
   *  - Bajo el primer punto se devuelve el primer puntaje; sobre el último, el último.
   */
  function puntajeNEM(promedio, tabla) {
    if (promedio === null || !tabla || !tabla.length) return null;
    const p = redondear(promedio, 2);
    if (p <= tabla[0][0]) return tabla[0][1];
    const ult = tabla[tabla.length - 1];
    if (p >= ult[0]) return ult[1];
    for (let i = 1; i < tabla.length; i++) {
      const [x1, y1] = tabla[i];
      if (Math.abs(x1 - p) < 1e-6) return y1;
      if (x1 > p) {
        const [x0, y0] = tabla[i - 1];
        return Math.round(y0 + ((p - x0) * (y1 - y0)) / (x1 - x0));
      }
    }
    return ult[1];
  }

  /**
   * Lee una tabla pegada desde demre.cl (o una planilla): cada línea con
   * "promedio  puntaje" (acepta coma decimal, tabuladores o espacios).
   * Devuelve { ok, tabla, errores }. Exige promedios crecientes y puntajes no decrecientes.
   */
  function parsearTablaNEM(texto) {
    const pares = [];
    for (const linea of String(texto).split(/\r?\n/)) {
      const m = linea.trim().match(/^(\d+[.,]\d+)\s*[\t;,| ]\s*(\d{2,4})\b/);
      if (m) pares.push([Number(m[1].replace(',', '.')), Number(m[2])]);
    }
    if (pares.length < 2) return { ok: false, errores: 'No se encontraron filas "promedio puntaje".' };
    pares.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < pares.length; i++) {
      if (pares[i][1] < pares[i - 1][1]) return { ok: false, errores: `Puntaje decreciente cerca del promedio ${pares[i][0]}.` };
    }
    return { ok: true, tabla: pares };
  }

  /* =========================================================
   * ADMISIÓN: puntaje ponderado y puntaje de corte
   * ========================================================= */

  /** Componentes del puntaje ponderado. "electiva" = la mejor entre Ciencias e Historia. */
  const COMPONENTES_ADMISION = ['nem', 'ranking', 'cl', 'm1', 'm2', 'ciencias', 'historia', 'electiva'];

  function valorComponente(k, puntajes) {
    if (k === 'electiva') {
      const vs = [puntajes.ciencias, puntajes.historia].filter(esNota);
      return vs.length ? Math.max(...vs) : null;
    }
    return esNota(puntajes[k]) ? puntajes[k] : null;
  }

  /**
   * (11) Puntaje ponderado = Σ p_k · w_k / 100   (w_k en %, deben sumar 100)
   * Devuelve total (null si falta algún puntaje con peso > 0), la suma parcial, el detalle
   * por componente y qué puntajes faltan.
   */
  function puntajePonderado(puntajes, ponderaciones) {
    let parcial = 0, sumaPesos = 0;
    const detalle = [], faltantes = [];
    for (const k of COMPONENTES_ADMISION) {
      const w = Number(ponderaciones?.[k]) || 0;
      if (w <= 0) continue;
      sumaPesos += w;
      const v = valorComponente(k, puntajes);
      if (v === null) { faltantes.push(k); continue; }
      const aporte = (v * w) / 100;
      parcial += aporte;
      detalle.push({ k, v, w, aporte });
    }
    return {
      total: faltantes.length ? null : parcial, parcial, detalle, faltantes,
      sumaPesos: redondear(sumaPesos, 4), pesosOk: Math.abs(sumaPesos - 100) < 0.01,
    };
  }

  /**
   * (12) Puntaje necesario en UN componente c para alcanzar el corte, dejando el resto fijo:
   *        corte = Σ_{k≠c} p_k·w_k/100 + x·w_c/100   ⇒   x = (corte − Σ_{k≠c} p_k·w_k/100) · 100 / w_c
   * Devuelve null si c no pondera o si falta otro puntaje.
   */
  function puntajeNecesario(componente, puntajes, ponderaciones, corte) {
    const wc = Number(ponderaciones?.[componente]) || 0;
    if (wc <= 0 || !esNota(corte)) return null;
    let resto = 0;
    for (const k of COMPONENTES_ADMISION) {
      const w = Number(ponderaciones?.[k]) || 0;
      if (w <= 0 || k === componente) continue;
      const v = valorComponente(k, puntajes);
      if (v === null) return null;
      resto += (v * w) / 100;
    }
    return ((corte - resto) * 100) / wc;
  }

  /**
   * (v16) Tres escenarios para llegar al corte con puntajes que EXISTEN en la escala PAES.
   * En vez de despejar un puntaje continuo (que puede dar valores imposibles como 857), se sube
   * de a UNA respuesta correcta en la tabla oficial de cada prueba (tablas[k] = [[correctas, puntaje]]),
   * desde el puntaje actual, hasta que el ponderado alcance el corte:
   *   1. "Enfocado": solo la prueba que más pondera.
   *   2. "Entre dos": las dos pruebas que más ponderan, repartiendo las correctas extra.
   *   3. "Repartido": todas las pruebas PAES de la carrera, repartiendo parejo.
   * NEM y Ranking no se modifican. 'electiva' sube la mejor entre Ciencias e Historia.
   * Devuelve [{ id, titulo, cambios: [{ k, desde, hasta, correctas }], total }] (solo los posibles).
   */
  function escenariosCorte(puntajes, ponderaciones, corte, tablas) {
    if (!esNota(corte)) return [];
    const base = puntajePonderado(puntajes, ponderaciones);
    if (base.total === null || base.total >= corte - EPS) return [];
    // Componentes editables: claves reales de puntaje con su peso
    const editables = [];
    for (const k of ['cl', 'm1', 'm2', 'ciencias', 'historia', 'electiva']) {
      const w = Number(ponderaciones?.[k]) || 0;
      if (w <= 0) continue;
      let clave = k;
      if (k === 'electiva') clave = esNota(puntajes.ciencias) && (!esNota(puntajes.historia) || puntajes.ciencias >= puntajes.historia) ? 'ciencias' : 'historia';
      const tabla = tablas[clave];
      if (!tabla || !esNota(puntajes[clave])) continue;
      const ya = editables.find(e => e.clave === clave);
      if (ya) { ya.w += w; continue; }
      editables.push({ clave, w, tabla: [...new Set(tabla.map(([, p]) => p))].sort((a, b) => a - b) });
    }
    if (!editables.length) return [];
    const ordenados = editables.slice().sort((a, b) => b.w - a.w);

    const simular = (comps, elegir) => {
      const estado = comps.map(c => {
        const v = puntajes[c.clave];
        // índice del mayor puntaje de la escala que no supera el actual (punto de partida en la tabla)
        let i = -1;
        c.tabla.forEach((p, j) => { if (p <= v + EPS) i = j; });
        return { ...c, desde: v, i, extra: 0 };
      });
      let total = base.total;
      for (let guarda = 0; guarda < 400 && total < corte - EPS; guarda++) {
        const candidatos = estado.filter(e => e.i + 1 < e.tabla.length);
        if (!candidatos.length) return null;   // ni con el máximo se alcanza
        const e = elegir(candidatos);
        const actual = e.i >= 0 ? Math.max(e.tabla[e.i], e.desde) : e.desde;
        const siguiente = e.tabla[e.i + 1];
        total += ((siguiente - actual) * e.w) / 100;
        e.i++; e.extra++;
      }
      const cambios = estado.filter(e => e.extra > 0).map(e => ({ k: e.clave, desde: e.desde, hasta: e.tabla[e.i], correctas: e.extra }));
      return { cambios, total };
    };
    // Elige la de menos correctas extra (reparto parejo); empate → la que más pondera
    const parejo = cands => cands.slice().sort((a, b) => a.extra - b.extra || b.w - a.w)[0];
    const definiciones = [
      { id: 'enfocado', titulo: 'Enfocado en una prueba', comps: ordenados.slice(0, 1) },
      { id: 'dos', titulo: 'Repartido entre dos pruebas', comps: ordenados.slice(0, 2) },
      { id: 'todas', titulo: 'Repartido entre todas tus pruebas', comps: ordenados },
    ];
    const vistos = new Set();
    return definiciones.map(d => {
      if (!d.comps.length) return null;
      const r = simular(d.comps, parejo);
      if (!r) return null;
      const firma = r.cambios.map(c => `${c.k}:${c.hasta}`).join('|');
      if (vistos.has(firma)) return null;   // no repetir el mismo escenario
      vistos.add(firma);
      return { id: d.id, titulo: d.titulo, ...r };
    }).filter(Boolean);
  }

  /** Promedio Competencia Lectora + Matemática M1 (requisito general de postulación). */
  function promedioClM1(puntajes) {
    return esNota(puntajes.cl) && esNota(puntajes.m1) ? (puntajes.cl + puntajes.m1) / 2 : null;
  }

  return {
    EPS, redondear, redondearArriba, limitar, peso, estaCalificada,
    esBloque, expandirEvaluaciones, notaBloque, estaCompleta,
    aplicarEquiponderado, parsearPeso, formatearPeso, indiceDiario, parsearNota, metaAmbiciosa,
    parsearDecimas, sumaDecimas, impactoDecimas, recomendarDecimas, pesosMezclados, promedioMetas, evaluarPromocion,
    COMPONENTES_ADMISION, puntajePonderado, puntajeNecesario, escenariosCorte, promedioClM1,
    resumenPesos, sumaPuntos, promedioActual, notaNecesaria, proyectarFinal,
    promedioGeneral, analizarAsignatura, priorizar, distribuirPonderacion,
    metaMaximaAlcanzable, promedioPeriodo, promedioAcumulado, promedioAnualEscolar,
    rectaAsignatura, planMetaGeneral, aportesAlGeneral, pesoAsignatura, claveAsignatura, promediosPorAsignatura, diasEntre, puntajeDesdeCorrectas, resumenEnsayos,
    promedioNEM, puntajeNEM, parsearTablaNEM,
  };
})();

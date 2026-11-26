'use strict';
/**
 * importador.js — Extractor heurístico de notas desde texto (p. ej. texto leído de una foto).
 *
 * Funciones puras, sin DOM: reciben texto y devuelven una PROPUESTA estructurada con avisos.
 * Nada se guarda aquí: la app siempre muestra la propuesta y pide confirmación explícita.
 *
 * Formatos que reconoce (uno por línea, se pueden mezclar):
 *   "Matemática"                       → encabezado: las notas siguientes van a esa asignatura
 *   "Mat." · "Leng" · "Cs. Soc" · "EFI"→ encabezados abreviados (diccionario de palabras clave)
 *   "Control 1   6,5   10%"            → evaluación + nota + ponderación
 *   "Prueba 2: 5.8 (25%)" · "[P2] 5,8 0,25" → idem con paréntesis/corchetes o ponderación decimal
 *   "C3 65"                            → abreviatura + nota escrita sin coma (65 → 6,5 en escala 1–7)
 *   "Lenguaje 6,2 5,9 6,8"             → asignatura con varias notas en la misma línea
 *   "Examen  --  30%" · "Examen  Pendiente  1/4" → evaluación sin nota → se propone como pendiente
 *   "1 ⇥ Control 1 ⇥ 12/05/2025 ⇥ 6,4 ⇥ 20%"   → tablas de intranet/libreta (columnas, N°, fechas)
 *   "N° | Fecha | Evaluación | Nota | Ponderación" → encabezados de tabla: se ignoran
 */
const Importador = (() => {
  /** Normaliza para comparar: sin tildes, minúsculas, solo letras/números. */
  function normalizar(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const capitalizar = s => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

  /* ---------- Diccionario de materias frecuentes en Chile ---------- */

  /**
   * Cada categoría tiene:
   *   frases  → expresiones de varias palabras (se buscan primero y se "consumen")
   *   abrev   → abreviaturas que deben coincidir EXACTAMENTE con una palabra ("ing", "efi")
   *   nombres → palabras completas; una palabra del texto de ≥3 letras que sea prefijo
   *             de alguna de ellas también cuenta ("matem" → "matematica")
   *   padre   → categoría más general (Biología ⊂ Ciencias)
   */
  const ALIAS_MATERIAS = {
    edfisica:     { frases: ['educacion fisica', 'ed fisica', 'ed fis', 'edu fisica'], abrev: ['efi', 'edf', 'efys'], nombres: ['deporte', 'deportes'] },
    ciencias:     { frases: ['ciencias naturales', 'cs naturales', 'cs nat', 'ciencias para la ciudadania', 'cs para la ciudadania', 'cs ciudadania'], abrev: ['cn', 'cs', 'cpc'], nombres: ['ciencias', 'ciencia'] },
    historia:     { frases: ['ciencias sociales', 'cs sociales', 'cs soc', 'formacion ciudadana'], abrev: ['hgcs', 'hgycs', 'hist'], nombres: ['historia', 'geografia', 'sociales'] },
    lenguaje:     { frases: ['lengua y literatura', 'lenguaje y comunicacion'], abrev: ['leng', 'com', 'lit', 'lyl', 'lyc'], nombres: ['lenguaje', 'lengua', 'literatura', 'comunicacion', 'lectura', 'castellano'] },
    matematica:   { frases: [], abrev: ['mat', 'mate', 'geom', 'calc'], nombres: ['matematica', 'matematicas', 'algebra', 'calculo', 'geometria', 'estadistica', 'trigonometria', 'aritmetica'] },
    biologia:     { frases: [], abrev: ['bio', 'biol'], nombres: ['biologia'], padre: 'ciencias' },
    quimica:      { frases: [], abrev: ['quim', 'qca'], nombres: ['quimica'], padre: 'ciencias' },
    fisica:       { frases: [], abrev: ['fis'], nombres: ['fisica'], padre: 'ciencias' },
    ingles:       { frases: ['idioma extranjero'], abrev: ['ing', 'eng'], nombres: ['ingles', 'english'] },
    filosofia:    { frases: [], abrev: ['filo', 'fil'], nombres: ['filosofia'] },
    programacion: { frases: [], abrev: ['prog', 'comp', 'info'], nombres: ['programacion', 'computacion', 'informatica'] },
    tecnologia:   { frases: [], abrev: ['tec', 'tecno'], nombres: ['tecnologia'] },
    artes:        { frases: ['artes visuales'], abrev: ['art', 'av'], nombres: ['artes', 'arte'] },
    musica:       { frases: [], abrev: ['mus'], nombres: ['musica'] },
    religion:     { frases: [], abrev: ['rel'], nombres: ['religion'] },
    orientacion:  { frases: [], abrev: ['orient'], nombres: ['orientacion'] },
  };

  /**
   * Términos temáticos (contenidos típicos) para INFERIR la materia cuando el texto no la nombra:
   * "Prueba Escrita N°2 Fuerzas centrales" → física. Se comparan palabras completas o con el
   * mismo comienzo (≥5 letras, para aceptar plurales: "fuerza" ↔ "fuerzas").
   */
  const TEMAS_MATERIAS = {
    matematica: ['derivada', 'derivadas', 'ecuacion', 'ecuaciones', 'funcion', 'funciones', 'integral', 'logaritmo', 'potencias', 'raices', 'probabilidad', 'probabilidades', 'polinomio', 'inecuacion', 'matriz', 'matrices', 'vectores', 'limites', 'fracciones', 'trigonometria', 'teorema', 'pitagoras', 'algebraica', 'algebra', 'geometria', 'estadistica'],
    lenguaje: ['poema', 'poesia', 'narrativa', 'cuento', 'novela', 'argumentacion', 'argumentativo', 'comprension', 'lectora', 'gramatica', 'ortografia', 'redaccion', 'dramatico', 'lirico', 'literaria', 'literatura', 'lectura'],
    biologia: ['adn', 'celula', 'celulas', 'celular', 'genetica', 'ecosistema', 'ecosistemas', 'evolucion', 'fotosintesis', 'mitosis', 'meiosis', 'herencia', 'organismo', 'sistema nervioso', 'microorganismos', 'biodiversidad', 'homeostasis', 'proteinas'],
    fisica: ['cinematica', 'dinamica', 'fuerza', 'fuerzas', 'energia', 'movimiento', 'newton', 'ondas', 'sonido', 'optica', 'electricidad', 'magnetismo', 'gravitacion', 'cosmos', 'cosmogonia', 'cosmogonias', 'universo', 'astronomia', 'velocidad', 'aceleracion', 'termodinamica', 'circuitos'],
    quimica: ['reaccion', 'reacciones', 'enlace', 'enlaces', 'estequiometria', 'tabla periodica', 'atomo', 'atomos', 'molecula', 'moleculas', 'soluciones', 'acidos', 'organica', 'mol', 'oxidacion'],
    historia: ['democracia', 'revolucion', 'guerra', 'independencia', 'republica', 'dictadura', 'colonia', 'imperio', 'edad media', 'ilustracion', 'industrializacion', 'globalizacion', 'territorio', 'geografia', 'proceso historico', 'constitucion'],
    ingles: ['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'],
    filosofia: ['etica', 'logica', 'platon', 'aristoteles', 'epistemologia', 'metafisica', 'argumentos'],
    programacion: ['python', 'algoritmo', 'algoritmos', 'codigo', 'javascript', 'base de datos'],
  };

  /** Categoría temática más probable de un conjunto de textos (null si no hay evidencia). */
  function inferirTema(textos) {
    const votos = {};
    for (const t of textos) {
      const s = ` ${normalizar(t)} `;
      const toks = s.trim().split(' ');
      for (const [cat, temas] of Object.entries(TEMAS_MATERIAS)) {
        for (const tema of temas) {
          const hit = tema.includes(' ') ? s.includes(` ${tema} `)
            : toks.some(w => w === tema || (w.length >= 5 && tema.length >= 5 && (w.startsWith(tema) || tema.startsWith(w))));
          if (hit) { votos[cat] = (votos[cat] || 0) + 1; break; }
        }
      }
    }
    const orden = Object.entries(votos).sort((a, b) => b[1] - a[1]);
    if (!orden.length) return null;
    return { categoria: orden[0][0], votos: orden[0][1], total: textos.length };
  }

  /** Categorías (Set) que menciona un texto: "Hist., Geo. y Cs. Soc." → {historia}. */
  function categoriasDe(texto) {
    let s = ` ${normalizar(texto)} `;
    const cats = new Set();
    // 1) Frases (más específicas) primero; se eliminan del texto para no confundir ("ed fis" ≠ "fis")
    for (const [cat, d] of Object.entries(ALIAS_MATERIAS)) {
      for (const f of d.frases) {
        if (s.includes(` ${f} `)) { cats.add(cat); s = s.replace(` ${f} `, ' '); }
      }
    }
    // 2) Palabras sueltas
    const tokens = s.trim().split(' ').filter(Boolean);
    for (const t of tokens) {
      for (const [cat, d] of Object.entries(ALIAS_MATERIAS)) {
        if (d.abrev.includes(t) || (t.length >= 3 && d.nombres.some(n => n.startsWith(t)))) cats.add(cat);
      }
    }
    return cats;
  }

  /** Relación entre categorías: 1 = misma, 0,8 = una es "padre" de la otra (Biología ↔ Ciencias), 0 = nada. */
  function afinidad(catsA, catsB) {
    let mejor = 0;
    for (const a of catsA) {
      for (const b of catsB) {
        if (a === b) return 1;
        if (ALIAS_MATERIAS[a]?.padre === b || ALIAS_MATERIAS[b]?.padre === a) mejor = Math.max(mejor, 0.8);
      }
    }
    return mejor;
  }

  /**
   * Busca la asignatura más parecida a `nombre`.
   *  - 1,0 si son iguales; 0,9 si uno contiene al otro;
   *  - fracción de palabras (≥3 letras) del texto que son prefijo de alguna palabra de la asignatura × 0,85;
   *  - diccionario de palabras clave: misma categoría 0,8 ("Álgebra" ↔ "Matemática"),
   *    categoría relacionada 0,64 ("Biol" ↔ "Ciencias Naturales").
   * Devuelve { asig, puntaje } con puntaje ≥ 0,6, o null.
   */
  function buscarAsignatura(nombre, asignaturas, temaPreferido = null) {
    const q = normalizar(nombre);
    if (!q) return null;
    const tq = q.split(' ').filter(t => t.length >= 3);
    const catsQ = categoriasDe(q);
    let mejor = null;
    for (const asig of asignaturas || []) {
      const n = normalizar(asig.nombre);
      let puntaje = 0;
      if (n === q) puntaje = 1;
      else if (` ${n} `.includes(` ${q} `) || ` ${q} `.includes(` ${n} `)) puntaje = 0.9; // contiene la palabra completa
      else if (tq.length) {
        const tn = n.split(' ');
        const hits = tq.filter(t => tn.some(w => w.startsWith(t) || t.startsWith(w) && w.length >= 4)).length;
        puntaje = (hits / tq.length) * 0.85;
      }
      if (catsQ.size && puntaje < 1) {
        const catsN = categoriasDe(n);
        const af = afinidad(catsQ, catsN);
        if (af === 0 && catsN.size) puntaje = 0;                          // áreas distintas: "Educación Física" no es "Física"
        puntaje = Math.min(0.99, Math.max(puntaje, 0.8 * af) + (af === 1 ? 0.05 : 0)); // misma materia: desempata
      }
      // Desempate por contenidos: "Física - Electivo Matemática" + temas de física → Física
      if (temaPreferido && puntaje >= 0.6 && categoriasDe(n).has(temaPreferido)) puntaje = Math.min(1, puntaje + 0.03);
      if (puntaje >= 0.6 && (!mejor || puntaje > mejor.puntaje)) mejor = { asig, puntaje };
    }
    return mejor;
  }

  /** ¿El texto parece un nombre de materia (diccionario) aunque no esté en el perfil? */
  const pareceMateria = texto => categoriasDe(texto).size > 0;

  /**
   * Interpreta un número como nota de la escala.
   * En escalas cortas (ej. 1–7) acepta enteros "sin coma" de 10 a 70 (64 → 6,4) e informa la interpretación.
   */
  function interpretarNota(token, escala) {
    const n = Number(token.replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    const conDecimal = /[.,]/.test(token);
    const corta = escala.max - escala.min <= 20;
    if (n >= escala.min && n <= escala.max) return { nota: n, aviso: null };
    if (corta && !conDecimal && n >= escala.min * 10 && n <= escala.max * 10) {
      return { nota: n / 10, aviso: `“${token}” se interpretó como ${(n / 10).toFixed(1)}.` };
    }
    return null;
  }

  const PALABRAS_EVAL = 'control|prueba|certamen|solemne|quiz|tarea|test|laboratorio|lab|parcial|evaluaci[oó]n|interrogaci[oó]n|informe|trabajo|examen|disertaci[oó]n|exposici[oó]n|presentaci[oó]n|ensayo|proyecto|proceso|taller|gu[ií]a|actividad|debate|maqueta|portafolio|bit[aá]cora|ejercicio|revisi[oó]n|lectura';
  const RE_EVAL = new RegExp(`(?:^|[^\\p{L}])(${PALABRAS_EVAL})(?![\\p{L}])\\.?\\s*(?:n[°º.]?\\s*)?(\\d{1,2}(?![.,]\\d))?`, 'iu');
  const RE_CORTA = /(?:^|[^\p{L}])([CPT])\s?-?(\d{1,2})(?![\d.,])/u;
  const RE_PROMEDIO = /(?:^|[^\p{L}])(promedio|prom\.|nota final|promedio final)(?![\p{L}])/iu;
  const RE_PERIODO = /(?:^|[^\p{L}])(semestre|trimestre|bimestre|cuatrimestre|per[ií]odo)(?![\p{L}])/iu;
  const RE_FECHA = /\b\d{4}-\d{1,2}-\d{1,2}\b|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}:\d{2}\b/g;
  // Un número suelto: acepta que lo siga una coma o punto de puntuación ("6,5, 5,8" · "6.5."), pero no otro dígito
  const RE_NUMERO = /(?<![\p{L}\d]|\d[.,])(\d{1,3}(?:[.,]\d{1,2})?)(?![\p{L}\d]|[.,]\d)/gu;
  const RE_FRACCION = /(?<![\d/])(\d{1,2})\s?\/\s?(\d{1,2})(?![\d/])/g;
  const RE_DECIMAL_PESO = /(?<![\d.,])(0?[.,]\d{1,3})(?![\d.,%])/g;
  const RE_N_FILA = /^\s*\d{1,2}\s*[.)\-]?\s+(?=\S)/;
  /** "N°1" y sus lecturas erróneas del OCR: "N*1", "N%3", "N*%2", "Nº 4", "Nro. 2", "N1" */
  const RE_NUM_EVAL = /(?<![\p{L}])(?:n[°º*%#'´`.]{1,3}|nro\.?|n[uú]m\.?|n(?=\d))\s*(\d{1,2})(?![\d.,%])/giu;
  /** Nota con letras confundidas por el OCR: "7,O" → 7,0 · "6.l" → 6,1 · "S,5" → 5,5 */
  // Sin espacios alrededor de la coma: "6,5, 5,8" NO debe convertirse en "5,5"
  const RE_NOTA_OCR = /(?<![\p{L}\d])([0-9OoIl])([.,])([0-9OoIl])(?![\p{L}\d])/gu;
  const ARREGLO_OCR = { O: '0', o: '0', I: '1', l: '1' };
  const ABREV = { C: 'Control', P: 'Prueba', T: 'Tarea' };

  /** Palabras de encabezado de tabla (una línea formada solo por ellas se ignora). */
  const ENCABEZADOS = new Set(['n', 'no', 'nro', 'num', 'numero', 'fecha', 'fechas', 'ponderacion', 'ponderaciones', 'pond', 'porcentaje', 'peso',
    'nota', 'notas', 'calificacion', 'calificaciones', 'estado', 'promedio', 'evaluacion', 'evaluaciones', 'asignatura', 'asignaturas',
    'materia', 'ramo', 'descripcion', 'tipo', 'observacion', 'observaciones', 'obs', 'detalle', 'coef', 'coeficiente', 'de', 'y']);
  /** Palabras de estado/columna que se quitan del nombre de la evaluación. */
  const RUIDO = new Set(['nota', 'notas', 'ponderacion', 'pond', 'porcentaje', 'peso', 'fecha', 'estado', 'calificacion', 'obs',
    'rendida', 'rendido', 'aprobada', 'aprobado', 'reprobada', 'reprobado', 'calificada', 'calificado', 'pendiente', 'pendientes']);

  const esEncabezado = linea => {
    const toks = normalizar(linea).split(' ').filter(Boolean);
    return toks.length >= 1 && toks.every(t => ENCABEZADOS.has(t)) && !/\d/.test(linea.replace(/n[°º]/gi, ''));
  };

  const limpiarRuido = s => s.split(' ').filter(w => w && !RUIDO.has(normalizar(w))).join(' ');

  /*
   * Los números que forman parte del NOMBRE ("Control 1", "Prueba N°2") se "protegen"
   * reemplazando sus dígitos por caracteres privados (U+E000–U+E009): así no se confunden
   * con notas y al final se restauran.
   */
  const proteger = d => String(d).replace(/\d/g, c => String.fromCharCode(0xE000 + Number(c)));
  const restaurar = s => s.replace(/[\uE000-\uE009]/g, c => String(c.charCodeAt(0) - 0xE000)).replace(/Nº/g, 'N°');
  const primeraMayuscula = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  /** Limpia un texto para usarlo como nombre: solo letras, números protegidos, "Nº" y espacios. */
  const textoLimpio = s => limpiarRuido(s.replace(/[^\p{L}\uE000-\uE009 ]/gu, ' ').replace(/\s+/g, ' ').trim());

  /** Ponderación escrita con "%": "02%" (OCR perdió el punto) → 0,2. */
  function leerPorcentaje(p, avisosLinea) {
    if (/^0\d+$/.test(p)) {
      const v = Number(`0.${p.slice(1)}`);
      avisosLinea.push(`“${p}%” se leyó como ${String(v).replace('.', ',')}% (parece que el OCR perdió la coma).`);
      return v;
    }
    return Number(p.replace(',', '.'));
  }

  /**
   * Normaliza las ponderaciones escritas con "%" de un grupo según el modo:
   *   'pct'  → se respeta el porcentaje tal cual ("0,05%" = 0,05 %).
   *   'dec'  → todo valor ≤ 1 es una fracción del total (0,2 → 20 %).
   *   'auto' → se respeta, salvo que TODAS las ponderaciones con % del grupo sean ≤ 1 y sumen ≈ 1:
   *            en ese caso son fracciones (muchas intranets muestran "0.2 %" queriendo decir 20 %).
   */
  function normalizarPesosGrupo(g, modo) {
    const literales = g.filas.filter(f => f.pesoLiteral && f.peso !== null);
    if (!literales.length || modo === 'pct') return;
    const todosMenoresA1 = literales.every(f => f.peso <= 1);
    const suma = literales.reduce((s, f) => s + f.peso, 0);
    const convertir = modo === 'dec' ? todosMenoresA1 || null : todosMenoresA1 && literales.length >= 2 && suma >= 0.95 && suma <= 1.05;
    if (modo === 'dec') {
      literales.filter(f => f.peso <= 1).forEach(f => { f.peso = Math.round(f.peso * 10000) / 100; });
      return;
    }
    if (convertir) {
      literales.forEach(f => { f.peso = Math.round(f.peso * 10000) / 100; });
      g.avisosPeso = `Las ponderaciones venían como fracción del total (suman ${String(Math.round(suma * 100) / 100).replace('.', ',')}): se convirtieron a porcentaje (0,2 → 20%). Cámbialo en “Formato de ponderación” si no corresponde.`;
    }
  }

  /**
   * Convierte texto libre en una propuesta:
   *   { grupos: [{ nombreDetectado, coincidencia, tema, avisos, filas: [{ evaluacion, nota, peso, avisos }] }], avisos }
   * opciones.materiaFija = true → el estudiante ya eligió la materia: todas las notas forman UN grupo
   *   y los encabezados de asignatura del texto se ignoran (solo se informan).
   * opciones.modoPeso = 'auto' | 'pct' | 'dec' → cómo leer ponderaciones escritas con "%".
   * Nunca lanza errores: lo que no entiende lo informa en `avisos`.
   */
  function parsearTexto(texto, escala, asignaturas, opciones = {}) {
    const grupos = [];
    const avisos = [];
    const modoPeso = ['pct', 'dec'].includes(opciones.modoPeso) ? opciones.modoPeso : 'auto';
    let actual = null;
    let genericos = 0;
    // Columnas partidas por el OCR: "Control 1" en una línea y "6,5  10%" en la siguiente
    let filaEsperandoNota = null;   // fila pendiente creada desde una línea sin números
    let candidatoNombre = null;     // línea de texto suelta que podría ser nombre de evaluación (no de asignatura)
    const permitePesoDecimal = escala.min >= 1; // en escalas que parten en 1, "0,25" no puede ser nota
    const grupoPara = nombre => {
      let g = grupos.find(x => normalizar(x.nombreDetectado) === normalizar(nombre) && (nombre !== null) === (x.nombreDetectado !== null));
      if (!g) { g = { nombreDetectado: nombre, filas: [] }; grupos.push(g); }
      return g;
    };
    const esNombreMateria = s => s.length >= 2 && (!!buscarAsignatura(s, asignaturas) || pareceMateria(s));

    for (const original of String(texto || '').split(/\r?\n/)) {
      // Separadores de tablas (| ; tab) y paréntesis/corchetes → espacios
      let linea = original.replace(/[|;\t[\]{}()]/g, '  ').trim();
      if (!linea) continue;
      if (esEncabezado(linea)) continue;
      // Letras que el OCR confunde con dígitos dentro de una nota ("7,O")
      linea = linea.replace(RE_NOTA_OCR, (m, a, s, b) => (/\d/.test(a + b) ? `${ARREGLO_OCR[a] ?? a}${s}${ARREGLO_OCR[b] ?? b}` : m));
      const esLineaEval = RE_EVAL.test(linea);
      if (RE_PROMEDIO.test(linea) && !esLineaEval) {
        avisos.push(`Se omitió “${original.trim()}”: parece un promedio, no una evaluación.`);
        continue;
      }
      if (RE_PERIODO.test(linea) && !esLineaEval && /\d/.test(linea)) {
        avisos.push(`Se omitió “${original.trim()}”: parece el promedio de un período, no una evaluación.`);
        continue;
      }

      // Número de fila de una tabla ("3 ⇥ Examen …"), si después viene algo más con números o texto
      if (RE_N_FILA.test(linea) && /[\d\p{L}]/u.test(linea.replace(RE_N_FILA, ''))
        && (/\d/.test(linea.replace(RE_N_FILA, '')) || /\s{2,}/.test(original.replace(/\t/g, '  ')))) {
        linea = linea.replace(RE_N_FILA, ' ');
      }

      // "N°1" (y "N*1", "N%3"…) es parte del nombre: se protege ANTES de buscar % y notas
      linea = linea.replace(RE_NUM_EVAL, (_, d) => ` Nº${proteger(d)} `);

      // 0) Ponderaciones como fracción "1/4" (antes de quitar fechas)
      const pesos = [];        // en %, con marca de si venían escritas con "%" (para normalizar por grupo)
      const avisosLinea = [];
      linea = linea.replace(RE_FRACCION, (m, a, b) => {
        const na = Number(a), nb = Number(b);
        if (na > 0 && na < nb && nb <= 10) {
          const w = Math.round((na / nb) * 10000) / 100;
          pesos.push({ w, literal: false });
          avisosLinea.push(`“${m}” se interpretó como ponderación ${w}%.`);
          return ' ';
        }
        return m;
      });
      // Fechas y horas
      linea = linea.replace(RE_FECHA, ' ');

      // 1) Ponderaciones con % (se asocian siempre al número inmediatamente anterior) y en decimal
      linea = linea.replace(/(\d{1,3}(?:[.,]\d+)?)\s*%/g, (_, p) => { pesos.push({ w: leerPorcentaje(p, avisosLinea), literal: true }); return ' '; });
      if (permitePesoDecimal) {
        linea = linea.replace(RE_DECIMAL_PESO, (m, p) => {
          const v = Number(p.replace(',', '.'));
          if (!(v > 0 && v <= 1)) return m;
          pesos.push({ w: Math.round(v * 10000) / 100, literal: false });
          return ' ';
        });
      }

      // 2) Nombre de evaluación (palabra clave o abreviatura C1/P2/T3): se deja en su lugar, con su número protegido
      let esEval = false;
      let m = linea.match(RE_EVAL);
      if (m) {
        esEval = true;
        linea = linea.replace(m[0], m[0].replace(m[1], primeraMayuscula(m[1].toLowerCase())).replace(/(\d{1,2})\s*$/, d => proteger(d)));
      } else if ((m = linea.match(RE_CORTA))) {
        esEval = true;
        linea = linea.replace(m[0], ` ${ABREV[m[1].toUpperCase()]} ${proteger(m[2])} `);
      }

      // 3) Notas
      const notas = [];
      const avisosNota = [...avisosLinea];
      linea = linea.replace(RE_NUMERO, tok => {
        const r = interpretarNota(tok, escala);
        if (!r) return tok;
        notas.push(r.nota);
        if (r.aviso) avisosNota.push(r.aviso);
        return ' ';
      });
      // Nota ilegible: hay ponderación pero en lugar de la nota quedó algo como "YA" o "T0"
      let ilegible = null;
      if (!notas.length && pesos.length) {
        const mm = linea.match(/(?:^|\s)([A-Z0-9][A-Z0-9]?)\s*$/);
        if (mm) { ilegible = mm[1]; linea = linea.slice(0, mm.index); }
      }

      const nombreTexto = textoLimpio(linea);                        // nombre completo, en su orden original
      const evalParte = (nombreTexto.match(new RegExp(`(?:^|\\s)(${PALABRAS_EVAL})(?:\\s+(?:Nº)?[\\uE000-\\uE009]+)?`, 'iu')) || [''])[0].trim();
      const resto = textoLimpio(nombreTexto.replace(evalParte, ' ').replace(/Nº[\uE000-\uE009]+/g, ' ').replace(/[\uE000-\uE009]/g, ' '));
      const restoEsAsignatura = resto.length >= 2 && esNombreMateria(resto);
      const nombreFila = restoEsAsignatura ? evalParte : nombreTexto;
      const pesoDe = i => (pesos.length === Math.max(notas.length, 1) ? pesos[i] : pesos.length && notas.length <= 1 ? pesos[0] : null);
      const soloNumeros = !nombreTexto && !esEval && !ilegible;

      // Línea que trae solo nota y/o ponderación: completa la fila anterior si quedó sin datos
      if (soloNumeros && notas.length <= 1 && (notas.length || pesos.length)) {
        if (candidatoNombre && !filaEsperandoNota) {
          // La línea de texto anterior era el nombre de una evaluación, no de una asignatura
          actual = candidatoNombre.grupoPrevio;
          const g0 = actual ?? grupoPara(null);
          filaEsperandoNota = { evaluacion: restaurar(primeraMayuscula(candidatoNombre.texto)).slice(0, 60), nota: null, peso: null, pesoLiteral: false, avisos: [] };
          g0.filas.push(filaEsperandoNota);
        }
        candidatoNombre = null;
        const fila = filaEsperandoNota;
        if (fila && (fila.nota === null || fila.peso === null)) {
          if (notas.length && fila.nota === null) fila.nota = notas[0];
          const p = pesoDe(0);
          if (p && fila.peso === null) { fila.peso = p.w; fila.pesoLiteral = p.literal; }
          fila.avisos = [...fila.avisos.filter(a => !a.startsWith('Sin nota') && !a.startsWith('Falta la ponderación') && !a.startsWith('Nota y ponderación')), ...avisosNota,
            'Nota y ponderación venían en líneas separadas: revisa que correspondan.'];
          if (fila.nota === null) fila.avisos.push('Sin nota: se agregará como pendiente.');
          if (fila.peso === null) fila.avisos.push('Falta la ponderación (%).');
          if (fila.nota !== null && fila.peso !== null) filaEsperandoNota = null;
          continue;
        }
      }
      if (!soloNumeros) candidatoNombre = null;

      // Línea sin notas: evaluación pendiente (o ilegible), o encabezado de asignatura
      if (!notas.length) {
        if (esEval || ilegible) {
          const g = restoEsAsignatura ? grupoPara(resto) : (actual ?? grupoPara(null));
          const p = pesoDe(0);
          const fila = {
            evaluacion: restaurar(primeraMayuscula(nombreFila || nombreTexto)).slice(0, 60) || 'Evaluación', nota: null,
            peso: p?.w ?? null, pesoLiteral: !!p?.literal,
            avisos: [...avisosLinea, ilegible ? `No se pudo leer la nota (“${ilegible}”): escríbela o déjala pendiente.` : 'Sin nota: se agregará como pendiente.', ...(p ? [] : ['Falta la ponderación (%).'])],
          };
          g.filas.push(fila);
          filaEsperandoNota = ilegible ? null : fila;
        } else if (resto.length >= 3 || restoEsAsignatura) {
          // Si no parece asignatura, podría ser el nombre de una evaluación cuya nota viene en la línea siguiente
          candidatoNombre = restoEsAsignatura ? null : { texto: nombreTexto, grupoPrevio: actual };
          actual = grupoPara(restaurar(resto));
          filaEsperandoNota = null;
        }
        continue;
      }

      // Línea con notas: ¿a qué asignatura van?
      filaEsperandoNota = null;
      let g = actual;
      let nombreBase = nombreFila;
      if (restoEsAsignatura || (!esEval && resto.length >= 3 && (notas.length > 1 || !actual))) {
        g = grupoPara(restaurar(resto));
        actual = g;
        nombreBase = evalParte;
      }
      if (!g) g = grupoPara(null);
      nombreBase = restaurar(primeraMayuscula(nombreBase || '')).slice(0, 60);

      notas.forEach((nota, i) => {
        const av = [...avisosNota];
        let nombre = nombreBase;
        if (notas.length > 1) nombre = nombreBase ? `${nombreBase} (${i + 1})` : `Nota ${i + 1}`;
        if (!nombre) {
          genericos++;
          nombre = `Evaluación ${genericos}`;
          av.push('Falta el nombre de la evaluación: se usó un nombre genérico.');
        }
        const p = pesoDe(i);
        if (!p && pesos.length) av.push('Hay porcentajes en la línea, pero no se pudieron asociar a cada nota.');
        if (!p) av.push('Falta la ponderación (%).');
        g.filas.push({ evaluacion: nombre, nota, peso: p?.w ?? null, pesoLiteral: !!p?.literal, avisos: av });
      });
    }

    let resultado = grupos.filter(g => g.filas.length);

    // Materia elegida de antemano: un único grupo, sin confundirse con encabezados sueltos
    if (opciones.materiaFija && resultado.length) {
      const nombres = resultado.map(g => g.nombreDetectado).filter(Boolean);
      resultado = [{ nombreDetectado: null, filas: resultado.flatMap(g => g.filas), ignorados: nombres }];
    }

    for (const g of resultado) {
      normalizarPesosGrupo(g, modoPeso);
      // Materia inferida por los contenidos ("Fuerzas centrales", "ADN"…): ayuda cuando el nombre no basta o es ambiguo
      g.tema = inferirTema(g.filas.map(f => f.evaluacion)) || inferirTema([g.nombreDetectado || '']);
      g.coincidencia = g.nombreDetectado ? buscarAsignatura(g.nombreDetectado, asignaturas, g.tema?.categoria) : null;
      g.avisos = g.avisosPeso ? [g.avisosPeso] : [];
      delete g.avisosPeso;
      g.filas.forEach(f => { delete f.pesoLiteral; });
      if (opciones.materiaFija) continue;
      if (!g.nombreDetectado) g.avisos.push('No se detectó el nombre de la asignatura en el texto.');
      else if (!g.coincidencia) g.avisos.push(`“${g.nombreDetectado}” no coincide claramente con tus asignaturas.`);
    }
    if (!resultado.length) avisos.push('No se detectaron notas. Si la imagen está borrosa o incompleta, corrige o escribe el texto manualmente.');
    return { grupos: resultado, avisos };
  }

  /* =========================================================
   * INFORME COMPLETO DE NOTAS (varias asignaturas en un solo documento)
   * Formato típico de colegios chilenos (ej. "Informe Notas Semestrales Alumno"):
   *   Asignatura | N1 N2 … N12 CP | PRO NS1 NS2 NF PG
   * Al copiar o leer por OCR se pierden las celdas vacías, por eso NO se puede saber la columna
   * de cada número por su posición. Se usa la consistencia: las últimas k cifras de la fila son
   * el resumen (promedio del período, notas semestrales, final, promedio del grupo) y el
   * promedio simple de las anteriores (las parciales) debe coincidir con la primera de ellas (PRO).
   * Se elige el k que cumple esa regla en la mayoría de las filas (en el 1er semestre suele faltar NS2).
   * ========================================================= */

  /** Encabezados de columnas de resumen que se reconocen (en orden habitual). */
  const RESUMEN_COLUMNAS = ['pro', 'prom', 'ns1', 'ns2', 'ns3', 'nf', 'pg', 'pf', 'promedio', 'final'];
  const RE_CONCEPTO = /^(MB|B|S|I|L|NL|ML|PL|AL|NO|LO)$/;
  const RE_NO_ASIGNATURA = /^(promedio general|promedio|asistencia|n\s*°?\s*atrasos|atrasos|observaciones|alumno|curso|profesor|rector|calificaciones|asignaturas|nota final|finales)\b/i;
  const RE_NOTA_INFORME = /(?<![\p{L}\d]|\d[.,])(\d[.,]\d{1,2}|\d{2})(?![\p{L}\d%]|[.,]\d)/gu;

  /** Detecta "Primer/Segundo Semestre", "1er Trimestre", etc. */
  function detectarPeriodo(texto) {
    const t = normalizar(texto);
    const ord = { primer: 1, primero: 1, '1er': 1, '1': 1, segundo: 2, '2do': 2, '2': 2, tercer: 3, tercero: 3, '3er': 3, '3': 3, cuarto: 4, '4to': 4, '4': 4 };
    const m = t.match(/\b(primer|primero|1er|segundo|2do|tercer|tercero|3er|cuarto|4to|[1-4])\s*(semestre|trimestre|bimestre)\b/);
    return m ? { numero: ord[m[1]], tipo: m[2] } : null;
  }

  /**
   * Convierte el texto de un informe en filas { asignatura, numeros[] }.
   * Une filas partidas en varias líneas ("Pensamiento Computacional y" / "Programación" / "7,0 7,0 7,0").
   */
  function filasInforme(texto, escala) {
    const filas = [];
    let previa = null;          // última fila de asignatura (para continuaciones)
    let lineasDesdeFila = 99;
    let fin = false;
    for (const original of String(texto || '').split(/\r?\n/)) {
      if (fin) break;
      const linea = original.replace(/[|;\t]/g, '  ').trim();
      lineasDesdeFila++;
      if (!linea) continue;
      // Desde la leyenda o las observaciones ya no hay filas de notas
      if (/^(calificaciones en cursiva|observaciones)\b/i.test(linea)) { fin = true; continue; }
      const tokens = linea.split(/\s+/);
      const numeros = [];
      linea.replace(RE_NOTA_INFORME, tok => { const r = interpretarNota(tok, escala); if (r) numeros.push({ nota: r.nota, escalada: !!r.aviso, tok }); return tok; });
      // Texto antes del primer número (nombre de la asignatura) y lo que viene después
      const m = linea.match(/^(.*?)(?=(?<![\p{L}\d])\d[.,]\d|$)/u);
      const nombre = (m ? m[1] : linea).replace(/[^\p{L}\s:.,()-]/gu, ' ').replace(/\s+/g, ' ').trim().replace(/[\s:.,-]+$/, '');
      const despues = m ? linea.slice(m[1].length) : '';
      const restoTexto = despues.replace(RE_NOTA_INFORME, ' ').replace(/\s+/g, ' ').trim();
      const soloConceptos = tokens.length && tokens.every(t => RE_CONCEPTO.test(t));

      // Línea solo con números: continuación de la fila anterior (máx. 2 líneas después)
      if (!nombre && numeros.length && !restoTexto && previa && lineasDesdeFila <= 2 && numeros.some(n => /[.,]/.test(n.tok))) {
        previa.numeros.push(...numeros);
        lineasDesdeFila = 0;
        continue;
      }
      // Línea de texto corta sin números justo después de una fila: resto del nombre partido
      if (nombre && !numeros.length && previa && lineasDesdeFila === 1 && nombre.split(' ').length <= 4
        && !RE_NO_ASIGNATURA.test(nombre) && !tokens.some(t => RE_CONCEPTO.test(t))) {
        previa.asignatura = `${previa.asignatura} ${nombre}`;
        continue;
      }
      // Fila de asignatura: nombre + números al final, sin prosa después de los números.
      // Debe tener al menos una nota con decimal: así se descartan encabezados como "1 2 3 … 12 CP PRO".
      const prosaDespues = /[\p{L}]{3,}/u.test(restoTexto.replace(/\b(MB|B|S|I)\b/g, ''));
      const conDecimal = numeros.some(n => /[.,]/.test(n.tok));
      if (nombre && numeros.length && conDecimal && !prosaDespues && nombre.split(' ').length <= 9 && !RE_NO_ASIGNATURA.test(nombre)
        && /[\p{L}]{3,}/u.test(nombre)) {
        previa = { asignatura: nombre, numeros };
        filas.push(previa);
        lineasDesdeFila = 0;
        continue;
      }
      // Fila de conceptos (MB, B…), encabezados, prosa u otros datos: cortan la continuación
      if (nombre || soloConceptos || numeros.length) { previa = null; lineasDesdeFila = 99; }
    }
    return filas;
  }

  /**
   * (I1) Lee un informe completo. Devuelve grupos compatibles con la vista previa del importador:
   *   { grupos: [{ nombreDetectado, coincidencia, filas: [{ evaluacion, nota, peso: null }], informe: {…} }],
   *     avisos, periodo, columnasResumen }
   * informe = { promedioInforme, promedioCalculado, coincide, resumen: [números], parciales: n }
   */
  function parsearInforme(texto, escala, asignaturas) {
    const avisos = [];
    const filas = filasInforme(texto, escala);
    const t = normalizar(texto);
    const encabezados = RESUMEN_COLUMNAS.filter(c => new RegExp(`\\b${c}\\b`).test(t));
    const hayEncabezadoResumen = encabezados.length > 0;
    const maxK = Math.min(6, Math.max(hayEncabezadoResumen ? encabezados.length : 5, 1));
    const media = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
    const r1 = x => Math.round(x * 10 + 1e-9) / 10;
    // Votos: ¿con cuántas columnas de resumen el promedio de las parciales, redondeado a 1 decimal,
    // es EXACTAMENTE el PRO? (exacto para no confundirse cuando NS1 = PRO = NF, como en el 1er semestre)
    const votos = {};
    for (const f of filas) {
      const xs = f.numeros.map(n => n.nota);
      for (let k = 1; k <= maxK && k < xs.length; k++) {
        if (Math.abs(r1(media(xs.slice(0, xs.length - k))) - xs[xs.length - k]) < 1e-9) votos[k] = (votos[k] || 0) + 1;
      }
    }
    // Entre los k con casi tantos votos como el mejor, se prefiere el MAYOR: un k menor también "calza"
    // cuando las columnas de resumen repiten el promedio, pero dejaría promedios como notas parciales.
    const maxVotos = Math.max(0, ...Object.values(votos));
    const viables = Object.entries(votos).filter(([, v]) => v >= maxVotos * 0.75).map(([kk]) => Number(kk));
    let k = 0;
    if (viables.length && (hayEncabezadoResumen || maxVotos >= Math.ceil(filas.length * 0.6))) k = Math.max(...viables);
    if (k) avisos.push(`Se detectaron ${k} columna(s) de resumen al final de cada fila (${encabezados.length ? encabezados.map(e => e.toUpperCase()).join(', ') : 'promedios'}): no se importan como notas.`);

    const grupos = filas.map(f => {
      const xs = f.numeros.map(n => n.nota);
      const kFila = xs.length > k ? k : Math.max(0, xs.length - 1);
      const parciales = f.numeros.slice(0, xs.length - kFila);
      const resumen = xs.slice(xs.length - kFila);
      const promedioCalculado = parciales.length ? media(parciales.map(n => n.nota)) : null;
      const promedioInforme = resumen.length ? resumen[0] : null;
      const coincide = promedioInforme === null || promedioCalculado === null ? null : Math.abs(r1(promedioCalculado) - promedioInforme) <= 0.1 + 1e-9;
      const g = {
        nombreDetectado: f.asignatura,
        filas: parciales.map((n, i) => ({
          evaluacion: `Nota ${i + 1}`, nota: n.nota, peso: null,
          avisos: n.escalada ? [`“${n.tok}” se interpretó como ${n.nota.toFixed(1)}.`] : [],
        })),
        informe: { promedioInforme, promedioCalculado, coincide, resumen, parciales: parciales.length },
      };
      g.tema = inferirTema([f.asignatura]);
      // En un informe completo se exige coincidencia por NOMBRE (≥ 0,9): una asociación solo por área
      // ("Probabilidad y Estadística" → "Matemática") mezclaría notas de asignaturas distintas.
      const c = buscarAsignatura(f.asignatura, asignaturas, g.tema?.categoria);
      g.coincidencia = c && c.puntaje >= 0.9 ? c : null;
      g.avisos = [];
      if (!g.coincidencia) g.avisos.push(`“${f.asignatura}” no está en tus asignaturas de este período: se propone crearla.`);
      if (coincide === false) g.avisos.push(`El promedio de las notas detectadas (${r1(promedioCalculado).toFixed(1)}) no coincide con el del informe (${promedioInforme.toFixed(1)}). Puede haber notas en cursiva que no inciden, ponderaciones distintas o una nota mal leída: revísalas.`);
      return g;
    }).filter(g => g.filas.length);

    if (!grupos.length) avisos.push('No se reconocieron filas de asignaturas con notas. Revisa el texto o usa el modo “Detectar automáticamente”.');
    return { grupos, avisos, periodo: detectarPeriodo(texto), columnasResumen: k };
  }

  /** ¿Las evaluaciones parecen controles? (para proponer agruparlas en un bloque) */
  function parecenControles(filas) {
    return filas.length >= 2 && filas.every(f => /^control/i.test(f.evaluacion));
  }

  /**
   * Reconstruye el texto de un PDF a partir de los fragmentos que entrega pdf.js (con posición).
   * paginas: [[{ str, x, y, w, h }]] (y crece hacia arriba, como en PDF).
   * - Agrupa en filas los fragmentos con altura parecida (tolerancia ≈ 40 % del alto de letra).
   * - Ordena cada fila de izquierda a derecha.
   * - Une fragmentos pegados sin espacio ("6," + "8" → "6,8"); separa con un espacio los huecos
   *   chicos y con dos los grandes (cambio de columna), igual que el texto copiado del visor.
   */
  function textoDesdePDF(paginas) {
    return paginas.map(items => {
      const frag = items.filter(i => i.str && i.str.trim()).map(i => ({ ...i, h: i.h || 8 })).sort((a, b) => b.y - a.y || a.x - b.x);
      const filas = [];
      for (const f of frag) {
        const fila = filas.find(r => Math.abs(r.y - f.y) <= Math.max(1.5, Math.min(r.h, f.h) * 0.4));
        if (fila) fila.items.push(f); else filas.push({ y: f.y, h: f.h, items: [f] });
      }
      return filas.sort((a, b) => b.y - a.y).map(r => {
        const orden = r.items.sort((a, b) => a.x - b.x);
        let linea = '', fin = null;
        for (const f of orden) {
          const hueco = fin === null ? 0 : f.x - fin;
          if (fin !== null) linea += hueco > f.h * 2 ? '  ' : hueco > f.h * 0.15 ? ' ' : '';
          linea += f.str.trim();
          fin = Math.max(fin ?? -Infinity, f.x + (f.w || 0));
        }
        return linea;
      }).join('\n');
    }).join('\n\n');
  }

  return { normalizar, categoriasDe, inferirTema, buscarAsignatura, interpretarNota, parsearTexto, parsearInforme, detectarPeriodo, parecenControles, textoDesdePDF, ALIAS_MATERIAS, TEMAS_MATERIAS };
})();

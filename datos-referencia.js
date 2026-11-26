'use strict';
/**
 * datos-referencia.js — Datos estáticos de apoyo (no contiene lógica).
 *
 * IMPORTANTE: todo lo que hay aquí es REFERENCIAL. El estudiante siempre puede
 * editarlo dentro de la app (malla, asignaturas, tabla NEM), porque los planes de
 * estudio y las tablas oficiales cambian año a año.
 */
const REF = (() => {
  const VERSION = '2026-11';

  /* ---------- Niveles por modalidad ---------- */
  const NIVELES_ESCOLARES = [
    ['1B', '1° Básico'], ['2B', '2° Básico'], ['3B', '3° Básico'], ['4B', '4° Básico'],
    ['5B', '5° Básico'], ['6B', '6° Básico'], ['7B', '7° Básico'], ['8B', '8° Básico'],
    ['1M', '1° Medio'], ['2M', '2° Medio'], ['3M', '3° Medio'], ['4M', '4° Medio'],
  ];
  const NIVELES_TP = NIVELES_ESCOLARES.filter(([k]) => k.endsWith('M'));
  const AÑOS_MEDIA = ['1M', '2M', '3M', '4M'];

  /* ---------- Currículum escolar chileno (Bases Curriculares, referencial) ---------- */
  const BASICA_1_4 = ['Lenguaje y Comunicación', 'Matemática', 'Historia, Geografía y Ciencias Sociales', 'Ciencias Naturales',
    'Inglés', 'Artes Visuales', 'Música', 'Educación Física y Salud', 'Tecnología', 'Orientación', 'Religión'];
  const BASICA_7_8 = ['Lengua y Literatura', 'Matemática', 'Historia, Geografía y Ciencias Sociales', 'Ciencias Naturales',
    'Inglés', 'Artes Visuales', 'Música', 'Educación Física y Salud', 'Tecnología', 'Orientación', 'Religión'];
  const MEDIA_1_2 = ['Lengua y Literatura', 'Matemática', 'Historia, Geografía y Ciencias Sociales', 'Biología', 'Física', 'Química',
    'Inglés', 'Educación Física y Salud', 'Tecnología', 'Artes Visuales', 'Música', 'Orientación', 'Religión'];
  const MEDIA_3_4_COMUN = ['Lengua y Literatura', 'Matemática', 'Educación Ciudadana', 'Filosofía', 'Inglés', 'Ciencias para la Ciudadanía'];
  const MEDIA_3_4_ELECTIVO_COMUN = ['Historia, Geografía y Ciencias Sociales', 'Educación Física y Salud', 'Artes', 'Religión'];
  const MEDIA_3_4_DIFERENCIADO = [
    'Lectura y escritura especializadas', 'Participación y argumentación en democracia', 'Taller de literatura',
    'Límites, derivadas e integrales', 'Probabilidades y estadística descriptiva e inferencial', 'Pensamiento computacional y programación',
    'Geometría 3D', 'Biología celular y molecular', 'Biología de los ecosistemas', 'Ciencias de la salud', 'Física', 'Química',
    'Comprensión histórica del presente', 'Economía y sociedad', 'Geografía, territorio y desafíos socioambientales',
    'Filosofía política', 'Seminario de filosofía', 'Estética', 'Interpretación musical',
    'Artes visuales, audiovisuales y multimediales', 'Promoción de estilos de vida activos y saludables',
  ];

  /** Módulos TP referenciales por especialidad (3° y 4° Medio). Editables tras cargarlos. */
  const ESPECIALIDADES_TP = {
    'Administración': ['Utilización de información contable', 'Organización de oficinas', 'Atención de clientes', 'Procesos administrativos', 'Gestión de recursos humanos'],
    'Contabilidad': ['Registros contables', 'Cálculo de remuneraciones', 'Legislación tributaria', 'Contabilidad computacional', 'Procesos contables'],
    'Programación': ['Programación de aplicaciones', 'Diseño y desarrollo de sitios web', 'Bases de datos', 'Mantenimiento de equipos computacionales', 'Seguridad informática'],
    'Electricidad': ['Instalaciones eléctricas domiciliarias', 'Proyectos eléctricos', 'Máquinas eléctricas', 'Automatización industrial', 'Mantenimiento de sistemas eléctricos'],
    'Mecánica Automotriz': ['Motores de combustión interna', 'Suspensión y dirección', 'Sistemas eléctricos del vehículo', 'Frenos y transmisión', 'Diagnóstico automotriz'],
    'Gastronomía': ['Higiene para la elaboración de alimentos', 'Elaboración de alimentos de baja complejidad', 'Cocina chilena', 'Pastelería y repostería', 'Servicio de comedores'],
    'Atención de Enfermería': ['Primeros auxilios', 'Higiene y seguridad del paciente', 'Atención en salud comunitaria', 'Administración de medicamentos', 'Atención de adultos mayores'],
    'Construcción': ['Dibujo técnico', 'Obras de construcción', 'Instalaciones sanitarias', 'Prevención de riesgos', 'Presupuestos de obra'],
  };
  const MODULO_TRANSVERSAL_TP = 'Emprendimiento y empleabilidad';

  /**
   * Devuelve las secciones de asignaturas sugeridas para un perfil escolar.
   * Cada sección: { titulo, items: [nombres], marcar: true|false (preselección) }.
   */
  function seccionesCurriculo(modalidad, nivel, especialidad) {
    const num = parseInt(nivel, 10);
    if (nivel.endsWith('B')) {
      return [{ titulo: 'Asignaturas de ' + nivel.replace('B', '° Básico'), items: num <= 6 ? BASICA_1_4 : BASICA_7_8, marcar: true }];
    }
    if (num <= 2) return [{ titulo: 'Formación general 1° y 2° Medio', items: MEDIA_1_2, marcar: true }];
    if (modalidad === 'tp') {
      const mods = ESPECIALIDADES_TP[especialidad];
      return [
        { titulo: 'Formación general (TP)', items: MEDIA_3_4_COMUN, marcar: true },
        mods
          ? { titulo: `Módulos de la especialidad: ${especialidad}`, items: [...mods, MODULO_TRANSVERSAL_TP], marcar: true }
          : { titulo: 'Módulos de especialidad', items: [], marcar: false, aviso: 'Elige tu especialidad en "Perfil" para ver sus módulos.' },
      ];
    }
    return [
      { titulo: 'Formación general (plan común)', items: MEDIA_3_4_COMUN, marcar: true },
      { titulo: 'Plan común electivo (elige uno)', items: MEDIA_3_4_ELECTIVO_COMUN, marcar: false },
      { titulo: 'Plan diferenciado (electivos / menciones)', items: MEDIA_3_4_DIFERENCIADO, marcar: false },
    ];
  }

  /* ---------- Universidades chilenas (autocompletado) ---------- */
  const UNIVERSIDADES = [
    'Pontificia Universidad Católica de Chile (PUC)', 'Universidad de Chile (UChile)',
    'Universidad Técnica Federico Santa María (UTFSM)', 'Universidad de Santiago de Chile (USACH)',
    'Universidad Adolfo Ibáñez (UAI)', 'Universidad Diego Portales (UDP)', 'Universidad Andrés Bello (UNAB)',
    'Universidad de Concepción (UdeC)', 'Pontificia Universidad Católica de Valparaíso (PUCV)',
    'Universidad Austral de Chile (UACh)', 'Universidad de Valparaíso (UV)', 'Universidad de los Andes (UANDES)',
    'Universidad del Desarrollo (UDD)', 'Universidad Tecnológica Metropolitana (UTEM)', 'Universidad de La Frontera (UFRO)',
    'Universidad de Talca (UTALCA)', 'Universidad Católica del Norte (UCN)', 'Universidad de Antofagasta (UA)',
    'Universidad de La Serena (ULS)', 'Universidad del Bío-Bío (UBB)', 'Universidad Alberto Hurtado (UAH)',
    'Universidad Mayor (UMayor)', 'Universidad Finis Terrae (UFT)', 'Universidad San Sebastián (USS)',
    'Universidad Autónoma de Chile', 'Universidad Central de Chile (UCEN)', 'Universidad Católica de la Santísima Concepción (UCSC)',
    'Universidad Católica de Temuco (UCT)', 'Universidad de Magallanes (UMAG)', 'Universidad Arturo Prat (UNAP)',
  ];

  /**
   * Mallas REFERENCIALES GENÉRICAS por carrera (no oficiales de ninguna universidad).
   * Cada semestre es un string con ramos separados por "|". Sirven como punto de partida
   * para que el estudiante las edite con la malla real de su plan de estudios.
   */
  const MALLAS = {
    'Ingeniería Civil Industrial': [
      'Cálculo I|Álgebra Lineal|Introducción a la Ingeniería|Química General|Comunicación Efectiva',
      'Cálculo II|Física I|Programación|Economía|Inglés I',
      'Cálculo III|Física II|Ecuaciones Diferenciales|Probabilidades|Inglés II',
      'Estadística|Física III|Termodinámica|Contabilidad y Finanzas|Microeconomía',
      'Investigación de Operaciones I|Mecánica de Fluidos|Macroeconomía|Ingeniería de Materiales|Electivo de Formación General',
      'Investigación de Operaciones II|Finanzas Corporativas|Gestión de Personas|Electrotecnia|Econometría',
      'Gestión de Operaciones|Evaluación de Proyectos|Marketing|Sistemas de Información|Electivo Profesional I',
      'Logística y Cadena de Suministro|Estrategia|Organización Industrial|Simulación|Electivo Profesional II',
      'Gestión de la Calidad|Dirección de Proyectos|Electivo Profesional III|Taller de Emprendimiento|Práctica Profesional',
      'Taller de Título|Electivo Profesional IV|Ética Profesional|Electivo Profesional V',
      'Memoria / Proyecto de Título',
    ],
    'Ingeniería Civil en Informática / Computación': [
      'Cálculo I|Álgebra Lineal|Introducción a la Programación|Introducción a la Ingeniería|Comunicación Efectiva',
      'Cálculo II|Física I|Programación Orientada a Objetos|Matemáticas Discretas|Inglés I',
      'Cálculo III|Física II|Estructuras de Datos|Probabilidades|Inglés II',
      'Algoritmos|Bases de Datos|Arquitectura de Computadores|Estadística|Ecuaciones Diferenciales',
      'Sistemas Operativos|Ingeniería de Software|Teoría de la Computación|Economía|Electivo de Formación General',
      'Redes de Computadores|Desarrollo Web y Móvil|Inteligencia Artificial|Evaluación de Proyectos|Gestión Organizacional',
      'Computación Distribuida|Seguridad Informática|Aprendizaje de Máquinas|Proyecto de Software|Electivo Profesional I',
      'Interacción Humano-Computador|Arquitectura de Software|Electivo Profesional II|Electivo Profesional III',
      'Práctica Profesional|Electivo Profesional IV|Taller de Título',
      'Electivo Profesional V|Ética Profesional|Seminario de Título',
      'Memoria / Proyecto de Título',
    ],
    'Ingeniería Comercial': [
      'Cálculo I|Introducción a la Economía|Fundamentos de Administración|Contabilidad I|Comunicación Efectiva',
      'Cálculo II|Álgebra|Microeconomía I|Contabilidad II|Inglés I',
      'Estadística I|Microeconomía II|Comportamiento Organizacional|Matemáticas Financieras|Inglés II',
      'Estadística II|Macroeconomía I|Marketing I|Costos|Derecho Empresarial',
      'Econometría|Macroeconomía II|Finanzas I|Marketing II|Gestión de Personas',
      'Finanzas II|Gestión de Operaciones|Evaluación de Proyectos|Economía Internacional|Electivo I',
      'Estrategia|Control de Gestión|Tributación|Electivo II|Electivo III',
      'Emprendimiento|Ética Empresarial|Electivo IV|Práctica Profesional',
      'Seminario de Título|Electivo V|Electivo VI',
      'Seminario de Grado / Examen de Título',
    ],
    'Derecho': [
      'Introducción al Derecho|Historia del Derecho|Derecho Romano|Economía|Expresión Oral y Escrita',
      'Teoría del Estado|Derecho Civil I (Parte General)|Derecho Romano II|Filosofía|Inglés',
      'Derecho Constitucional I|Derecho Civil II (Bienes)|Derecho Penal I|Derecho Económico|Teoría del Derecho',
      'Derecho Constitucional II|Derecho Civil III (Obligaciones)|Derecho Penal II|Derecho Internacional Público|Clínica I',
      'Derecho Civil IV (Contratos)|Derecho Procesal I|Derecho Penal III|Derecho Administrativo I|Derecho del Trabajo I',
      'Derecho Civil V (Familia)|Derecho Procesal II|Derecho Comercial I|Derecho Administrativo II|Derecho del Trabajo II',
      'Derecho Civil VI (Sucesorio)|Derecho Procesal III|Derecho Comercial II|Derecho Tributario|Electivo I',
      'Derecho Procesal IV|Derecho Comercial III|Derecho Internacional Privado|Clínica Jurídica|Electivo II',
      'Litigación|Ética Profesional|Electivo III|Electivo IV',
      'Seminario de Licenciatura|Preparación Examen de Grado',
    ],
    'Medicina': [
      'Biología Celular|Química General y Orgánica|Física para Ciencias de la Salud|Introducción a la Medicina|Salud Pública I',
      'Anatomía I|Bioquímica|Histología|Embriología|Psicología Médica',
      'Anatomía II|Fisiología I|Genética|Bioestadística|Salud Pública II',
      'Fisiología II|Microbiología|Inmunología|Neuroanatomía|Epidemiología',
      'Fisiopatología I|Farmacología I|Parasitología|Semiología I|Ética Médica',
      'Fisiopatología II|Farmacología II|Anatomía Patológica|Semiología II|Medicina Familiar',
      'Medicina Interna I|Imagenología|Psiquiatría|Laboratorio Clínico',
      'Medicina Interna II|Dermatología|Neurología|Oftalmología y Otorrinolaringología',
      'Cirugía I|Pediatría I|Obstetricia y Ginecología I|Traumatología',
      'Cirugía II|Pediatría II|Obstetricia y Ginecología II|Medicina Legal',
      'Internado: Medicina Interna|Internado: Cirugía',
      'Internado: Pediatría|Internado: Obstetricia y Ginecología',
      'Internado: Psiquiatría|Internado: Atención Primaria',
      'Internado Electivo|Examen de Título / EUNACOM',
    ],
    'Psicología': [
      'Introducción a la Psicología|Biología Humana|Filosofía|Antropología|Expresión Oral y Escrita',
      'Psicología del Desarrollo I|Neurociencias|Historia de la Psicología|Sociología|Inglés I',
      'Psicología del Desarrollo II|Procesos Psicológicos Básicos|Estadística I|Psicología Social I|Inglés II',
      'Psicología de la Personalidad|Psicopatología I|Estadística II|Psicología Social II|Metodología Cuantitativa',
      'Psicopatología II|Evaluación Psicológica I|Psicología Educacional|Metodología Cualitativa|Teorías Psicoterapéuticas',
      'Evaluación Psicológica II|Psicología Clínica|Psicología Organizacional|Psicología Comunitaria|Ética Profesional',
      'Taller de Intervención Clínica|Taller de Intervención Educacional|Electivo I|Electivo II',
      'Taller de Intervención Organizacional|Taller de Intervención Comunitaria|Seminario de Investigación|Electivo III',
      'Práctica Profesional I|Seminario de Título I',
      'Práctica Profesional II|Seminario de Título II',
    ],
    'Enfermería': [
      'Anatomía|Química General|Biología Celular|Introducción a la Enfermería|Psicología General',
      'Fisiología|Bioquímica|Microbiología|Fundamentos de Enfermería|Salud Pública',
      'Fisiopatología|Farmacología I|Enfermería Médico-Quirúrgica I|Bioestadística|Antropología de la Salud',
      'Farmacología II|Enfermería Médico-Quirúrgica II|Epidemiología|Educación para la Salud|Ética en Salud',
      'Enfermería del Adulto Mayor|Enfermería en Salud Mental|Gestión en Salud I|Investigación en Enfermería I',
      'Enfermería Materno-Infantil|Enfermería Pediátrica|Gestión en Salud II|Investigación en Enfermería II',
      'Enfermería en Atención Primaria|Enfermería en Urgencias|Electivo I|Seminario de Investigación',
      'Enfermería del Paciente Crítico|Gestión del Cuidado|Electivo II|Tesis',
      'Internado Clínico Hospitalario',
      'Internado en Atención Primaria',
    ],
    'Arquitectura': [
      'Taller de Arquitectura I|Representación Arquitectónica I|Geometría|Historia de la Arquitectura I|Matemática',
      'Taller de Arquitectura II|Representación Arquitectónica II|Física para Arquitectura|Historia de la Arquitectura II|Teoría de la Arquitectura',
      'Taller de Arquitectura III|Construcción I|Estructuras I|Historia de la Arquitectura III|Dibujo Digital',
      'Taller de Arquitectura IV|Construcción II|Estructuras II|Urbanismo I|Teoría del Paisaje',
      'Taller de Arquitectura V|Construcción III|Estructuras III|Urbanismo II|Acondicionamiento Ambiental',
      'Taller de Arquitectura VI|Instalaciones|Gestión de Proyectos|Patrimonio|Electivo I',
      'Taller de Arquitectura VII|Planificación Urbana|Legislación de la Construcción|Electivo II',
      'Taller de Arquitectura VIII|Arquitectura Sustentable|Seminario de Investigación|Electivo III',
      'Práctica Profesional|Taller de Pre-Título',
      'Proyecto de Título',
    ],
    'Pedagogía en Educación Básica': [
      'Fundamentos de la Educación|Desarrollo y Aprendizaje I|Comunicación Oral y Escrita|Matemática para la Enseñanza I|Práctica Inicial I',
      'Currículum Escolar|Desarrollo y Aprendizaje II|Lenguaje y su Didáctica I|Matemática para la Enseñanza II|Práctica Inicial II',
      'Evaluación para el Aprendizaje|Lenguaje y su Didáctica II|Didáctica de la Matemática I|Ciencias Naturales y su Didáctica I|Práctica Intermedia I',
      'Diversidad e Inclusión|Didáctica de la Matemática II|Historia y Ciencias Sociales y su Didáctica I|Ciencias Naturales y su Didáctica II|Práctica Intermedia II',
      'Gestión del Aula|Historia y Ciencias Sociales y su Didáctica II|Artes y su Didáctica|Inglés I|Práctica Intermedia III',
      'Orientación y Convivencia Escolar|Educación Física y su Didáctica|Tecnología y su Didáctica|Inglés II|Práctica Intermedia IV',
      'Investigación Educativa I|Mención I|Mención II|Política Educacional|Práctica Avanzada I',
      'Investigación Educativa II|Mención III|Mención IV|Ética Profesional Docente|Práctica Avanzada II',
      'Práctica Profesional|Seminario de Título',
    ],
  };

  /** Convierte la plantilla compacta en la estructura editable de malla del perfil. */
  function construirMalla(carrera, universidad) {
    const semestres = (MALLAS[carrera] || []).map((linea, i) => ({
      nombre: `Semestre ${i + 1}`,
      ramos: linea.split('|').map(nombre => ({ nombre })),
    }));
    return {
      universidad, carrera, semestres,
      fuente: 'Plantilla referencial genérica de Ruta Académica (no oficial)',
      version: VERSION,
      actualizada: new Date().toISOString().slice(0, 10),
    };
  }

  /* ---------- Tabla NEM OFICIAL ---------- */
  /**
   * Tablas de conversión NEM oficiales para los Procesos de Admisión 2026 y 2027.
   * Fuente: Resolución Exenta N° 11.005 de la Subsecretaría de Educación Superior (MINEDUC),
   * 13-10-2025, publicada en el Diario Oficial N° 44.283 del 24-10-2025 (CVE 2713343).
   * Rango 4,00–7,00 con paso 0,01. Cada fila: "nota grupoA grupoB grupoC".
   * Transcripción verificada celda por celda contra el PDF publicado (301 filas).
   * Bajo 4,00 la tabla no define puntaje (se usa el mínimo, 100).
   */
  const NEM_FUENTE = 'Resolución Exenta N° 11.005 (MINEDUC, 13-10-2025), Diario Oficial 24-10-2025 · Admisión 2026 y 2027';
  const NEM_OFICIAL_TXT = `
    4.00 100 100 100 | 4.01 103 103 103 | 4.02 105 105 105 | 4.03 109 109 109 | 4.04 112 112 112 | 4.05 115 115 115
    4.06 118 118 118 | 4.07 122 122 122 | 4.08 124 124 124 | 4.09 128 128 128 | 4.10 131 131 131 | 4.11 135 135 135
    4.12 137 137 137 | 4.13 140 141 141 | 4.14 144 144 144 | 4.15 146 148 148 | 4.16 150 150 150 | 4.17 153 154 154
    4.18 157 157 157 | 4.19 159 160 160 | 4.20 163 163 163 | 4.21 166 167 166 | 4.22 169 169 169 | 4.23 172 173 172
    4.24 176 176 176 | 4.25 178 180 178 | 4.26 181 182 182 | 4.27 185 186 185 | 4.28 187 189 189 | 4.29 191 193 191
    4.30 194 195 195 | 4.31 198 199 198 | 4.32 200 202 202 | 4.33 204 205 204 | 4.34 207 208 208 | 4.35 211 212 211
    4.36 213 214 214 | 4.37 216 218 217 | 4.38 220 221 221 | 4.39 222 225 223 | 4.40 226 227 226 | 4.41 229 231 230
    4.42 232 234 232 | 4.43 235 236 236 | 4.44 239 240 239 | 4.45 241 243 243 | 4.46 245 247 245 | 4.47 248 249 249
    4.48 252 253 252 | 4.49 254 256 256 | 4.50 257 259 258 | 4.51 261 262 262 | 4.52 263 266 265 | 4.53 267 268 268
    4.54 270 272 271 | 4.55 274 275 275 | 4.56 276 279 277 | 4.57 280 281 281 | 4.58 283 285 284 | 4.59 286 288 286
    4.60 289 292 290 | 4.61 292 294 293 | 4.62 295 298 297 | 4.63 298 301 299 | 4.64 302 304 303 | 4.65 304 307 306
    4.66 308 311 310 | 4.67 311 313 312 | 4.68 315 317 316 | 4.69 317 320 319 | 4.70 321 324 322 | 4.71 324 326 325
    4.72 328 330 329 | 4.73 330 333 331 | 4.74 333 337 335 | 4.75 337 339 338 | 4.76 339 343 342 | 4.77 343 346 344
    4.78 346 349 347 | 4.79 349 352 351 | 4.80 352 356 353 | 4.81 356 358 357 | 4.82 358 362 360 | 4.83 362 365 364
    4.84 365 369 366 | 4.85 367 371 370 | 4.86 371 374 373 | 4.87 374 378 376 | 4.88 378 380 379 | 4.89 380 384 383
    4.90 384 387 385 | 4.91 387 391 389 | 4.92 391 393 392 | 4.93 393 397 396 | 4.94 397 400 398 | 4.95 400 403 402
    4.96 403 406 405 | 4.97 406 410 409 | 4.98 409 412 411 | 4.99 412 416 414 | 5.00 415 419 418 | 5.01 419 423 420
    5.02 421 425 424 | 5.03 425 429 427 | 5.04 428 432 430 | 5.05 432 436 433 | 5.06 434 438 437 | 5.07 438 442 439
    5.08 441 445 443 | 5.09 443 448 446 | 5.10 447 451 450 | 5.11 450 455 452 | 5.12 454 457 456 | 5.13 456 461 459
    5.14 460 464 463 | 5.15 463 468 465 | 5.16 466 470 469 | 5.17 469 474 472 | 5.18 473 477 474 | 5.19 475 481 478
    5.20 479 483 481 | 5.21 482 487 484 | 5.22 484 490 487 | 5.23 488 493 491 | 5.24 491 496 493 | 5.25 495 500 497
    5.26 497 502 500 | 5.27 501 505 504 | 5.28 504 509 506 | 5.29 508 511 510 | 5.30 510 515 513 | 5.31 514 518 517
    5.32 517 522 519 | 5.33 519 524 523 | 5.34 523 528 526 | 5.35 526 531 529 | 5.36 529 535 532 | 5.37 532 537 535
    5.38 536 541 538 | 5.39 538 544 541 | 5.40 542 547 545 | 5.41 545 550 547 | 5.42 549 554 551 | 5.43 551 556 554
    5.44 555 560 558 | 5.45 558 563 560 | 5.46 560 567 564 | 5.47 564 569 567 | 5.48 567 572 571 | 5.49 569 574 572
    5.50 572 577 574 | 5.51 574 580 577 | 5.52 577 582 580 | 5.53 580 585 582 | 5.54 583 587 585 | 5.55 586 590 587
    5.56 589 592 590 | 5.57 591 595 592 | 5.58 594 598 595 | 5.59 596 600 598 | 5.60 599 604 601 | 5.61 603 607 604
    5.62 605 609 607 | 5.63 608 612 609 | 5.64 610 614 613 | 5.65 613 618 616 | 5.66 617 621 618 | 5.67 619 623 621
    5.68 622 626 623 | 5.69 625 628 627 | 5.70 628 632 630 | 5.71 631 635 632 | 5.72 634 637 635 | 5.73 636 640 637
    5.74 639 643 641 | 5.75 643 646 644 | 5.76 645 649 646 | 5.77 648 652 649 | 5.78 650 654 652 | 5.79 654 657 655
    5.80 657 661 658 | 5.81 659 663 661 | 5.82 662 666 663 | 5.83 664 668 667 | 5.84 668 671 670 | 5.85 671 675 672
    5.86 673 677 675 | 5.87 676 680 677 | 5.88 680 682 681 | 5.89 682 685 684 | 5.90 685 689 686 | 5.91 688 691 689
    5.92 690 694 691 | 5.93 694 697 695 | 5.94 697 699 698 | 5.95 699 703 700 | 5.96 702 706 703 | 5.97 706 708 707
    5.98 708 711 709 | 5.99 711 713 712 | 6.00 713 717 715 | 6.01 716 720 717 | 6.02 720 722 721 | 6.03 722 725 724
    6.04 725 727 726 | 6.05 727 731 729 | 6.06 731 734 731 | 6.07 734 736 735 | 6.08 736 739 738 | 6.09 739 742 740
    6.10 742 745 743 | 6.11 745 748 747 | 6.12 748 751 749 | 6.13 751 753 752 | 6.14 753 756 754 | 6.15 757 760 757
    6.16 760 762 761 | 6.17 762 765 763 | 6.18 765 767 766 | 6.19 767 770 769 | 6.20 771 774 771 | 6.21 774 776 775
    6.22 776 779 778 | 6.23 779 781 780 | 6.24 783 784 783 | 6.25 785 788 787 | 6.26 788 790 789 | 6.27 790 793 792
    6.28 793 796 794 | 6.29 797 798 797 | 6.30 799 802 801 | 6.31 802 805 803 | 6.32 805 807 806 | 6.33 808 810 808
    6.34 811 812 811 | 6.35 814 816 815 | 6.36 816 819 817 | 6.37 819 821 820 | 6.38 823 824 823 | 6.39 825 826 825
    6.40 828 830 829 | 6.41 830 833 832 | 6.42 834 835 834 | 6.43 837 838 837 | 6.44 839 841 841 | 6.45 842 844 843
    6.46 844 847 846 | 6.47 848 850 848 | 6.48 851 852 851 | 6.49 853 855 855 | 6.50 856 859 857 | 6.51 860 861 860
    6.52 862 864 862 | 6.53 865 866 865 | 6.54 868 869 869 | 6.55 870 873 871 | 6.56 874 875 874 | 6.57 877 878 877
    6.58 879 880 880 | 6.59 882 883 883 | 6.60 886 887 886 | 6.61 888 889 888 | 6.62 891 892 891 | 6.63 893 895 895
    6.64 896 897 897 | 6.65 900 901 900 | 6.66 902 904 902 | 6.67 905 906 905 | 6.68 907 909 909 | 6.69 911 911 911
    6.70 914 915 914 | 6.71 916 918 916 | 6.72 919 920 920 | 6.73 922 923 923 | 6.74 925 925 925 | 6.75 928 929 928
    6.76 931 932 931 | 6.77 933 934 934 | 6.78 937 937 937 | 6.79 940 940 940 | 6.80 942 943 942 | 6.81 945 946 945
    6.82 947 949 949 | 6.83 951 951 951 | 6.84 954 954 954 | 6.85 956 958 956 | 6.86 959 960 960 | 6.87 963 963 963
    6.88 965 965 965 | 6.89 968 968 968 | 6.90 970 972 970 | 6.91 973 974 974 | 6.92 977 977 977 | 6.93 979 979 979
    6.94 982 982 982 | 6.95 985 986 985 | 6.96 988 988 988 | 6.97 991 991 991 | 6.98 994 994 994 | 6.99 996 996 996
    7.00 1000 1000 1000
  `;
  const NEM_OFICIAL = { A: [], B: [], C: [] };
  for (const fila of NEM_OFICIAL_TXT.split(/[|\n]/)) {
    if (!fila.trim()) continue;
    const [n, a, b, c] = fila.trim().split(/\s+/).map(Number);
    if (![n, a, b, c].every(Number.isFinite)) continue;
    NEM_OFICIAL.A.push([n, a]); NEM_OFICIAL.B.push([n, b]); NEM_OFICIAL.C.push([n, c]);
  }
  const GRUPOS_NEM = {
    A: 'Grupo A · Humanista-Científico diurno',
    B: 'Grupo B · Humanista-Científico vespertino / nocturno',
    C: 'Grupo C · Técnico-Profesional',
  };
  const URL_NEM = {
    A: 'https://demre.cl/paes/factores-seleccion/tabla-transformacion-nem-grupo-a',
    B: 'https://demre.cl/paes/factores-seleccion/tabla-transformacion-nem-grupo-b',
    C: 'https://demre.cl/paes/factores-seleccion/tabla-transformacion-nem-grupo-c',
  };

  /* ---------- Admisión: componentes, requisitos y catálogo de carreras ---------- */

  const COMPONENTES_ADMISION = [
    ['nem', 'NEM'], ['ranking', 'Ranking'], ['cl', 'Competencia Lectora'], ['m1', 'Matemática M1'],
    ['m2', 'Matemática M2'], ['ciencias', 'Ciencias'], ['historia', 'Historia y Cs. Sociales'],
    ['electiva', 'Ciencias o Historia (la mejor)'],
  ];

  /**
   * Requisito general de postulación (referencial): promedio CL + M1 mínimo.
   * Verifícalo cada año en demre.cl; las universidades pueden exigir mínimos adicionales.
   */
  const REQUISITOS_GENERALES = {
    promedioClM1Min: 458,
    fuente: 'Requisito general referencial (DEMRE, procesos recientes). Verifícalo en demre.cl para tu año de admisión.',
  };

  /**
   * Catálogo REFERENCIAL de carreras.
   * Las ponderaciones son PLANTILLAS ILUSTRATIVAS por tipo de carrera (no las oficiales de cada
   * universidad) y los puntajes de corte vienen VACÍOS a propósito: cárgalos desde la oferta
   * oficial (acceso.mineduc.cl / demre.cl / sitio de admisión de cada universidad).
   */
  const PLANTILLAS_PONDERACION = {
    ingenieria: { nem: 10, ranking: 20, cl: 10, m1: 30, m2: 15, ciencias: 15 },
    medicina:   { nem: 20, ranking: 20, cl: 15, m1: 20, ciencias: 25 },
    salud:      { nem: 20, ranking: 25, cl: 15, m1: 20, ciencias: 20 },
    derecho:    { nem: 20, ranking: 25, cl: 30, m1: 10, historia: 15 },
    negocios:   { nem: 15, ranking: 20, cl: 15, m1: 30, m2: 10, electiva: 10 },
    psicologia: { nem: 20, ranking: 25, cl: 25, m1: 15, electiva: 15 },
    educacion:  { nem: 25, ranking: 25, cl: 20, m1: 15, electiva: 15 },
    arquitectura: { nem: 20, ranking: 20, cl: 15, m1: 30, electiva: 15 },
    // v6: más plantillas ilustrativas (suman 100; NO son las ponderaciones oficiales de ninguna carrera)
    informatica: { nem: 15, ranking: 20, cl: 10, m1: 30, m2: 15, electiva: 10 },
    ciencias:    { nem: 15, ranking: 20, cl: 10, m1: 25, m2: 10, ciencias: 20 },
    sociales:    { nem: 20, ranking: 25, cl: 25, m1: 10, historia: 20 },
    comunicaciones: { nem: 20, ranking: 25, cl: 30, m1: 10, electiva: 15 },
    artes:       { nem: 25, ranking: 25, cl: 25, m1: 10, electiva: 15 },
    agro:        { nem: 20, ranking: 20, cl: 10, m1: 25, ciencias: 25 },
  };

  /**
   * Carreras frecuentes en Chile y su plantilla ilustrativa de ponderación.
   * Se usan para: el catálogo de cortes, las listas de "Carrera" y "Carrera preferida" del Perfil.
   */
  const CARRERAS_TIPO = {
    ingenieria: ['Ingeniería y Ciencias (Plan Común)', 'Ingeniería', 'Ingeniería Civil', 'Ingeniería Civil Industrial', 'Ingeniería Civil Eléctrica',
      'Ingeniería Civil Electrónica', 'Ingeniería Civil Mecánica', 'Ingeniería Civil Química', 'Ingeniería Civil en Minas', 'Ingeniería Civil en Obras Civiles',
      'Ingeniería Civil Biomédica', 'Ingeniería Civil Ambiental', 'Ingeniería Civil Matemática', 'Ingeniería en Biotecnología', 'Construcción Civil'],
    informatica: ['Ingeniería Civil en Informática', 'Ingeniería Civil en Computación', 'Ingeniería en Informática', 'Ingeniería Civil Telemática',
      'Ingeniería Civil en Ciencia de Datos', 'Ingeniería en Ciberseguridad'],
    medicina: ['Medicina', 'Odontología'],
    salud: ['Enfermería', 'Kinesiología', 'Nutrición y Dietética', 'Fonoaudiología', 'Obstetricia y Puericultura', 'Tecnología Médica',
      'Terapia Ocupacional', 'Química y Farmacia'],
    derecho: ['Derecho'],
    negocios: ['Ingeniería Comercial', 'Contador Auditor', 'Ingeniería en Control de Gestión', 'Economía'],
    psicologia: ['Psicología'],
    sociales: ['Sociología', 'Trabajo Social', 'Ciencia Política', 'Antropología', 'Historia', 'Geografía', 'Administración Pública', 'Filosofía'],
    comunicaciones: ['Periodismo', 'Publicidad', 'Licenciatura en Letras'],
    educacion: ['Pedagogía en Educación Básica', 'Educación Parvularia', 'Educación Diferencial', 'Pedagogía en Matemática',
      'Pedagogía en Lenguaje y Comunicación', 'Pedagogía en Historia y Ciencias Sociales', 'Pedagogía en Inglés', 'Pedagogía en Educación Física',
      'Pedagogía en Biología y Ciencias'],
    arquitectura: ['Arquitectura'],
    artes: ['Diseño', 'Artes Visuales', 'Música', 'Teatro', 'Cine'],
    ciencias: ['Bachillerato', 'Licenciatura en Ciencias', 'Biología', 'Biología Marina', 'Bioquímica', 'Química', 'Física', 'Astronomía',
      'Matemáticas', 'Estadística', 'Geología', 'Bioinformática'],
    agro: ['Agronomía', 'Medicina Veterinaria', 'Ingeniería Forestal'],
  };
  const TIPO_DE_CARRERA = Object.fromEntries(Object.entries(CARRERAS_TIPO).flatMap(([t, cs]) => cs.map(c => [c, t])));
  /** Lista completa de carreras (orden alfabético) para los selectores del Perfil. */
  const CARRERAS = Object.keys(TIPO_DE_CARRERA).sort((a, b) => a.localeCompare(b, 'es'));

  /**
   * Oferta REFERENCIAL de carreras por universidad (selección de carreras conocidas de cada una;
   * no es la oferta completa ni oficial: verifica nombres y vacantes en el sitio de cada universidad).
   */
  const OFERTA_UNIVERSIDADES = {
    'Universidad de Chile (UChile)': 'Odontología|Kinesiología|Química y Farmacia|Nutrición y Dietética|Obstetricia y Puericultura|Tecnología Médica|Fonoaudiología|Terapia Ocupacional|Psicología|Sociología|Antropología|Trabajo Social|Ciencia Política|Administración Pública|Periodismo|Diseño|Geografía|Historia|Filosofía|Bachillerato|Química|Contador Auditor|Ingeniería en Control de Gestión|Medicina Veterinaria|Agronomía|Ingeniería Forestal',
    'Pontificia Universidad Católica de Chile (PUC)': 'Odontología|Enfermería|Kinesiología|Nutrición y Dietética|Fonoaudiología|Química y Farmacia|Sociología|Trabajo Social|Ciencia Política|Periodismo|Publicidad|Diseño|Arquitectura|Artes Visuales|Música|Teatro|Historia|Geografía|Filosofía|Ingeniería Comercial|Agronomía|Medicina Veterinaria|Pedagogía en Educación Básica|Educación Parvularia|Bachillerato|Biología|Bioquímica|Química|Física|Astronomía|Matemáticas|Estadística|Construcción Civil',
    'Universidad de Concepción (UdeC)': 'Odontología|Enfermería|Kinesiología|Obstetricia y Puericultura|Química y Farmacia|Nutrición y Dietética|Fonoaudiología|Tecnología Médica|Psicología|Trabajo Social|Sociología|Periodismo|Arquitectura|Derecho|Ingeniería Comercial|Contador Auditor|Ingeniería Civil Industrial|Ingeniería Civil Eléctrica|Ingeniería Civil Mecánica|Ingeniería Civil Química|Ingeniería Civil en Informática|Ingeniería Civil Biomédica|Geología|Biología Marina|Bioquímica|Agronomía|Medicina Veterinaria|Ingeniería Forestal|Pedagogía en Educación Básica|Pedagogía en Inglés',
    'Universidad de Santiago de Chile (USACH)': 'Medicina|Enfermería|Kinesiología|Obstetricia y Puericultura|Química y Farmacia|Psicología|Ingeniería Comercial|Contador Auditor|Periodismo|Arquitectura|Ingeniería Civil Industrial|Ingeniería Civil Eléctrica|Ingeniería Civil Mecánica|Ingeniería Civil en Minas|Ingeniería Civil Química|Ingeniería Civil en Obras Civiles|Ingeniería en Biotecnología|Administración Pública|Estadística|Pedagogía en Matemática|Pedagogía en Historia y Ciencias Sociales|Pedagogía en Inglés|Pedagogía en Educación Física',
    'Universidad Técnica Federico Santa María (UTFSM)': 'Ingeniería Civil|Ingeniería Civil Eléctrica|Ingeniería Civil Electrónica|Ingeniería Civil Mecánica|Ingeniería Civil Química|Ingeniería Civil en Minas|Ingeniería Civil Telemática|Ingeniería Civil Matemática|Ingeniería Civil Ambiental|Ingeniería Civil en Informática|Ingeniería Comercial|Arquitectura|Construcción Civil',
    'Pontificia Universidad Católica de Valparaíso (PUCV)': 'Derecho|Psicología|Periodismo|Trabajo Social|Arquitectura|Diseño|Música|Educación Parvularia|Pedagogía en Matemática|Pedagogía en Historia y Ciencias Sociales|Pedagogía en Inglés|Pedagogía en Educación Física|Ingeniería Civil Industrial|Ingeniería Civil en Informática|Ingeniería Civil Eléctrica|Ingeniería Civil Mecánica|Ingeniería Civil Química|Agronomía|Contador Auditor|Kinesiología|Nutrición y Dietética|Fonoaudiología',
    'Universidad de Valparaíso (UV)': 'Medicina|Odontología|Enfermería|Kinesiología|Obstetricia y Puericultura|Química y Farmacia|Nutrición y Dietética|Fonoaudiología|Tecnología Médica|Psicología|Derecho|Sociología|Arquitectura|Diseño|Cine|Teatro|Ingeniería Comercial|Contador Auditor|Administración Pública|Biología Marina|Ingeniería Civil Biomédica|Ingeniería Civil Industrial|Ingeniería Civil en Informática',
    'Universidad Diego Portales (UDP)': 'Periodismo|Publicidad|Diseño|Arquitectura|Ingeniería Civil Industrial|Ingeniería Civil en Informática|Medicina|Odontología|Enfermería|Kinesiología|Obstetricia y Puericultura|Tecnología Médica|Nutrición y Dietética|Sociología|Ciencia Política|Historia|Pedagogía en Educación Básica|Educación Parvularia',
    'Universidad Adolfo Ibáñez (UAI)': 'Ingeniería Civil Industrial|Ingeniería Civil en Informática|Ingeniería Civil en Ciencia de Datos|Derecho|Psicología|Periodismo|Diseño|Ciencia Política',
    'Universidad de los Andes (UANDES)': 'Medicina|Odontología|Enfermería|Kinesiología|Nutrición y Dietética|Fonoaudiología|Terapia Ocupacional|Psicología|Derecho|Ingeniería Comercial|Ingeniería Civil Industrial|Ingeniería Civil en Computación|Periodismo|Publicidad|Arquitectura|Diseño|Pedagogía en Educación Básica|Educación Parvularia|Historia|Filosofía',
    'Universidad del Desarrollo (UDD)': 'Medicina|Odontología|Enfermería|Kinesiología|Nutrición y Dietética|Fonoaudiología|Tecnología Médica|Terapia Ocupacional|Psicología|Derecho|Ingeniería Comercial|Ingeniería Civil Industrial|Periodismo|Publicidad|Diseño|Arquitectura|Ciencia Política|Pedagogía en Educación Básica|Educación Parvularia',
    'Universidad Andrés Bello (UNAB)': 'Medicina|Odontología|Enfermería|Nutrición y Dietética|Fonoaudiología|Tecnología Médica|Terapia Ocupacional|Obstetricia y Puericultura|Química y Farmacia|Psicología|Derecho|Ingeniería Comercial|Contador Auditor|Ingeniería Civil Industrial|Ingeniería en Informática|Periodismo|Publicidad|Arquitectura|Diseño|Medicina Veterinaria|Biología Marina|Bioquímica|Trabajo Social|Pedagogía en Educación Básica|Educación Parvularia',
    'Universidad Austral de Chile (UACh)': 'Medicina|Enfermería|Kinesiología|Obstetricia y Puericultura|Odontología|Química y Farmacia|Tecnología Médica|Psicología|Derecho|Periodismo|Arquitectura|Agronomía|Medicina Veterinaria|Ingeniería Forestal|Biología Marina|Bioquímica|Geología|Ingeniería Civil Industrial|Ingeniería Civil en Informática|Ingeniería Comercial|Antropología',
    'Universidad de La Frontera (UFRO)': 'Medicina|Odontología|Enfermería|Kinesiología|Nutrición y Dietética|Obstetricia y Puericultura|Fonoaudiología|Tecnología Médica|Terapia Ocupacional|Psicología|Derecho|Trabajo Social|Periodismo|Sociología|Ingeniería Comercial|Contador Auditor|Ingeniería Civil Industrial|Ingeniería Civil en Informática|Ingeniería Civil Eléctrica|Agronomía|Ingeniería Forestal',
    'Universidad de Talca (UTALCA)': 'Medicina|Odontología|Enfermería|Kinesiología|Nutrición y Dietética|Fonoaudiología|Obstetricia y Puericultura|Tecnología Médica|Psicología|Derecho|Ingeniería Comercial|Arquitectura|Diseño|Agronomía|Ingeniería Civil Industrial|Ingeniería Civil en Computación|Ingeniería Civil Mecánica|Ingeniería Civil en Obras Civiles|Bioinformática',
    'Universidad Católica del Norte (UCN)': 'Medicina|Enfermería|Kinesiología|Nutrición y Dietética|Psicología|Derecho|Periodismo|Arquitectura|Geología|Ingeniería Civil Industrial|Ingeniería Civil en Minas|Ingeniería Civil en Computación|Ingeniería Comercial|Biología Marina',
    'Universidad Tecnológica Metropolitana (UTEM)': 'Ingeniería Civil en Computación|Ingeniería Civil Industrial|Ingeniería Civil Electrónica|Ingeniería Civil en Obras Civiles|Arquitectura|Diseño|Trabajo Social|Contador Auditor|Ingeniería en Ciberseguridad',
    'Universidad San Sebastián (USS)': 'Medicina|Odontología|Enfermería|Kinesiología|Nutrición y Dietética|Fonoaudiología|Tecnología Médica|Obstetricia y Puericultura|Psicología|Derecho|Ingeniería Comercial|Ingeniería Civil Industrial|Periodismo|Arquitectura|Medicina Veterinaria|Pedagogía en Educación Básica',
    'Universidad de Antofagasta (UA)': 'Medicina|Enfermería|Kinesiología|Obstetricia y Puericultura|Tecnología Médica|Psicología|Derecho|Ingeniería Comercial|Ingeniería Civil Industrial|Ingeniería Civil en Minas|Biología Marina',
    'Universidad de La Serena (ULS)': 'Medicina|Enfermería|Kinesiología|Obstetricia y Puericultura|Psicología|Periodismo|Arquitectura|Diseño|Ingeniería Comercial|Ingeniería Civil Industrial|Ingeniería Civil en Minas|Agronomía|Pedagogía en Matemática|Pedagogía en Inglés',
    'Universidad del Bío-Bío (UBB)': 'Enfermería|Fonoaudiología|Nutrición y Dietética|Psicología|Trabajo Social|Arquitectura|Diseño|Ingeniería Comercial|Contador Auditor|Ingeniería Civil Industrial|Ingeniería Civil en Informática|Ingeniería Civil Mecánica|Construcción Civil|Pedagogía en Educación Básica|Educación Parvularia',
    'Universidad Alberto Hurtado (UAH)': 'Derecho|Psicología|Sociología|Trabajo Social|Ciencia Política|Antropología|Periodismo|Historia|Filosofía|Economía|Ingeniería Comercial|Pedagogía en Educación Básica|Pedagogía en Lenguaje y Comunicación|Pedagogía en Historia y Ciencias Sociales',
  };
  const FUENTE_ILUSTRATIVA = 'Plantilla ilustrativa de Ruta Académica: ponderaciones de ejemplo y sin corte cargado. Reemplázalas con los datos oficiales.';
  const CATALOGO_CORTES = [
    ['Universidad de Chile (UChile)', 'Ingeniería y Ciencias (Plan Común)', 'ingenieria'],
    ['Pontificia Universidad Católica de Chile (PUC)', 'Ingeniería', 'ingenieria'],
    ['Universidad Técnica Federico Santa María (UTFSM)', 'Ingeniería Civil Industrial', 'ingenieria'],
    ['Universidad de Santiago de Chile (USACH)', 'Ingeniería Civil en Informática', 'ingenieria'],
    ['Universidad de Concepción (UdeC)', 'Ingeniería Civil', 'ingenieria'],
    ['Universidad de Chile (UChile)', 'Medicina', 'medicina'],
    ['Pontificia Universidad Católica de Chile (PUC)', 'Medicina', 'medicina'],
    ['Universidad de Concepción (UdeC)', 'Medicina', 'medicina'],
    ['Universidad de Chile (UChile)', 'Enfermería', 'salud'],
    ['Universidad Andrés Bello (UNAB)', 'Kinesiología', 'salud'],
    ['Universidad de Chile (UChile)', 'Derecho', 'derecho'],
    ['Pontificia Universidad Católica de Chile (PUC)', 'Derecho', 'derecho'],
    ['Universidad Diego Portales (UDP)', 'Derecho', 'derecho'],
    ['Universidad Adolfo Ibáñez (UAI)', 'Ingeniería Comercial', 'negocios'],
    ['Universidad de Chile (UChile)', 'Ingeniería Comercial', 'negocios'],
    ['Pontificia Universidad Católica de Valparaíso (PUCV)', 'Ingeniería Comercial', 'negocios'],
    ['Pontificia Universidad Católica de Chile (PUC)', 'Psicología', 'psicologia'],
    ['Universidad Diego Portales (UDP)', 'Psicología', 'psicologia'],
    ['Universidad de Chile (UChile)', 'Arquitectura', 'arquitectura'],
    ['Pontificia Universidad Católica de Valparaíso (PUCV)', 'Pedagogía en Educación Básica', 'educacion'],
  ].map(([universidad, carrera, tipo], i) => ({
    id: `ref-${i + 1}`, universidad, carrera,
    ponderaciones: { ...PLANTILLAS_PONDERACION[tipo] },
    corte: null, anio: null, ponderadoMinimo: null, notas: '',
    fuente: FUENTE_ILUSTRATIVA,
  }));
  /* =========================================================
   * PUNTAJES DE CORTE ADMISIÓN 2026 (v7)
   * Fuente: resultaapp.cl (páginas por universidad, consultadas el 25-11-2026). Es un agregador:
   * no cita a DEMRE en esas páginas. Cada valor es el "corte más alto" entre sedes publicado ahí
   * (último seleccionado). 1.008 carreras de 22 universidades, copiadas tal como se publicaron.
   * Formato: "## Universidad" y luego "Carrera|corte" (corte con coma decimal).
   * ========================================================= */
  const FUENTE_CORTES_2026 = 'según resultaapp.cl (25-11-2026), no oficial: verifícalo en demre.cl.';
  const CORTES_2026_TXT = `
    ## Universidad de Chile (UChile)
    Medicina|931,2
    Estudios Internacionales|869,2
    Psicología|866,6
    Derecho|851,2
    Bachillerato, Programa Académico de|836,1
    Ingeniería y Ciencias - Plan Común|833,9
    Ingeniería Comercial|829,6
    Ciencia Política|816,4
    Odontología|810,7
    Química y Farmacia|809,1
    Ingeniería en Biotecnología Molecular|805,6
    Bioquímica|800,2
    Ingeniería en Sonido|799,4
    Tecnología Médica|794,4
    Ingeniería en Información y Control de Gestión|786,4
    Enfermería|781,4
    Contador Auditor|775,6
    Medicina Veterinaria|775,3
    Administración Pública|774,2
    Kinesiología|766,0
    Antropología - Arqueología|764,8
    Periodismo|762,8
    Cine y Televisión|760,7
    Obstetricia y Puericultura|758,4
    Danza|751,4
    Arquitectura|741,0
    Sociología|725,7
    Lic. en Ciencias con Mención en Física|717,4
    Química|717,4
    Diseño|714,8
    Pedagogía en Educación Básica|709,5
    Historia, Licenciatura en|701,7
    Nutrición y Dietética|700,3
    Teoría de la Música|697,0
    Terapia Ocupacional|693,8
    Trabajo Social|690,3
    Ingeniería Agronómica|687,0
    Pedagogía en Educación Física|685,2
    Pedagogía en Educación Parvularia|681,5
    Biología con Mención en Medio Ambiente|680,9
    Licenciado/a en Artes con Mención en Composición|679,1
    Lic. en Ciencias con Mención en Biología|672,4
    Pedagogía en Educación Media en Matemática y Física|660,9
    Artes Visuales, Lic. en Artes con Mención en|653,6
    Ingeniería en Alimentos|650,9
    Geografía|647,3
    Diseño Teatral|644,1
    Fonoaudiología|639,3
    Pedagogía en Educación Especial|633,8
    Lingüística y Literatura con Mención, Licenciatura en|625,2
    Lic. en Ciencias con Mención en Matemáticas|612,5
    Ingeniería en Recursos Naturales Renovables|608,4
    Química Ambiental|588,6
    Teoría e Historia del Arte, Lic. en Artes con Mención en|582,3
    Lic. en Ciencias con Mención en Química|575,2
    Lingüística y Literatura Inglesas, Licenciatura en|564,9
    Actuación Teatral|556,3
    Ingeniería en Recursos Hídricos|509,0
    Pedagogía en Educación Media en Biología y Química|503,6
    Filosofía, Licenciatura en|491,3
    Ingeniería Forestal|484,5
    ## Pontificia Universidad Católica de Chile (PUC)
    Medicina|958,4
    Química y Farmacia|906,3
    Ingeniería|898,7
    Astronomía|897,7
    Bioquímica|893,6
    Física|887,7
    Psicología|874,3
    Derecho|872,4
    Ingeniería Comercial|870,1
    Odontología|866,9
    College Ciencias Naturales y Matemáticas|862,7
    Arquitectura|855,2
    Ciencia Política|848,3
    Química|833,5
    Enfermería|831,3
    Medicina Veterinaria|829,4
    Periodismo - Dirección Audiovisual - Publicidad|816,3
    Licenciatura en Ingeniería en Ciencia de la Computación|809,3
    Estadística|809,3
    Pedagogía en Educación Media en Matemática|808,6
    Kinesiología|806,5
    Biología|802,6
    Actuación|795,2
    Biología Marina|792,0
    Licenciatura en Ingeniería en Ciencia de Datos|791,0
    Administración Pública|785,8
    Matemática|783,7
    Pedagogía en Educación Media en Física|782,7
    Diseño|776,6
    Pedagogía en Educación Media en Ciencias Naturales y Biología|772,7
    Pedagogía en Inglés para Educación Básica y Media|772,2
    College Ciencias Sociales|769,5
    Antropología- Arqueología|760,0
    Pedagogía en Educación Física y Salud para Educación Básica y Media|757,3
    Construcción Civil|750,6
    Agronomía e Ingeniería Forestal|745,6
    Nutrición y Dietética|744,9
    Historia|740,6
    Terapia Ocupacional|736,8
    Pedagogía en Educación Parvularia|725,5
    Sociología|725,0
    Licenciatura en Interpretación Musical|721,0
    College Artes y Humanidades|716,6
    Trabajo Social|710,1
    Letras Inglesas|709,5
    Letras Hispánicas|709,3
    Pedagogia en Educación General Básica|702,8
    Fonoaudiología|699,3
    Arte|688,6
    Ingeniería en Recursos Naturales|679,4
    Geografía|674,2
    Pedagogía en Educación Especial|666,0
    Licenciatura en Música|664,1
    Pedagogía en Educación Media en Química|624,0
    Filosofía|615,6
    Teología|512,1
    ## Universidad de Concepción (UdeC)
    Medicina|953,2
    Ingenieria Civil Aeroespacial|875,1
    Quimica y Farmacia|874,5
    Bioquimica|829,0
    Geologia|825,6
    Tecnologia Medica|824,0
    Odontologia|823,1
    Ingenieria Civil Informatica|809,0
    Derecho|805,6
    Ingenieria Civil Electrica|804,6
    Ingenieria Civil Industrial|800,1
    Ingenieria Civil Mecanica|788,6
    Psicologia|787,7
    Ingenieria Civil Quimica|781,5
    Medicina Veterinaria (concepcion)|780,5
    Ingenieria Civil Biomedica|779,4
    Astronomia|772,1
    Obstetricia y Puericultura|759,1
    Derecho (chillan)|757,4
    Ingenieria Civil de Minas|756,7
    Enfermeria (concepcion)|755,6
    Kinesiologia|750,3
    Arquitectura|747,9
    Ingenieria Civil Matematica|741,9
    Biologia Marina|739,0
    Administracion Publica y Ciencia Politica|736,4
    Ingenieria Civil|732,5
    Ingenieria Civil Electronica|728,9
    Medicina Veterinaria (chillan)|727,4
    Ingenieria Estadistica|717,0
    Ingenieria Comercial (concepcion)|710,7
    Enfermeria (chillan)|709,8
    Ingenieria Civil, Primer Año Comun|709,5
    Ingenieria Civil Metalurgica|709,3
    Bioingenieria|707,5
    Pedagogia en Educacion Musical|701,8
    Enfermeria (los Angeles)|699,3
    Licenciatura en Quimica - Quimico|697,7
    Auditoria|694,4
    Ingenieria Civil en Telecomunicaciones|687,1
    Biologia|686,2
    Bachillerato en Ciencias e Innovación|679,4
    Ingenieria Comercial (chillan)|678,8
    Auditoria - Diurna (los Angeles)|674,4
    Pedagogia en Español|672,8
    Nutricion y Dietetica|671,9
    Pedagogia en Artes Visuales|669,0
    Pedagogia en Ingles|667,3
    Periodismo|665,2
    Quimico Analista|664,3
    Pedagogia en Matematica|659,0
    Pedagogia en Español (los Angeles)|655,0
    Fonoaudiologia|654,5
    Traduccion/interpretacion en Idiomas Extranjeros|653,4
    Educacion Parvularia|642,7
    Pedagogia en Historia y Geografia|642,7
    Ingenieria Comercial (los Angeles)|641,5
    Artes Visuales|635,0
    Educación Básica (los Angeles)|628,2
    Pedagogia en Educacion Fisica|623,9
    Trabajo Social|620,0
    Pedagogia en Cs. Naturales y Biologia|617,9
    Ingenieria Civil Agricola (chillan)|605,3
    Ingenieria en Biotecnologia Marina y Acuicultura|604,9
    Ciencias Fisicas|600,4
    Pedagogia en Ingles (los Angeles)|597,2
    Teatro|584,1
    Educacion Diferencial|577,9
    Ingenieria Forestal|574,0
    Pedagogia en Cs. Naturales y Biologia (los Angeles)|568,8
    Pedagogia en Cs. Naturales y Fisica|567,2
    Ingenieria en Conservacion de Recursos Naturales|562,2
    Geofisica|551,4
    Pedagogia en Cs. Naturales y Quimica|550,1
    Ingenieria Ambiental (chillan)|547,9
    Ingenieria Geomatica (los Angeles)|547,1
    Pedagogia en Matematica (los Angeles)|543,8
    Agronomia (concepcion)|543,2
    Ingenieria en Biotecnologia Vegetal|541,5
    Licenciatura en Matematica|538,7
    Educacion Diferencial (los Angeles)|538,5
    Agronomia (chillan)|534,1
    Sociologia|526,4
    Ingenieria en Biotecnologia Vegetal (los Angeles)|512,7
    Licenciatura en Historia|510,6
    Bachillerato en Humanidades|508,9
    Geografia|505,8
    Antropologia|505,8
    Ingenieria Ambiental|504,6
    Educación Básica|502,6
    Pedagogia en Filosofia|501,7
    ## Universidad de Santiago de Chile (USACH)
    Medicina|939,4
    Química y Farmacia|862,3
    Bioquímica|818,7
    Enfermería|813,6
    Psicología|811,6
    Ingeniería Civil Industrial|805,9
    Licenciatura en Estudios Internacionales|797,6
    Obstetricia y Puericultura|792,9
    Ingeniería Civil en Informática|787,6
    Ingeniería Civil en Minas|784,3
    Derecho|777,9
    Licenciatura en Ling. Aplic. a la Trad. Inglés - Japonés e Inglés Portug.|770,7
    Bachillerato en Ciencias y Humanidades|768,6
    Ingeniería Civil en Electricidad|768,4
    Kinesiología|765,9
    Ingeniería Civil en Mecánica|755,2
    Ingeniería de Ejecución en Computación e Informática|751,0
    Química|749,9
    Ingeniería Civil Biomédica|749,1
    Ingeniería Civil en Química|745,2
    Ingeniería Comercial|743,3
    Ingeniería Civil en Metalurgia|743,2
    Ingeniería Civil en Biotecnología|742,8
    Administración Pública|736,7
    Ingeniería Civil en Obras Civiles|732,5
    Arquitectura|731,7
    Ingeniería de Ejecución Industrial|730,3
    Ingeniería Civil Mecatrónica|730,0
    Ingeniería de Ejecución en Electricidad|727,0
    Astrofísica con Mención en Ciencia de Datos|723,8
    Ingeniería de Ejecución en Minas|720,5
    Terapia Ocupacional|710,8
    Ingeniería Estadística|709,5
    Contador Público y Auditor (diurno)|709,1
    Pedagogía en Inglés|702,1
    Ingeniería de Ejecución en Mecánica|701,3
    Periodismo|701,2
    Ingeniería de Ejecución en Metalurgia|697,0
    Ingeniería Matemática|694,5
    Pedagogía en Historia y Ciencias Sociales|690,5
    Contador Público y Auditor (vespertino)|690,3
    Ingeniería Civil en Telemática|690,2
    Diseño en Comunicación Visual|686,2
    Publicidad|684,3
    Ingeniería Civil en Geomensura y Geomática|678,5
    Analista en Computación Científica / Lic.en Ciencia de la Computación|674,1
    Diseño Industrial|669,3
    Ingeniería Física|668,6
    Licenciatura en Historia|666,1
    Licenciatura en Ciencias de la Actividad Física / Entrenador Deportivo|662,3
    Pedagogía en Educación General Básica|662,1
    Pedagogía en Castellano|659,6
    Ingeniería Civil en Ambiente|653,6
    Tecnología en Automatización Industrial|645,0
    Pedagogía en Física y Matemática|637,1
    Gestión de Personas|636,6
    Ingeniería de Ejecución en Química|634,3
    Pedagogía en Química y Biología|631,9
    Ingeniería en Agronegocios|628,7
    Pedagogía en Educación Física|621,6
    Ingeniería Civil en Territorio y Medioambiente|604,4
    Ingeniería de Ejecución en Climatización|600,2
    Pedagogía en Filosofía|598,4
    Tecnología en Telecomunicaciones|577,5
    Ingeniería de Alimentos|561,1
    Licenciatura en Cs de la Actividad Física / Terapeuta en Act Física y Salud|558,1
    Técnico Universitario en Análisis Químico y Físico|556,8
    Tecnología en Mantenimiento Industrial|555,6
    Análisis y Gestión de Procesos Productivos|541,8
    Pedagogía en Matemática y Computación|537,6
    Tecnología en Construcciones|462,5
    Tecnología en Alimentos|455,2
    ## Universidad Técnica Federico Santa María (UTFSM)
    Ingenieria Civil Industrial|837,4
    Ingenieria Civil Plan Comun|825,6
    Ingenieria Civil Mecanica|822,6
    Ingenieria Civil Electrica|822,5
    Ingenieria Civil Informatica|820,1
    Ingenieria Civil Quimica|815,4
    Ingenieria Civil|811,2
    Ingenieria Civil de Minas|805,7
    Ingenieria Civil Matemática (código 15101)|805,3
    Ingenieria Civil Matematica (código 15301)|805,2
    Ingenieria Comercial|799,6
    Ingeniería Civil Física|783,9
    Ingeniería Civil en Biotecnología|783,2
    Ingenieria Civil Telematica|763,3
    Ingenieria Civil Metalurgica|749,4
    Licenciatura en Astrofisica|748,6
    Arquitectura|748,3
    Ingenieria Civil Electronica|747,5
    Ingenieria en Aviacion Comercial|722,7
    Licenciatura en Fisica|715,7
    Ingenieria Civil Ambiental|695,9
    Ingenieria en Diseño de Productos|677,2
    Construccion Civil|662,5
    Ingenieria en Informatica|651,8
    Ingeniería en Biotecnología|644,3
    Ingenieria en Mantenimiento Industrial|633,5
    Ingenieria en Prevencion de Riesgos Laborales y Ambientales|601,9
    Ingenieria en Fabricacion y Diseño Industrial|534,0
    ## Pontificia Universidad Católica de Valparaíso (PUCV)
    Quimica y Farmacia|802,2
    Ingenieria Civil Industrial|788,0
    Derecho|776,9
    Psicologia|768,1
    Ingenieria Civil Electrica|738,2
    Ingenieria Civil Mecanica|732,5
    Arquitectura|730,0
    Ingenieria Civil Informatica|726,5
    Ingenieria Civil de Minas|723,4
    Bachillerato en Ingeniería|717,5
    Ingenieria Civil Metalúrgica|716,5
    Tecnologia Medica|713,1
    Ingenieria Civil Quimica|700,8
    Ingenieria Comercial|693,5
    Kinesiologia|691,9
    Bioquimica|690,3
    Ingenieria Mecanica|688,1
    Ingenieria Electrica|687,6
    Ingenieria Civil|684,7
    Ingenieria en Informatica|671,5
    Contador Auditor|668,5
    Ingenieria Civil Electronica|666,9
    Quimica Industrial|660,6
    Ingenieria Civil en Ciencia de Datos|656,7
    Pedagogia en Musica|655,2
    Administracion Publica|645,9
    Periodismo|643,4
    Educacion Parvularia|643,1
    Ingenieria Electronica|639,4
    Oceanografia Ó Biologia Marina|636,8
    Ingenieria Civil en Construccion|634,6
    Pedagogia en Educacion Fisica|634,1
    Bachillerato en Ciencias|632,0
    Licenciatura en Ciencias y Artes Musicales o Lic. M/composicion|624,6
    Pedagogía en Física y Ciencias Naturales|624,4
    Licenciatura en Matematicas|618,6
    Pedagogia en Educacion Basica|614,4
    Trabajo Social|605,9
    Diseño|602,9
    Ingenieria en Construccion|599,6
    Ingenieria Civil Bioquimica|597,9
    Licenciatura en Biologia|596,2
    Ingenieria Civil en Telecomunicaciones|592,4
    Pedagogia en Historia, Geografia y Ciencias Sociales|589,7
    Animación Digital|582,8
    Interpretacion o Traduccion (ingles-español)|579,4
    Pedagogia en Educacion Especial M/discapacidad Intelectual o M/dificulta|573,3
    Licenciatura en Filosofia|572,8
    Pedagogia en Quimica y Ciencias Naturales|572,0
    Pedagogia en Matematicas|566,6
    Produccion Musical|553,8
    Pedagogia en Biologia y Ciencias Naturales|545,2
    Licenciatura en Historia|541,4
    Agronomia|536,6
    Ingeniería Civil en Transporte|528,9
    Licenciatura en Linguistica y Literatura|527,8
    Fotografia Profesional|508,7
    Ilustracion|505,9
    Pedagogia en Filosofia|502,7
    Pedagogia en Ingles|501,4
    Licenciatura en Arte|501,1
    Pedagogia en Castellano y Comunicacion|492,6
    Geografia|483,0
    Desarrollo de Videojuegos y Simulacion Virtual|479,0
    Licenciatura en Fisica o Licenciatura en Fisica Mencion Astronomia|474,3
    Publicidad|454,1
    ## Universidad de Valparaíso (UV)
    Medicina|919,9
    Química y Farmacia|825,4
    Odontología|780,0
    Enfermería|726,3
    Derecho|712,9
    Tecnología Médica|711,2
    Pedagogía en Filosofía|708,1
    Psicología|707,9
    Obstetricia y Puericultura|694,3
    Ingeniería Civil Industrial|669,0
    Ingeniería en Negocios Internacionales|633,9
    Teatro|632,8
    Kinesiología|630,8
    Ingeniería Civil Matemática|617,8
    Biología Marina|617,4
    Fonoaudiología|613,9
    Arquitectura|604,7
    Ingeniería Civil Informática|602,0
    Ingeniería Comercial|601,8
    Ingeniería en Gestión Logística|591,5
    Nutrición y Dietética|583,5
    Pedagogía en Matemáticas o Licenciatura en Matemáticas|581,7
    Ingeniería en Informática|575,7
    Ingeniería Civil - Plan Común|567,4
    Ingeniería Civil|563,7
    Pedagogía en Música|556,3
    Administración Pública|553,3
    Ingeniería en Finanzas|549,2
    Pedagogía en Lengua y Literatura|545,0
    Licenciatura en Física Mencion Astronomía o Ciencias Atmosféricas o Computación Científica|541,2
    Trabajo Social|534,3
    Ingeniería Civil Ambiental|523,2
    Ingeniería Civil Oceánica|520,2
    Gestión en Turismo y Cultura|506,5
    Ingeniería en Estadística y Ciencia de Datos|500,0
    Diseño|485,8
    Cine|482,9
    Ingeniería Civil Biomédica|478,2
    Sociología|475,8
    Ingeniería Ambiental|474,8
    Pedagogía en Historia y Ciencias Sociales|471,4
    Auditoría|468,7
    Ingeniería en Información y Control de Gestión|448,6
    Educación Parvularia|439,9
    Ingeniería en Construcción|438,8
    Ecología|437,0
    Licenciatura en Ciencias Mencion en Biología o en Quimica|426,4
    Administración Hotelera y Gastronómica|398,2
    ## Universidad Diego Portales (UDP)
    Medicina|930,9
    Derecho|772,5
    Psicología|772,2
    Ingeniería Civil Industrial|756,2
    Odontología|751,0
    Ingeniería Civil en Informática y Telecomunicaciones|748,7
    Enfermería|740,9
    Tecnología Médica|733,1
    Obstetricia y Neonatología|732,0
    Ingeniería Civil en Ciencia de Datos e Inteligencia Artificial|715,3
    Ingeniería Civil Plan Común|710,8
    Ingeniería Comercial|702,5
    Administración Pública|695,7
    Arquitectura|677,9
    Contador Auditor-contador Público|675,9
    Ingeniería en Control de Gestión|673,2
    Ingeniería Civil en Obras Civiles|673,1
    Periodismo|671,5
    Ciencia Política|671,0
    Kinesiología|666,7
    Publicidad|664,2
    Cine y Realización Audiovisual|649,2
    Diseño|605,4
    Pedagogía en Inglés|584,1
    Bachillerato en Ciencias Sociales y Humanidades|581,8
    Sociología|551,0
    Licenciatura en Historia|540,0
    Pedagogía en Educación Parvularia|516,9
    Literatura Creativa|508,4
    Bachillerato en Administración y Economía|506,7
    Artes Visuales|505,7
    Cine de Animación|503,1
    Pedagogía en Educación Diferencial con Mención en Desarrollo Cognitivo|500,3
    Pedagogía en Educación General Básica|494,5
    Antropología|494,0
    ## Universidad Adolfo Ibáñez (UAI)
    International Management|892,5
    Doble Grado Derecho + Ingeniería Comercial|842,6
    Ingeniería Civil (plan Común) - 7 Carreras o Especialidades|815,0
    Ingeniería Comercial|811,4
    Doble Título Arquitectura + Ingeniería Civil Industrial|800,7
    Ingeniería en Negocios y Tecnología|794,9
    Bachillerato de Ingeniería Civil|792,1
    Doble Título Ingeniería Comercial + Sociología|778,4
    Derecho|768,7
    Bachillerato de Ingeniería Comercial|768,0
    Ingeniería Civil Industrial|761,7
    Ingeniería en Computer Science|756,8
    Psicología|746,0
    Ingeniería Civil (plan Común) - 4 Carreras o Especialidades|712,4
    Comunicación Estratégica - Periodismo, Doble Título|697,9
    ## Universidad de los Andes (UANDES)
    Medicina|944,0
    Bachillerato de Medicina|905,6
    Odontología|824,9
    Ingeniería Civil (plan Común)|812,4
    Derecho y Filosofía|807,9
    Derecho e Historia|799,3
    International Business|798,0
    Ingeniería Comercial|797,4
    Psicología|793,2
    Derecho|790,4
    Bachillerato de Ingeniería Comercial|770,2
    Enfermería|750,5
    Bachillerato de Ingeniería|748,0
    Bachillerato de Psicología|736,0
    Bachillerato de Derecho|723,3
    Terapia Ocupacional|709,2
    Filosofía|696,7
    Bachillerato de Odontología|693,0
    Kinesiología|690,3
    Marketing y Publicidad|690,2
    Obstetricia y Puericultura|689,7
    Administración de Servicios|670,7
    Literatura|660,7
    Educación de Párvulos con Menciones|628,2
    Bachillerato de Obstetricia y Puericultura|621,2
    Historia|616,0
    Periodismo y Comunicación Estratégica|603,2
    Bachillerato de Enfermería|588,9
    Pedagogía Básica con Meciones|577,9
    Pedagogía Básica Bilingüe Inglés/español|575,8
    Nutrición y Dietética|561,0
    ## Universidad del Desarrollo (UDD)
    Medicina|956,4
    Ingeniería Civil en Biomedicina|881,4
    Química y Farmacia|822,8
    Global Business Administration|807,6
    Ingeniería Civil en Informática e Inteligencia Artificial|782,1
    Ingeniería Comercial|772,3
    Ingeniería Civil Industrial|767,3
    Ingeniería Civil en Informática e Innovación Tecnológica|763,5
    Psicología|753,0
    Derecho|749,0
    Negocios y Ciencia de Datos|742,0
    Odontología|734,0
    Enfermería|691,5
    Ingeniería Civil Plan Común|680,7
    Bachillerato en Ingeniería Comercial|664,9
    Publicidad y Marketing|650,8
    Obstetricia|644,3
    Ingeniería Civil en Minería|616,2
    Ciencia Política y Políticas Públicas|610,1
    Periodismo y Comunicación|595,5
    Kinesiología|591,9
    Pedagogía en Educación de Párvulos|562,3
    Bachillerato en Derecho, Ciencias Sociales y Humanidades|552,8
    Diseño|551,7
    Pedagogía en Educación Básica con Menciones|544,9
    Tecnología Médica|531,2
    Arquitectura|527,9
    Ingeniería Civil en Obras Civiles|513,0
    Bachillerato en Enfermería|512,2
    Cine y Comunicación Audiovisual|512,2
    Bachillerato en Psicología|509,9
    Terapia Ocupacional|509,2
    Bachillerato en Diseño|508,6
    Nutrición y Dietética|508,4
    Geología|508,3
    ## Universidad Andrés Bello (UNAB)
    Medicina|910,6
    Quimica y Farmacia|725,9
    International Business|696,3
    Bachillerato en Ciencias de la Salud|653,0
    Ingenieria Civil Industrial (las Condes)|641,3
    Odontologia|619,4
    Ingenieria Civil Electrica|593,5
    Obstetricia|591,8
    Pedagogía en Ingles para la Enseñanza Basica y Media|585,0
    Derecho (las Condes)|575,1
    Bioquimica|568,6
    Ingenieria Civil en Minas|567,5
    Ingeniería en Negocios Internacionales|559,5
    Enfermeria (las Condes)|553,9
    Ingenieria Fisica|553,0
    Ingenieria Civil Informatica (las Condes)|551,6
    Administracion en Ecoturismo|547,7
    Publicidad|529,9
    Sociologia|529,7
    Licenciatura en Letras|524,3
    Ingenieria en Automatizacion y Robotica|519,4
    Pedagogia en Ingles para la Enseñanza Basica y Media|515,8
    Enfermeria|514,7
    Psicologia|513,8
    Geologia|510,8
    Ingenieria Civil Informatica|509,5
    Ingenieria en Turismo y Hoteleria|502,4
    Ingenieria en Biotecnologia|502,1
    Trabajo Social|493,0
    Ingenieria en Marina Mercante|486,9
    Educacion Parvularia|485,2
    Pedagogia Educacion Fisica|484,3
    Enfermeria (republica)|480,7
    Licenciatura en Fisica|480,1
    Ingenieria Civil Industrial|479,4
    Arquitectura|476,7
    Ingenieria Industrial|475,0
    Fonoaudiologia|473,8
    Derecho|471,2
    Psicopedagogia|470,9
    Terapia Ocupacional|469,2
    Ingeniería en Automatización y Robótica|467,5
    Bachillerato en Ciencias de la Salud (republica)|466,7
    Licenciatura en Astronomia|466,3
    Artes Visuales|465,7
    Contador Auditor|464,5
    Diseño de Juegos Digitales|462,4
    Tecnologia Medica|462,0
    Computer Science Engineering|458,0
    Licenciatura en Astronomía|457,6
    Kinesiologia|456,8
    Diseño Grafico|455,2
    Licenciatura en Historia|455,0
    Ingenieria en Computacion e Informatica|454,3
    Ingenieria Ambiental|453,9
    Ingenieria Comercial|450,6
    Ingenieria Civil|449,5
    Ingenieria Civil Informatica (antonio Varas)|447,6
    Nutricion y Dietetica|446,2
    Periodismo|446,1
    Ingenieria en Administracion Hotelera Internacional|438,9
    Entrenador Deportivo|438,8
    Ingenieria Comercial (las Condes)|434,6
    Biologia|433,9
    Ingenieria Civil Industrial (antonio Varas)|433,0
    Ingenieria en Administracion de Empresas|430,8
    Derecho (bellavista)|428,0
    Biologia Marina|424,9
    Medicina Veterinaria|423,0
    Diseño de Vestuario y Textil|413,5
    Bachillerato en Ciencias de la Salud (las Condes)|402,8
    Ingenieria en Construccion|399,6
    Ingenieria Comercial (bellavista)|393,6
    ## Universidad Austral de Chile (UACh)
    Medicina: Campo Clínico Valdivia|922,8
    Medicina: Campo Clínico Osorno|912,1
    Química y Farmacia (valdivia)|779,9
    Ingeniería Civil Industrial (valdivia)|752,9
    Tecnología Médica (valdivia)|742,6
    Odontología (valdivia)|723,2
    Obstetricia y Puericultura (valdivia)|719,3
    Psicología (valdivia)|718,6
    Medicina Veterinaria (valdivia)|713,2
    Enfermería (valdivia)|710,4
    Derecho (valdivia)|697,8
    Derecho (puerto Montt)|685,1
    Kinesiología (valdivia)|679,8
    Bioquímica (valdivia)|677,7
    Biología Marina (valdivia)|655,6
    Ingeniería Comercial (valdivia)|651,6
    Ingeniería Civil Industrial (puerto Montt)|644,2
    Arquitectura (valdivia)|633,9
    Psicología (puerto Montt)|632,6
    Enfermería (puerto Montt)|625,5
    Terapia Ocupacional (valdivia)|610,7
    Geología (valdivia)|607,6
    Ingeniería Comercial (puerto Montt)|600,3
    Pedagogía en Matemáticas (puerto Montt)|597,9
    Ingeniería Civil en Informática (valdivia)|597,6
    Artes Musicales y Sonoras (valdivia)|593,9
    Ingeniería en Alimentos (valdivia)|590,3
    Administración Pública (valdivia)|587,0
    Biología (valdivia)|582,4
    Ingeniería Civil Mecánica (valdivia)|573,6
    Pedagogía en Lenguaje y Comunicación (valdivia)|565,4
    Ingeniería Plan Común (valdivia)|551,7
    Ingeniería Ambiental (puerto Montt)|539,2
    Pedagogía en Comunicación en Lengua Inglesa (valdivia)|535,2
    Pedagogía en Educación Física, Deportes y Recreación, (valdivia)|526,3
    Auditoría (valdivia)|523,9
    Ingenieria en Conservación de Recursos Naturales - Ingeniería Forestal (valdivia)|520,7
    Licenciatura en Ciencias con Mención (valdivia)|514,1
    Geografía (valdivia)|508,2
    Pedagogía en Educación Diferencial con Mención (puerto Montt)|507,3
    Licenciatura en Artes Visuales (valdivia)|507,3
    Ingeniería Civil Acústica (valdivia)|506,8
    Diseño (valdivia)|504,5
    Ingeniería Civil en Obras Civiles (valdivia)|501,5
    Ingeniería Civil Electrónica (valdivia)|498,2
    Pedagogía en Educación Parvularia (valdivia)|493,6
    Administración de Empresas de Turismo (valdivia)|487,5
    Ingeniería Naval (valdivia)|482,9
    Pedagogía en Educación Parvularia (puerto Montt)|480,9
    Fonoaudiologia (puerto Montt)|478,0
    Agronomía (valdivia)|477,0
    Ingeniería en Construcción (valdivia)|474,1
    Creación Audiovisual (valdivia)|472,0
    Ing en Información y Control de Gestión (puerto Montt)|470,7
    Pedagogía en Educación Básica con Menciones (puerto Montt)|470,3
    Pedagogía en Historia y Ciencias Sociales (valdivia)|468,3
    Trabajo Social (puerto Montt)|457,2
    Terapia Ocupacional (puerto Montt)|454,4
    Administración Publica (puerto Montt)|445,7
    Arqueología (puerto Montt)|445,4
    Antropología (valdivia)|436,9
    Tecnología Médica (puerto Montt)|432,0
    Química (valdivia)|428,6
    Periodismo (valdivia)|421,9
    ## Universidad de La Frontera (UFRO)
    Medicina|917,2
    Química y Farmacia|843,0
    Odontologia|760,3
    Biotecnologia|745,6
    Enfermeria|744,7
    Tecnologia Medica|741,1
    Medicina Veterinaria|734,0
    Bioquimica|733,5
    Psicologia|732,5
    Obstetricia y Puericultura|720,0
    Ingenieria Civil Electrica|711,5
    Ingenieria Civil Industrial|709,0
    Ingenieria Civil Informatica|689,9
    Kinesiologia|686,0
    Ingenieria Civil|681,3
    Ingenieria Comercial|678,2
    Ingenieria Civil en Biotecnologia|676,8
    Ingenieria Civil Mecanica|643,8
    Ingenieria Civil Matematica|643,0
    Ingenieria Civil Quimica|632,4
    Derecho|625,6
    Ingenieria Civil Telematica|615,2
    Contador Publico y Auditor|612,7
    Ingenieria Informatica|609,4
    Nutricion y Dietetica|605,1
    Agronomia|604,8
    Ingenieria Civil Electronica|604,8
    Terapia Ocupacional|599,3
    Plan Comun Ingenieria Civil|593,1
    Pedagogia en Educacion Fisica, Deportes y Rec.|582,4
    Pedagogia Matematica|576,5
    Fonoaudiologia|561,2
    Ingenieria en Construccion|547,2
    Pedagogia en Ingles|532,6
    Periodismo|519,8
    Pedagogia en Ciencias M. Biologia, Quimica o Fisica|504,7
    Pedagogia en Educacion Diferencial|502,3
    Trabajo Social|497,8
    Pedagogia en Castellano y Comunicacion|495,3
    Sociologia|486,6
    Pedagogia en Historia, Geografia. y Educacion Civica|463,6
    Ingenieria en Recursos Naturales|461,7
    Ingenieria Civil Ambiental|446,6
    Bachillerato en Ciencias Sociales|398,7
    ## Universidad de Talca (UTALCA)
    Medicina|914,5
    Odontología|818,7
    Química y Farmacia|814,6
    Ingeniería Civil Industrial|789,3
    Licenciatura en Interpretación y Formación Musical Especializada|786,1
    Derecho|751,3
    Tecnologia Medica|731,8
    Enfermeria|725,8
    Arquitectura|724,8
    Obstetricia y Puericultura|720,1
    Bioquímica|714,0
    Ingeniería Civil Eléctrica|711,3
    Terapia Ocupacional|704,5
    Psicología|704,2
    Kinesiología|700,5
    Pedagogía en Educación General Básica con Mención en Alemán|692,3
    Diseño|680,5
    Administración Pública|680,1
    Contador Público y Auditor|676,9
    Ingenieria Comercial|668,8
    Ingenieria Civil de Minas|665,6
    Ingenieria Civil en Computacion|659,1
    Agronomia|658,0
    Ingeniería Civil Mecánica|655,9
    Auditoria e Ingeniería en Control de Gestión|654,2
    Ingeniería Civil Plan Común|649,6
    Fonoaudiología|649,4
    Nutrición y Dietética|641,1
    Ingeniería Informática Empresarial|636,5
    Ingeniería Civil Mecatrónica|611,1
    Ingeniería Civil en Obras Civiles|583,0
    Ingeniería Civil en Sistemas Inteligentes y Videojuegos|574,5
    Pedagogía en Educación Media en Biología y Química|571,6
    Pedagogía en Educación Parvularia con Mención en Alemán|556,4
    Pedagogía en Educación Media en Matemática y Física|552,4
    Ingeniería Civil en Bioinformática|531,5
    Pedagogía en Educación Media en Alemán|518,5
    Pedagogía en Educación Parvularia Mención en Inglés|488,2
    Pedagogía en Educación General Básica Mención Inglés|485,8
    Pedagogía en Educación Media en Inglés|478,3
    ## Universidad Católica del Norte (UCN)
    Medicina|896,2
    Enfermeria|747,0
    Ingenieria Civil Industrial|745,5
    Derecho|734,5
    Quimica y Farmacia|719,7
    Ingenieria Civil de Minas|718,0
    Psicologia|705,5
    Ingenieria Civil en Computacion e Informatica|683,9
    Ingenieria Civil Metalurgica|682,8
    Ingenieria Comercial|678,5
    Kinesiologia|674,9
    Ingenieria Civil Quimica|670,4
    Quimica Industrial|654,8
    Biologia Marina|643,0
    Ingeniería Civil Electrónica|640,6
    Analista Quimico|629,5
    Nutricion y Dietetica|628,5
    Ingenieria en Informacion y Control de Gestion|625,8
    Ingeniería Civil Plan Común|620,9
    Geologia|615,1
    Arquitectura|608,3
    Ingeniería Civil en Construcción|607,0
    Ingenieria en Metalurgia|601,3
    Ingenieria Civil|585,4
    Pedagogia en Filosofia y Religion|584,3
    Ingenieria en Acuicultura|578,2
    Licenciatura en Matemática|576,7
    Ingenieria en Computacion e Informatica|568,1
    Ingeniería Civil en Energía|563,2
    Ingenieria Civil Ambiental|562,8
    Ingenieria en Prevencion de Riesgos y Medioambiente|561,8
    Pedagogia en Matematica en Educacion Media|558,4
    Contador Auditor - Contador Publico (diurno)|554,0
    Pedagogia en Educacion Parvularia con Mencion en Desarrollo Emocional y Cognitivo|546,8
    Pedagogia en Educacion Basica con Especializacion|544,6
    Licenciatura en Fisica con Mencion en Astronomia|520,4
    Pedagogía en Educación Diferencial con Mención en Desarrollo Emocional y Cognitivo (18202)|518,6
    Ingenieria en Tecnologias de Informacion|515,0
    Pedagogia en Ingles|512,5
    Periodismo|505,5
    Ingenieria en Construccion|505,2
    Pedagogia en Educacion Diferencial con Mencion en Desarrollo Emocional y Cognitivo (18096)|496,8
    ## Universidad Tecnológica Metropolitana (UTEM)
    Quimica y Farmacia|689,3
    Ingenieria Civil Industrial|643,9
    Ingenieria Civil en Mecanica|635,6
    Ingenieria en Alimentos|627,6
    Ingenieria en Comercio Internacional|602,7
    Ingenieria Civil en Computacion Mencion Informatica|596,1
    Ingenieria en Informatica|588,6
    Ingenieria Civil en Obras Civiles|581,1
    Contador Publico y Auditor|576,8
    Ingenieria Civil Electronica|576,3
    Ingenieria en Gestion Turistica|574,5
    Bachillerato en Ciencias de la Ingenieria|571,5
    Ingenieria Comercial|565,3
    Administracion Publica|543,3
    Psicología|541,3
    Diseño Industrial|538,5
    Ingenieria Civil Matematica|523,4
    Ingenieria en Biotecnologia|521,8
    Ingenieria Civil Biomedica|513,0
    Bibliotecologia y Documentacion|501,6
    Ingenieria Civil en Ciencia de Datos|501,1
    Ingenieria Industrial|487,0
    Ingenieria Civil en Prevencion de Riesgos y Medio Ambiente|478,0
    Ingenieria Civil Quimica|477,5
    Quimica Industrial|477,2
    Derecho|475,2
    Ingenieria en Geomensura|474,6
    Ingenieria en Construccion|469,9
    Dibujante Proyectista|453,0
    Diseño en Comunicacion Visual|433,3
    Arquitectura|422,4
    Trabajo Social|390,0
    ## Universidad San Sebastián (USS)
    Medicina|911,3
    Química y Farmacia|669,4
    Obstetricia|577,5
    Pedagogía en Inglés|558,5
    Medicina Veterinaria|553,7
    Geología|550,1
    Fonoaudiología|545,6
    Pedagogía en Educación Básica|534,7
    Ingeniería Civil Informática|528,7
    Arquitectura|509,5
    Bachillerato en Ciencias de la Salud|504,6
    Ingeniería Civil|504,5
    Derecho|498,0
    Pedagogía en Educación Diferencial|495,3
    Ingeniería Civil Industrial|494,7
    Animación Digital|488,0
    Ingeniería Comercial|486,8
    Terapia Ocupacional|485,4
    Administración en Ecoturismo|482,1
    Psicología|481,3
    Ingeniería Civil en Minas|480,4
    Tecnología Médica|474,3
    Administración Pública|472,1
    Nutrición y Dietética|466,8
    Bioquímica|463,9
    Enfermería|463,2
    Odontología|462,3
    Licenciatura en Arte y Conservación del Patrimonio|461,8
    Kinesiología|459,1
    Licenciatura en Ciencias de la Actividad Física|450,5
    ## Universidad de Antofagasta (UA)
    Medicina|911,0
    Odontología|779,5
    Enfermeria|731,7
    Obstetricia y Puericultura|731,6
    Kinesiologia|698,1
    Bachillerato en Ciencias de la Salud|695,5
    Psicología|692,1
    Tecnología Médica en Imagenología y Física Médica|691,9
    Química y Farmacia|675,1
    Terapia Ocupacional|671,9
    Tecnología Médica en Laboratorio Clínico, Hematología y Medicina Transfusional|669,7
    Ingenieria Civil Eléctrica|648,8
    Fonoaudiologia|644,6
    Ingeniería Civil Industrial|641,9
    Ingenieria Civil en Minas|639,5
    Pedagogía en Matemática|638,4
    Nutrición y Dietética|624,7
    Bioquímica|611,8
    Biología Marina|598,4
    Derecho|596,5
    Ingenieria Comercial, Mención Negocios Mineros|595,2
    Ingenieria Civil Mecánica|594,9
    Diseño Gráfico, Mencion Diseño Estratégico|573,3
    Trabajo Social|567,4
    Bachillerato en Ciencias|559,9
    Ingenieria Civil en Procesos de Minerales|557,9
    Ingenieria Civil en Geomensura y Geomatica|554,4
    Artes Escénicas|541,3
    Pedagogía en Educación Parvularia, Mención Necesidades Educativas Especiales|534,9
    Pedagogía en Inglés|534,1
    Pedagogía en Educación Física|525,3
    Música|519,6
    Pedagogía en Educación Básica, Mención en Lenguaje y Comunicación y Matemática|503,9
    Licenciatura en Ciencias, Mención Física y Astrofísica|499,5
    Administración Pública|482,5
    Bachillerato en Ciencias Sociales y Artes|481,6
    Pedagogía en Lenguaje y Comunicación|468,8
    Pedagogía en Biología y Ciencias Naturales|428,4
    Ingenieria en Biotecnología|393,8
    ## Universidad de La Serena (ULS)
    Medicina|883,1
    Odontología|774,9
    Ingeniería Civil de Minas|755,5
    Psicología|747,2
    Química y Farmacia|746,1
    Enfermería|742,4
    Licenciatura en Astronomía|732,5
    Ingeniería Civil Industrial|713,4
    Ingeniería Civil Mecánica|708,4
    Pedagogía en Educación General Básica|702,8
    Química|688,7
    Pedagogía en Matemáticas|678,4
    Pedagogía en Biología y Cs Naturales|675,5
    Ingeniería en Biotecnología Mención en Alimentos o Procesos Sustentables|675,2
    Pedagogía en Educación Parvularia|668,0
    Derecho|665,5
    Pedagogía en Castellano y Filosofía|658,4
    Ingeniería Comercial|656,5
    Kinesiología|656,3
    Ingeniería Civil|656,0
    Arquitectura|652,8
    Ingeniería de Minas|652,2
    Diseño|647,8
    Ingeniería Civil en Computación e Informática|647,5
    Pedagogía en Historia y Geografía|645,4
    Pedagogía en Educación Musical|636,9
    Pedagogía en Matemáticas y Física|636,2
    Pedagogía en Inglés|629,7
    Traducción Inglés - Español|628,9
    Pedagogía en Educación Diferencial|628,7
    Auditoria|627,5
    Ingeniería Mecánica|625,8
    Ingeniería Civil Ambiental|622,5
    Ingeniería en Administración de Empresas|619,5
    Administración Pública|617,4
    Licenciatura en Música|616,5
    Ingeniería en Construcción|597,9
    Periodismo|561,6
    ## Universidad del Bío-Bío (UBB)
    Medicina|902,2
    Química y Farmacia|820,3
    Bachillerato en Ciencias|782,2
    Ingenieria Civil Industrial|757,0
    Arquitectura|726,5
    Psicologia|724,6
    Ingenieria Civil en Informatica|722,0
    Contador Publico y Auditor|714,7
    Ingenieria Civil Electrica|711,5
    Derecho|700,1
    Fonoaudiologia|691,9
    Enfermeria|690,8
    Ingenieria Civil Quimica|689,1
    Ingenieria Comercial|687,0
    Ingenieria Civil Mecanica|671,7
    Ingeniería Eléctrica|667,9
    Ingenieria Civil|663,4
    Nutricion y Dietetica|656,6
    Pedagogia en Educacion Fisica|649,3
    Trabajo Social|643,9
    Diseno Grafico|638,8
    Diseno Industrial|636,7
    Pedagogía en Educación Especial con Mención en Dificultades Específicas del Aprendizaje|617,7
    Ingeniería Mecánica|616,0
    Ingenieria Civil en Automatizacion|606,8
    Pedagogia en Ingles|601,0
    Ingenieria de Ejecucion en Computacion e Informatica|587,5
    Pedagogia en Educacion General Basica con Mencion en Lenguaje y Comunicación o Educacion Matematica|567,9
    Ingenieria en Construccion|560,7
    Pedagogia en Educacion Matematica|558,2
    Ingeniería Electrónica|554,9
    Pedagogia en Castellano y Comunicacion|540,5
    Ingenieria en Alimentos|528,7
    Pedagogia en Ciencias Naturales M/ Biol. M/fis M/ Qui|514,5
    Ingenieria Estadistica|513,4
    Pedagogia en Historia y Geografia|512,8
    Ingenieria en Recursos Naturales|489,6
    Pedagogia en Educacion Parvularia Menc Didactica en Primera Infancia|485,1
    ## Universidad Alberto Hurtado (UAH)
    Psicología|705,7
    Derecho|692,3
    Ciencia Política y Relaciones Internacionales|634,0
    Ingeniería Comercial|592,7
    Contador Público Auditor|587,8
    Pedagogía en Matemática|582,0
    Administración Pública|580,7
    Trabajo Social|572,7
    Pedagogía en Biología y Ciencias Naturales en Educación Media|542,7
    Pedagogia en Educacion Diferencial con Mencion en Dificultades del Aprendizaje Escolar|530,9
    Educación Parvularia|530,5
    Pedagogía en Filosofía|530,1
    Gestión de Información, Bibliotecología y Archivística|527,3
    Pedagogía en Música|525,5
    Pedagogía en Educación Básica|525,3
    Pedagogía en Inglés|515,8
    Arqueología|505,0
    Geografía|498,6
    Licenciatura en Historia|486,6
    Licenciatura en Filosofía|486,0
    Bachillerato en Humanidades|477,9
    Pedagogía en Artes Visuales|475,8
    Pedagogía en Historia y Ciencias Sociales|470,8
    Ingeniería Civil Plan Común|467,9
    Sociología|464,3
    Licenciatura en Teoría e Historia del Arte|462,5
    Licenciatura en Lengua y Literatura|460,4
    Pedagogía en Lengua Castellana y Comunicación|455,0
    Periodismo|427,0
    Antropología|417,1
  `;
  const CORTES_2026 = [];
  {
    let uni = null;
    for (const linea of CORTES_2026_TXT.split('\n')) {
      const l = linea.trim();
      if (!l) continue;
      if (l.startsWith('## ')) { uni = l.slice(3); continue; }
      const [carrera, corte] = l.split('|');
      CORTES_2026.push({ universidad: uni, carrera, corte: Number(corte.replace(',', '.')) });
    }
  }

  /** Normaliza un nombre de carrera para comparar ("Historia, Licenciatura en" = "Licenciatura en Historia" = "Historia"). */
  const normCarrera = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\(.*?\)/g, ' ').replace(/\b(licenciatura en|licenciado\/?a? en|lic\.? en|programa academico de|carrera de|plan comun)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\b(en|de|y|la|el)\b/g, ' ').replace(/\s+/g, ' ').trim();

  /** Plantilla ilustrativa según palabras clave del nombre (para carreras nuevas del listado 2026). */
  function tipoPorNombre(carrera) {
    if (TIPO_DE_CARRERA[carrera]) return TIPO_DE_CARRERA[carrera];
    const n = carrera.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const reglas = [
      ['medicina', /^(bachillerato de )?medicina\b(?! veterinaria)|odontolog/], ['agro', /veterinari|agronom|forestal|recursos naturales|alimentos|acuicultura|recursos hidricos/],
      ['salud', /enfermer|kinesiolog|nutricion|fonoaudiolog|obstetricia|tecnologia medica|terapia ocupacional|quimica y farmacia|salud|enfermeria/],
      ['derecho', /derecho/], ['informatica', /informatic|computacion|software|ciencia de (la )?(computacion|datos)|ciberseguridad|inteligencia artificial|telematic|datos/],
      ['negocios', /comercial|contador|auditor|negocios|business|management|control de gestion|economia|finanzas|marketing|administracion(?! publica)/],
      ['psicologia', /psicolog/], ['educacion', /pedagog|educacion|parvulari|docencia/], ['arquitectura', /arquitectura/],
      ['artes', /diseno|arte|musica|musical|teatr|danza|cine|actuacion|audiovisual|composicion|interpretacion/],
      ['comunicaciones', /periodismo|publicidad|comunicacion|letras|literatura|linguistica|traduccion/],
      ['sociales', /sociolog|trabajo social|ciencia politica|antropolog|arqueolog|historia|geografia|administracion publica|estudios internacionales|filosofia|humanidades|bibliotecolog/],
      ['ciencias', /biolog|quimica|fisica|astronom|matematic|estadistic|bioquimic|geolog|bachillerato|college|ciencias|biotecnolog|geofisic/],
      ['ingenieria', /ingenieria|construccion/],
    ];
    return (reglas.find(([, re]) => re.test(n)) || ['sociales'])[0];
  }

  /** Ponderaciones verificadas en la ficha de la carrera (resto: plantilla ilustrativa). */
  const PONDERACIONES_2026 = {
    'Universidad de Chile (UChile)|Psicología': { nem: 10, ranking: 30, cl: 25, m1: 20, electiva: 15 },
  };

  // Las 20 entradas originales reciben su corte 2026 si la carrera coincide en el listado
  const usados = new Set();
  for (const c of CATALOGO_CORTES) {
    const i = CORTES_2026.findIndex((x, j) => !usados.has(j) && x.universidad === c.universidad && normCarrera(x.carrera) === normCarrera(c.carrera));
    if (i < 0) continue;
    usados.add(i);
    Object.assign(c, { corte: CORTES_2026[i].corte, anio: '2026', fuente: `Corte 2026 ${FUENTE_CORTES_2026} Ponderaciones: plantilla ilustrativa.` });
  }
  // El resto del listado 2026 se agrega como carreras nuevas (ids estables "c26-…")
  const slugRef = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const idsVistos = new Set(CATALOGO_CORTES.map(c => c.id));
  CORTES_2026.forEach((x, i) => {
    if (usados.has(i)) return;
    let id = `c26-${slugRef(x.universidad.replace(/\s*\(.*\)$/, ''))}-${slugRef(x.carrera)}`.slice(0, 120);
    while (idsVistos.has(id)) id += '-b';
    idsVistos.add(id);
    const pond = PONDERACIONES_2026[`${x.universidad}|${x.carrera}`];
    CATALOGO_CORTES.push({
      id, universidad: x.universidad, carrera: x.carrera,
      ponderaciones: { ...(pond || PLANTILLAS_PONDERACION[tipoPorNombre(x.carrera)]) },
      corte: x.corte, anio: '2026', ponderadoMinimo: null, notas: '',
      fuente: `Corte 2026 ${FUENTE_CORTES_2026} Ponderaciones: ${pond ? 'según la ficha de la carrera en resultaapp.cl' : 'plantilla ilustrativa (reemplázalas por las oficiales)'}.`,
    });
  });
  /* =========================================================
   * PERSPECTIVA INSTITUCIONAL (v7) — cómo aborda cada universidad sus carreras.
   * Textos ORIENTATIVOS y generales, para comparar enfoques. No reemplazan el perfil de
   * egreso ni la malla oficial de cada carrera (siempre revisar el sitio de la universidad).
   *   sello  → identidad general de la institución
   *   areas  → enfoque propio en un área (claves = tipos de plantilla: ingenieria, informatica,
   *            medicina, salud, derecho, negocios, ciencias, arquitectura, sociales, educacion…)
   * ========================================================= */
  const PERSPECTIVAS_AREA = {
    ingenieria: 'Base fuerte en matemáticas, física y química los primeros años; luego ciencias de la ingeniería y especialidad. Revisa si hay plan común (eliges especialidad después) o ingreso directo.',
    informatica: 'Combina fundamentos (algoritmos, estructuras de datos, matemáticas discretas) con desarrollo de software, sistemas y datos. Las diferencias suelen estar en cuánta ciencia básica, investigación o gestión incluye cada plan.',
    medicina: 'Ciclo básico de ciencias biomédicas y luego ciclo clínico en hospitales y centros de salud. Importa conocer los campos clínicos y la red asistencial de cada universidad.',
    salud: 'Formación en ciencias biológicas y de la salud con prácticas clínicas progresivas. Revisa los convenios de campos clínicos y las especialidades del plan.',
    derecho: 'Fundamentos del derecho civil, constitucional y penal, con práctica en clínicas jurídicas. El sello varía en énfasis (público, privado, derechos humanos, empresa).',
    negocios: 'Economía, administración, finanzas y métodos cuantitativos; suele haber menciones (administración o economía). Compara la carga matemática y la vinculación con empresas.',
    psicologia: 'Bases biológicas, sociales y del desarrollo, metodología de investigación y prácticas en distintas áreas (clínica, educacional, organizacional, comunitaria).',
    sociales: 'Teoría y métodos de investigación (cualitativos y cuantitativos) aplicados a sociedad, política, territorio o cultura, con énfasis en análisis crítico.',
    comunicaciones: 'Escritura, narrativa y medios, con talleres prácticos y análisis de la sociedad y la información. Revisa el peso de lo audiovisual y lo digital.',
    educacion: 'Formación disciplinar y pedagógica con prácticas en establecimientos desde los primeros años, orientada al sistema escolar chileno.',
    arquitectura: 'Formación en taller (proyecto) como eje, junto a historia, teoría, construcción y ciudad. Cada escuela tiene una mirada distinta sobre el proyecto y el territorio.',
    artes: 'Formación práctica de taller o estudio con fundamentos teóricos e históricos; el portafolio y la creación propia son centrales.',
    ciencias: 'Formación científica rigurosa en ciencias básicas y laboratorio, orientada a la investigación y a la continuidad de estudios (magíster, doctorado).',
    agro: 'Ciencias biológicas y de la tierra aplicadas a producción, recursos naturales, sanidad animal o medio ambiente, con trabajo en terreno.',
  };

  const PERSPECTIVAS_UNIVERSIDAD = {
    'Pontificia Universidad Católica de Chile (PUC)': {
      sello: 'Universidad católica, privada con aporte estatal (G9), muy orientada a la investigación, con currículo flexible y formación general (cursos de formación general obligatorios).',
      areas: {
        ingenieria: 'Ingreso común a “Ingeniería”: Licenciatura en Ciencias de la Ingeniería con sistema de Major (especialidad) y Minor (área complementaria o de profundización). Currículo flexible, vínculo con gestión, innovación y emprendimiento, y elección de especialidad durante la carrera.',
        informatica: 'Ingeniería en Ciencia de la Computación dentro del modelo Major/Minor de Ingeniería UC: flexibilidad curricular, posibilidad de combinar computación con otras áreas (gestión, diseño, datos) y fuerte foco en innovación, emprendimiento e investigación aplicada.',
        medicina: 'Escuela de Medicina con red clínica propia (Red de Salud UC CHRISTUS), énfasis en investigación biomédica y formación con identidad católica.',
        derecho: 'Formación jurídica tradicional y exigente, con cursos de formación general y una mirada humanista cristiana; fuerte presencia en derecho privado y público.',
        negocios: 'Ingeniería Comercial con menciones en Administración o Economía, alta carga cuantitativa y vínculo con investigación económica y empresas.',
        ciencias: 'Facultades de ciencias con investigación de alto nivel; programas tipo College permiten explorar antes de elegir disciplina.',
        arquitectura: 'Escuela de Arquitectura con taller como eje y énfasis en ciudad, paisaje y construcción; vínculo con Diseño y Estudios Urbanos.',
      },
    },
    'Universidad de Chile (UChile)': {
      sello: 'Universidad estatal y pública más antigua del país, con vocación de servicio público, investigación y pensamiento crítico.',
      areas: {
        ingenieria: 'FCFM (Beauchef): Plan Común exigente de ciencias básicas (matemáticas y física) los primeros años antes de elegir especialidad, con alta formación científica, foco en sistemas complejos e investigación.',
        informatica: 'Ingeniería Civil en Computación de la FCFM (Beauchef): primero el Plan Común con formación científico-matemática y física exigente; luego fundamentos profundos de ciencias de la computación (Departamento de Ciencias de la Computación), ingeniería de sistemas complejos e investigación.',
        medicina: 'Facultad de Medicina con fuerte vínculo con la salud pública y el sistema público (Hospital Clínico U. de Chile y red asistencial pública).',
        derecho: 'Escuela de Derecho histórica, con énfasis en derecho público, rol del Estado y clínicas jurídicas de servicio a la comunidad.',
        negocios: 'Facultad de Economía y Negocios (FEN) con fuerte formación en economía, métodos cuantitativos e investigación aplicada a políticas públicas.',
        ciencias: 'Facultad de Ciencias con tradición en investigación básica y licenciaturas orientadas a la ciencia.',
        arquitectura: 'FAU con mirada pública sobre la ciudad, el territorio y la vivienda.',
        sociales: 'Facultades de Ciencias Sociales y de Gobierno con énfasis en políticas públicas e investigación social.',
      },
    },
    'Universidad Técnica Federico Santa María (UTFSM)': {
      sello: 'Universidad privada tradicional (CRUCH) especializada en ingeniería, ciencia y tecnología, con campus en Valparaíso y Santiago.',
      areas: {
        ingenieria: 'Tradición en ingeniería aplicada con laboratorios y talleres desde temprano, formación tecnológica rigurosa y vínculo directo con la industria; en algunos programas hay plan común.',
        informatica: 'Ingeniería Civil Informática con base matemática sólida, foco en software, sistemas y aplicación tecnológica en la industria.',
      },
    },
    'Universidad de Santiago de Chile (USACH)': {
      sello: 'Universidad estatal heredera de la Universidad Técnica del Estado, con tradición en ingeniería, movilidad social y vínculo con el mundo productivo.',
      areas: {
        ingenieria: 'Ingenierías civiles con fuerte componente aplicado e industrial, laboratorios y una larga tradición técnica estatal.',
        informatica: 'Ingeniería Civil en Informática con orientación a desarrollo de software, sistemas y aplicación en la industria, sobre una base de ciencias de la ingeniería.',
      },
    },
    'Universidad Adolfo Ibáñez (UAI)': {
      sello: 'Universidad privada con formación en Artes Liberales (cursos de humanidades y ciencias para todos), énfasis en negocios, liderazgo y emprendimiento; sedes en Santiago y Viña del Mar.',
      areas: {
        ingenieria: 'Ingeniería Civil con plan común y opción de especializarse después, combinada con Artes Liberales, gestión y emprendimiento.',
        negocios: 'Escuela de Negocios reconocida: Ingeniería Comercial e International Management con enfoque práctico, internacional y de liderazgo.',
        informatica: 'Ingeniería en ciencia de datos y computación con orientación a negocios, analítica e innovación.',
      },
    },
    'Universidad Diego Portales (UDP)': {
      sello: 'Universidad privada laica, con énfasis en pensamiento crítico, debate público y vínculo con la ciudad.',
      areas: {
        derecho: 'Derecho con foco en derechos humanos, interés público y análisis crítico del sistema jurídico.',
        comunicaciones: 'Periodismo y comunicación con fuerte presencia en el debate público y la investigación de medios.',
        medicina: 'Escuela de Medicina con formación clínica en red de campos clínicos públicos y privados.',
      },
    },
    'Universidad de los Andes (UANDES)': {
      sello: 'Universidad privada de inspiración católica, con formación personalizada (mentoría o tutorías) y un core curriculum de formación general.',
      areas: {
        medicina: 'Formación clínica vinculada a la Clínica Universidad de los Andes, con acompañamiento cercano y énfasis en la ética de la práctica médica.',
        derecho: 'Derecho con mirada humanista cristiana y opciones de doble titulación (con Filosofía o Historia).',
        ingenieria: 'Ingeniería Civil con plan común y énfasis en formación integral y gestión.',
      },
    },
    'Universidad de Concepción (UdeC)': {
      sello: 'Universidad privada tradicional (CRUCH) con vocación pública, la más importante del sur del país, con fuerte investigación y un campus emblemático en Concepción.',
      areas: {
        ingenieria: 'Facultad de Ingeniería con gran variedad de especialidades (incluida aeroespacial), base científica sólida y vínculo con la industria regional.',
        informatica: 'Ingeniería Civil Informática con base en ciencias de la ingeniería y orientación a software y sistemas.',
        ciencias: 'Fuerte tradición en ciencias, geología, oceanografía y biología marina.',
        medicina: 'Formación clínica en la red asistencial del Biobío, con énfasis regional.',
      },
    },
    'Pontificia Universidad Católica de Valparaíso (PUCV)': {
      sello: 'Universidad católica tradicional (CRUCH) de la región de Valparaíso, con fuerte tradición en ingeniería, educación y ciencias del mar.',
      areas: {
        arquitectura: 'Escuela de Arquitectura y Diseño con una mirada experimental y poética del proyecto (Ciudad Abierta de Ritoque).',
        ingenieria: 'Escuela de Ingeniería con larga tradición regional, formación aplicada y vínculo con el puerto y la industria.',
        educacion: 'Amplia oferta de pedagogías con tradición formadora de profesores.',
      },
    },
    'Universidad de Valparaíso (UV)': {
      sello: 'Universidad estatal de la región de Valparaíso, con tradición en salud, derecho, artes y ciencias del mar.',
      areas: { medicina: 'Formación clínica en hospitales públicos de la región y vocación de servicio público.', artes: 'Cine, teatro y diseño con fuerte vínculo con la escena cultural de Valparaíso.' },
    },
    'Universidad del Desarrollo (UDD)': {
      sello: 'Universidad privada con foco en emprendimiento, innovación y liderazgo; sedes en Santiago y Concepción.',
      areas: { medicina: 'Medicina en convenio con Clínica Alemana, con formación clínica en el sector privado y público.', negocios: 'Negocios con fuerte orientación al emprendimiento y la innovación.' },
    },
    'Universidad Andrés Bello (UNAB)': {
      sello: 'Universidad privada de gran tamaño, con varias sedes (Santiago, Viña del Mar, Concepción) y amplia oferta en salud, ingeniería y negocios.',
      areas: { salud: 'Amplia oferta de carreras de la salud con laboratorios de simulación y campos clínicos en distintas regiones.' },
    },
    'Universidad Austral de Chile (UACh)': {
      sello: 'Universidad privada tradicional (CRUCH) de Valdivia, con fuerte identidad en ciencias, medio ambiente, recursos naturales y el sur de Chile.',
      areas: { agro: 'Referente en ciencias forestales, veterinarias y agrarias, con trabajo en terreno en el sur del país.', ciencias: 'Ciencias biológicas, marinas y ambientales con investigación ligada al territorio.' },
    },
    'Universidad de La Frontera (UFRO)': {
      sello: 'Universidad estatal de Temuco, con foco regional, intercultural (pueblo mapuche) y fuerte área de la salud.',
      areas: { medicina: 'Formación clínica en la Araucanía, con énfasis en salud pública, rural e intercultural.' },
    },
    'Universidad de Talca (UTALCA)': {
      sello: 'Universidad estatal del Maule, con énfasis en innovación, formación por competencias y vínculo con el desarrollo regional.',
      areas: { ingenieria: 'Ingenierías con formación aplicada y vínculo con el sector productivo regional.' },
    },
    'Universidad Católica del Norte (UCN)': {
      sello: 'Universidad católica tradicional (CRUCH) con sedes en Antofagasta y Coquimbo, fuerte en minería, geología y ciencias del mar.',
      areas: { ingenieria: 'Ingenierías ligadas a la minería y los recursos del norte de Chile.', ciencias: 'Geología y biología marina con fuerte trabajo en terreno.' },
    },
    'Universidad Tecnológica Metropolitana (UTEM)': {
      sello: 'Universidad estatal tecnológica, con formación aplicada en ingeniería, diseño y gestión, y vocación de movilidad social.',
      areas: {},
    },
    'Universidad San Sebastián (USS)': {
      sello: 'Universidad privada con sedes en Santiago, Concepción, Valdivia y Puerto Montt, con amplia oferta en salud.',
      areas: {},
    },
    'Universidad de Antofagasta (UA)': {
      sello: 'Universidad estatal de Antofagasta, con foco en salud, minería y ciencias del mar en la zona norte.',
      areas: {},
    },
    'Universidad de La Serena (ULS)': {
      sello: 'Universidad estatal de la región de Coquimbo, con oferta en ingeniería, educación, salud y artes.',
      areas: {},
    },
    'Universidad del Bío-Bío (UBB)': {
      sello: 'Universidad estatal con sedes en Concepción y Chillán, con tradición en arquitectura, construcción en madera, ingeniería y educación.',
      areas: {},
    },
    'Universidad Alberto Hurtado (UAH)': {
      sello: 'Universidad jesuita en el centro de Santiago, con fuerte orientación a las ciencias sociales, humanidades, educación y justicia social.',
      areas: { sociales: 'Ciencias sociales con énfasis en compromiso social, investigación aplicada y trabajo con comunidades.' },
    },
  };

  /** v3 = catálogo con cortes 2026 (se migra una vez en los datos guardados). */
  const VERSION_CATALOGO = 3;

  /* =========================================================
   * PAES (v8) — Prueba de Acceso a la Educación Superior.
   * Fuente: temarios PAES Regular Admisión 2027 (DEMRE – Universidad de Chile, con UCE-Mineduc),
   * publicados el 19-03-2026, y páginas de fechas y preguntas frecuentes de demre.cl
   * (consultadas el 25-11-2026). Los temarios se resumen: el detalle completo está en cada PDF.
   * DEMRE los actualiza en cada proceso de admisión.
   * ========================================================= */
  const PAES = {
    proceso: 'Admisión 2027',
    fuente: 'DEMRE · Temarios PAES Regular Admisión 2027 (publicados el 19-03-2026) y preguntas frecuentes de demre.cl, consultados el 25-11-2026.',
    urlTemarios: 'https://demre.cl/la-prueba/pruebas-y-temarios/presentacion-pruebas-temarios-paes-regular',
    urlFechas: 'https://demre.cl/paes/regular/rendicion/los-dias-de-la-prueba/fechas-horarios',
    urlM2: 'https://demre.cl/publicaciones/2027/universidades-requisito-m2-p2027',
    urlFaq: 'https://demre.cl/mesa-de-ayuda/preguntas-frecuentes-paes-regular',
    queEs: 'La prueba que usan las universidades para seleccionar estudiantes. Mide competencias (comprender, resolver, analizar), no memoria. Puntaje de 100 a 1.000.',
    dinamica: [
      'Para postular necesitas puntaje vigente en Competencia Lectora y Matemática 1 (M1), más al menos una electiva: Ciencias o Historia y Ciencias Sociales. Si rindes ambas electivas, se usa la de mayor puntaje.',
      'Matemática 2 (M2) es electiva: solo la exigen algunas carreras, que le asignan una ponderación mínima de 5 %. Revisa la lista oficial de carreras que la piden.',
      'Estudiantes de 4° medio inscriben obligatoriamente Competencia Lectora, M1 y al menos una electiva. Quienes ya egresaron eligen libremente qué pruebas inscribir.',
      'Cada carrera pondera de forma distinta tu NEM, Ranking y puntajes PAES: un mismo resultado puede rendir más en una carrera que en otra (puedes simularlo en “NEM y Admisión”).',
      'Los puntajes duran dos procesos y se usa tu mejor puntaje de cada prueba. Para la Admisión 2027 cuentan Invierno 2025, Regular 2025, Invierno 2026 y Regular 2026.',
      'Hay una PAES de Invierno (junio) solo para egresados y con cupos limitados, y la PAES Regular (fines de noviembre e inicios de diciembre) para 4° medio y egresados.',
    ],
    calendario: [
      'PAES Regular 2026: lunes 30 de noviembre (reconocimiento de salas 12:00–13:00 y M2 a las 15:00), martes 1 de diciembre (Competencia Lectora 09:00 · Ciencias 15:00) y miércoles 2 de diciembre (M1 09:00 · Historia 15:00).',
      'Resultados: lunes 4 de enero de 2027 a las 08:00. Postulación: del 4 de enero (09:00) al 7 de enero de 2027 (13:00).',
    ],
    pruebas: [
      {
        id: 'cl', nombre: 'Competencia Lectora', caracter: 'Obligatoria', preguntas: '65 preguntas (60 para el puntaje) · 7 textos · 4 opciones', duracion: '2 h 30 min',
        niveles: '7° básico a 2° medio',
        habilidades: 'Localizar, Interpretar y Evaluar información en textos.',
        ejes: [
          { nombre: 'Textos no literarios (expositivos y argumentativos)', temas: ['Información relevante, tema e ideas principales', 'Tesis, argumentos y organización de las ideas', 'Hechos y opiniones; propósito del texto', 'Recursos lingüísticos, retóricos y no lingüísticos (imágenes, gráficos)', 'Estrategias de persuasión: humor, estereotipos, apelación a sentimientos', 'Ideologías, puntos de vista y fallas en la argumentación', 'Relación con otros textos y contextos; suficiencia y consistencia de la información'] },
          { nombre: 'Textos literarios (narraciones)', temas: ['Personajes y personajes tipo', 'Tiempo y espacio del relato', 'Temas y conflicto humano', 'Recursos literarios, símbolos y tópicos', 'Perspectiva del narrador', 'Relación con otros contextos e hipótesis sobre el sentido de la obra'] },
        ],
      },
      {
        id: 'm1', nombre: 'Competencia Matemática 1 (M1)', caracter: 'Obligatoria', preguntas: '65 preguntas (60 para el puntaje) · 4 opciones', duracion: '2 h 20 min',
        niveles: '7° básico a 2° medio',
        habilidades: 'Resolver problemas, Modelar, Representar y Argumentar.',
        ejes: [
          { nombre: 'Números', temas: ['Enteros y racionales: operaciones y orden', 'Porcentaje', 'Potencias de base racional y exponente racional', 'Raíces enésimas'] },
          { nombre: 'Álgebra y funciones', temas: ['Productos notables, factorización y expresiones algebraicas', 'Proporcionalidad directa e inversa', 'Ecuaciones e inecuaciones lineales; sistemas 2×2', 'Función lineal y afín', 'Ecuación de segundo grado y función cuadrática (vértice, ceros, intersecciones)'] },
          { nombre: 'Geometría', temas: ['Teorema de Pitágoras', 'Perímetro y área de triángulos, paralelogramos, trapecios y círculos', 'Área y volumen de paralelepípedos, cubos y cilindros', 'Puntos y vectores; rotación, traslación y reflexión', 'Semejanza y proporcionalidad (modelos a escala)'] },
          { nombre: 'Probabilidad y estadística', temas: ['Tablas de frecuencia y gráficos', 'Promedio, cuartiles y percentiles; diagrama de cajón', 'Probabilidad de un evento', 'Reglas aditiva y multiplicativa'] },
        ],
      },
      {
        id: 'm2', nombre: 'Competencia Matemática 2 (M2)', caracter: 'Electiva (la exigen algunas carreras)', preguntas: '55 preguntas (50 para el puntaje) · 4 o 5 opciones · incluye suficiencia de datos', duracion: '2 h 20 min',
        niveles: '7° básico a 4° medio (incluye todo lo de M1)',
        habilidades: 'Resolver problemas, Modelar, Representar y Argumentar, con mayor profundidad.',
        ejes: [
          { nombre: 'Números', temas: ['Operaciones con números reales', 'Matemática financiera: AFP y jubilación, créditos hipotecarios y de consumo', 'Logaritmos'] },
          { nombre: 'Álgebra y funciones', temas: ['Sistemas 2×2: solución única, infinitas soluciones o sin solución', 'Funciones potencia, exponencial y logarítmica', 'Funciones seno y coseno'] },
          { nombre: 'Geometría', temas: ['Homotecia', 'Razones trigonométricas (seno, coseno, tangente)', 'Ángulos, arcos, cuerdas y secantes en la circunferencia', 'Superficie y volumen de la esfera', 'Rectas en el plano y sus posiciones relativas'] },
          { nombre: 'Probabilidad y estadística', temas: ['Medidas de dispersión', 'Probabilidad condicional', 'Permutaciones y combinatoria', 'Modelo binomial', 'Distribución normal'] },
        ],
      },
      {
        id: 'ciencias', nombre: 'Ciencias', caracter: 'Electiva', preguntas: '80 preguntas (75 para el puntaje): 54 del Módulo Común + 26 del Módulo Electivo o Técnico-Profesional · 4 o 5 opciones', duracion: '2 h 40 min',
        niveles: 'Según el temario de cada módulo (ver PDF oficial)',
        habilidades: 'Observar y plantear preguntas, planificar y conducir una investigación, procesar y analizar evidencia, evaluar y comunicar.',
        nota: 'Quien egresa de la formación Científico-Humanista rinde el Módulo Común + un Módulo Electivo (Biología, Física o Química). Quien egresa de la formación Técnico-Profesional rinde el Módulo Técnico-Profesional, con preguntas de las tres disciplinas de la formación general de 1° y 2° medio. Cada eje incluye algunos contenidos que solo se evalúan en el Módulo Electivo: revisa el temario oficial para el detalle.',
        ejes: [
          { nombre: 'Biología', temas: ['Organelos y relación estructura–función de la célula', 'Sistema nervioso: impulso nervioso, sinapsis, arco reflejo y efecto de drogas', 'Reproducción y sexualidad: gametos, fecundación, ciclo ovárico y uterino, anticoncepción, ITS', 'Ciclo celular, mitosis y meiosis; manipulación genética', 'Evolución: evidencias, Lamarck, Darwin y Wallace, selección natural', 'Fotosíntesis, respiración celular y flujo de energía'] },
          { nombre: 'Física', temas: ['Ondas y luz: reflexión, refracción, efecto Doppler, espectro electromagnético y color', 'Espejos, lentes y dispositivos tecnológicos', 'Cinemática (MRU y MRUA) y relatividad de Galileo', 'Leyes de Newton y fuerzas: peso, elástica, normal y roce', 'Modelos cosmológicos y origen del universo', 'Tierra: deriva continental, tectónica de placas y sismos', 'Electricidad: ley de Ohm, circuitos en serie, paralelo y mixtos, potencia, instalación domiciliaria'] },
          { nombre: 'Química', temas: ['Clasificación de la materia y separación de mezclas', 'Modelos atómicos (de Dalton a Bohr), número atómico y másico', 'Química del carbono: hibridación, enlaces, representaciones, hidrocarburos y grupos funcionales (IUPAC)', 'Leyes ponderales, balance de ecuaciones, mol, reactivo limitante, fórmula empírica y molecular', 'Soluciones: unidades de concentración (M, m, fracción molar, % m/m, ppm), dilución y solubilidad'] },
        ],
      },
      {
        id: 'historia', nombre: 'Historia y Ciencias Sociales', caracter: 'Electiva', preguntas: '65 preguntas (60 para el puntaje) · 4 opciones', duracion: '2 h',
        niveles: 'Enseñanza media',
        habilidades: 'Pensamiento temporal y espacial, análisis de fuentes y pensamiento crítico.',
        ejes: [
          { nombre: 'Historia: mundo, América y Chile', temas: ['Estado-nación e ideas liberales y republicanas en el siglo XIX', 'Formación de la República de Chile e inserción económica en el siglo XIX', 'Crisis del Estado liberal: totalitarismos, populismo y Estado de bienestar', 'Orden de posguerra (ONU, derechos humanos), Guerra Fría y América Latina', 'Chile a mediados del siglo XX: pobreza, migración campo–ciudad y democratización', 'Golpe de Estado de 1973, modelo neoliberal, violaciones a los DD. HH. y recuperación de la democracia'] },
          { nombre: 'Formación ciudadana', temas: ['Democracia: fundamentos y dimensiones', 'Institucionalidad democrática chilena', 'Medios de comunicación y nuevas tecnologías', 'Sistema judicial y acceso a la justicia'] },
          { nombre: 'Sistema económico', temas: ['Funcionamiento del mercado y sus alteraciones', 'Relación entre Estado y mercado', 'Modelos de desarrollo y sus impactos', 'Derechos laborales: instituciones, movimientos sociales y tendencias globales'] },
        ],
      },
    ],
  };

  /* =========================================================
   * CONVERSIÓN DE ENSAYOS PAES (v13) — tablas OFICIALES de DEMRE
   * “Tabla de transformación de puntaje” de los Clavijeros publicados en demre.cl.
   * Cada arreglo es el Puntaje PAES según el Puntaje P (respuestas correctas en preguntas que
   * puntúan): posición 0 = 0 correctas, posición 1 = 1 correcta, etc. Sin descuento por erradas.
   * DEMRE hace una tabla distinta para cada aplicación: la conversión de un ensayo es una
   * referencia (otro ensayo o la PAES real pueden convertir distinto el mismo número de correctas).
   * ========================================================= */
  const ESCALAS_PAES = [
    {
      id: 'inv2026',
      etiqueta: 'DEMRE · PAES de Invierno 2026 (Admisión 2027)',
      fuente: 'Clavijeros PAES de Invierno 2026, Proceso de Admisión 2027 (DEMRE, publicados el 17-07-2026): tabla de transformación de puntaje de cada prueba.',
      url: 'https://demre.cl/publicaciones/2027/pruebas-oficiales-paes-invierno-p2027',
      tablas: {
        cl: [100, 149, 172, 193, 214, 234, 253, 269, 284, 298, 313, 330, 347, 361, 373, 383, 393, 404, 417, 432, 447, 461, 472, 480, 487, 495, 504, 516, 531, 546, 560, 571, 580, 587, 594, 603, 614, 629, 644, 659, 671, 680, 689, 699, 711, 725, 741, 758, 772, 786, 799, 814, 832, 852, 871, 892, 913, 936, 963, 991, 1000],
        m1: [100, 173, 196, 216, 236, 255, 273, 290, 305, 318, 331, 345, 360, 375, 389, 399, 408, 417, 426, 438, 452, 467, 480, 490, 498, 504, 511, 519, 530, 543, 558, 571, 582, 590, 597, 603, 611, 622, 635, 650, 664, 676, 685, 694, 704, 716, 730, 746, 761, 775, 789, 804, 821, 840, 860, 880, 903, 927, 955, 986, 1000],
        m2: [100, 204, 231, 255, 278, 298, 317, 336, 354, 371, 386, 399, 412, 426, 441, 456, 470, 481, 491, 501, 512, 525, 540, 553, 565, 574, 583, 592, 603, 616, 630, 644, 656, 666, 676, 687, 699, 714, 729, 744, 757, 770, 785, 801, 819, 837, 856, 876, 898, 1000],
        historia: [100, 132, 158, 181, 203, 224, 244, 263, 279, 294, 308, 324, 341, 357, 372, 383, 393, 402, 413, 426, 441, 457, 471, 482, 490, 497, 504, 513, 525, 539, 555, 569, 581, 590, 597, 604, 612, 623, 637, 653, 668, 681, 692, 701, 711, 722, 736, 753, 770, 785, 799, 814, 829, 848, 868, 888, 910, 932, 957, 985, 1000],
        ciencias_biologia: [100, 129, 151, 172, 192, 211, 227, 242, 255, 270, 284, 299, 311, 322, 330, 339, 349, 360, 374, 386, 397, 405, 412, 417, 422, 429, 439, 450, 463, 475, 485, 491, 496, 500, 504, 509, 516, 525, 537, 550, 562, 571, 577, 582, 586, 590, 595, 603, 613, 625, 638, 649, 658, 665, 670, 676, 683, 692, 704, 717, 730, 741, 751, 760, 770, 782, 796, 812, 827, 842, 857, 875, 895, 916, 939, 1000],
        ciencias_fisica: [100, 126, 149, 169, 189, 208, 224, 239, 253, 267, 281, 296, 309, 320, 328, 337, 346, 358, 371, 384, 395, 404, 410, 416, 421, 427, 436, 448, 460, 473, 483, 490, 495, 499, 503, 508, 514, 523, 535, 548, 560, 569, 576, 581, 585, 589, 594, 601, 611, 623, 636, 648, 657, 664, 669, 675, 682, 691, 703, 716, 729, 740, 750, 759, 769, 781, 796, 811, 826, 841, 857, 874, 894, 915, 939, 1000],
        ciencias_quimica: [100, 124, 147, 168, 187, 206, 222, 237, 250, 264, 278, 293, 306, 317, 326, 334, 343, 353, 366, 379, 391, 401, 408, 413, 418, 424, 432, 442, 454, 467, 478, 487, 493, 497, 501, 505, 510, 518, 528, 541, 553, 564, 573, 579, 583, 587, 591, 597, 606, 617, 629, 642, 652, 660, 667, 672, 679, 687, 697, 710, 724, 736, 746, 756, 766, 777, 791, 807, 822, 837, 853, 871, 890, 912, 935, 1000],
        ciencias_tp: [100, 128, 151, 172, 191, 210, 226, 241, 255, 269, 284, 298, 311, 321, 330, 339, 349, 361, 374, 387, 397, 406, 412, 417, 423, 430, 440, 452, 465, 477, 486, 492, 497, 501, 505, 511, 518, 529, 541, 554, 565, 573, 579, 583, 587, 592, 598, 607, 619, 632, 644, 654, 662, 668, 673, 680, 689, 700, 713, 726, 738, 748, 758, 768, 780, 794, 809, 824, 840, 855, 873, 892, 914, 937, 1000],
      },
    },
    {
      id: 'reg2025',
      etiqueta: 'DEMRE · PAES Regular 2025 (Admisión 2026)',
      fuente: 'Clavijeros PAES Regular aplicada en diciembre de 2025, Proceso de Admisión 2026 (DEMRE, publicados el 05-01-2026): tabla de transformación de puntaje de cada prueba.',
      url: 'https://demre.cl/publicaciones/2026/pruebas-oficiales-paes-regular-p2026',
      tablas: {
        cl: [100, 159, 184, 206, 228, 249, 267, 284, 299, 316, 333, 350, 364, 376, 387, 397, 410, 424, 440, 455, 467, 477, 484, 492, 500, 511, 525, 540, 555, 567, 576, 583, 590, 597, 607, 619, 634, 650, 663, 674, 682, 690, 699, 710, 725, 740, 756, 770, 782, 794, 808, 823, 841, 860, 878, 896, 916, 938, 963, 989, 1000],
        m1: [100, 170, 194, 216, 236, 256, 275, 292, 307, 320, 334, 349, 365, 380, 393, 403, 412, 421, 432, 446, 460, 474, 486, 495, 502, 508, 516, 526, 539, 553, 567, 579, 587, 595, 601, 609, 618, 631, 645, 660, 672, 682, 690, 699, 710, 723, 738, 753, 767, 780, 793, 807, 824, 842, 861, 880, 900, 923, 948, 975, 1000],
        m2: [100, 196, 223, 248, 271, 292, 312, 330, 349, 366, 382, 396, 409, 423, 438, 453, 467, 479, 489, 499, 511, 524, 538, 552, 564, 574, 583, 592, 603, 617, 631, 645, 657, 667, 677, 688, 701, 716, 731, 746, 759, 772, 786, 803, 821, 838, 857, 876, 897, 1000],
        historia: [100, 117, 145, 169, 191, 212, 233, 253, 270, 286, 300, 314, 331, 348, 364, 377, 387, 397, 406, 418, 432, 447, 463, 476, 486, 493, 500, 508, 517, 530, 545, 561, 574, 585, 593, 600, 607, 616, 628, 643, 659, 673, 686, 695, 705, 714, 727, 742, 759, 775, 790, 804, 818, 835, 853, 874, 894, 915, 938, 964, 1000],
        ciencias_biologia: [100, 115, 140, 162, 182, 202, 219, 235, 249, 263, 278, 292, 306, 317, 327, 335, 344, 355, 368, 381, 393, 402, 409, 415, 420, 426, 435, 446, 458, 471, 481, 489, 495, 499, 503, 507, 513, 522, 533, 546, 558, 568, 575, 580, 584, 588, 593, 600, 609, 621, 634, 646, 655, 663, 668, 674, 680, 689, 700, 713, 726, 738, 748, 757, 766, 777, 791, 806, 821, 836, 851, 868, 886, 907, 929, 1000],
        ciencias_fisica: [100, 116, 140, 163, 183, 203, 220, 236, 250, 264, 279, 294, 308, 319, 328, 337, 346, 358, 371, 384, 395, 404, 411, 416, 422, 429, 438, 450, 463, 475, 484, 491, 496, 500, 504, 509, 516, 526, 538, 551, 562, 571, 577, 582, 586, 590, 595, 603, 613, 625, 638, 649, 658, 664, 670, 675, 682, 691, 703, 716, 729, 740, 750, 758, 768, 780, 793, 808, 823, 838, 853, 869, 888, 908, 930, 1000],
        ciencias_quimica: [100, 113, 138, 160, 180, 199, 217, 232, 246, 260, 274, 289, 303, 315, 324, 332, 341, 351, 363, 376, 389, 399, 407, 412, 417, 423, 430, 439, 451, 464, 476, 485, 492, 497, 500, 504, 509, 516, 525, 537, 550, 561, 570, 577, 582, 585, 589, 595, 602, 612, 624, 637, 649, 658, 664, 670, 676, 683, 692, 704, 718, 731, 742, 752, 761, 771, 784, 799, 814, 830, 845, 862, 880, 900, 923, 1000],
        ciencias_tp: [100, 117, 142, 164, 184, 204, 221, 236, 251, 265, 279, 294, 308, 319, 328, 336, 346, 357, 370, 383, 394, 403, 410, 415, 420, 427, 435, 446, 459, 471, 482, 489, 495, 499, 502, 507, 512, 521, 532, 544, 556, 567, 574, 580, 584, 587, 592, 598, 606, 618, 630, 643, 653, 661, 667, 672, 678, 686, 696, 708, 722, 734, 745, 754, 763, 774, 787, 802, 817, 832, 847, 864, 882, 903, 925, 1000],
      },
    },
  ].map(e => ({ ...e, tablas: Object.fromEntries(Object.entries(e.tablas).map(([k, v]) => [k, v.map((p, c) => [c, p])])) }));

  /*
   * M2 (v14): en las dos aplicaciones cargadas DEMRE eliminó 1 pregunta, así que la tabla oficial
   * llega a 49 correctas = 1.000 puntos. La prueba tiene 50 preguntas que puntúan: para que un
   * ensayo con las 50 válidas se pueda registrar, 50 correctas también equivalen al máximo (1.000).
   */
  for (const e of ESCALAS_PAES) {
    const t = e.tablas.m2;
    if (t && t.at(-1)[0] === 49 && t.at(-1)[1] === 1000) { t.push([50, 1000]); e.notaM2 = 'En esta aplicación DEMRE eliminó 1 pregunta de M2: con 49 correctas ya se obtiene el máximo (1.000). Si tu ensayo tiene las 50 preguntas válidas, 50 correctas también son 1.000.'; }
  }

  /** Pruebas que se registran como ensayo y el puntaje del simulador al que corresponden. */
  const PRUEBAS_ENSAYO = [
    { id: 'cl', nombre: 'Competencia Lectora', componente: 'cl' },
    { id: 'm1', nombre: 'Matemática M1', componente: 'm1' },
    { id: 'm2', nombre: 'Matemática M2', componente: 'm2' },
    { id: 'ciencias_biologia', nombre: 'Ciencias · Biología', componente: 'ciencias' },
    { id: 'ciencias_fisica', nombre: 'Ciencias · Física', componente: 'ciencias' },
    { id: 'ciencias_quimica', nombre: 'Ciencias · Química', componente: 'ciencias' },
    { id: 'ciencias_tp', nombre: 'Ciencias · Técnico-Profesional', componente: 'ciencias' },
    { id: 'historia', nombre: 'Historia y Cs. Sociales', componente: 'historia' },
  ];

  /* =========================================================
   * UNIVERSIDADES (v14): sitio web oficial y tipo (estatal / privada).
   * Incluye todas las del catálogo de carreras y las de las listas del Perfil.
   * Sitios comprobados el 26-11-2026 (todos respondieron; la U. Autónoma redirige a https).
   * ========================================================= */
  const UNIVERSIDADES_INFO = [
    ['Universidad de Chile (UChile)', 'https://www.uchile.cl', 'Estatal'],
    ['Pontificia Universidad Católica de Chile (PUC)', 'https://www.uc.cl', 'Privada'],
    ['Universidad de Concepción (UdeC)', 'https://www.udec.cl', 'Privada'],
    ['Universidad Técnica Federico Santa María (UTFSM)', 'https://usm.cl', 'Privada'],
    ['Universidad de Santiago de Chile (USACH)', 'https://www.usach.cl', 'Estatal'],
    ['Pontificia Universidad Católica de Valparaíso (PUCV)', 'https://www.pucv.cl', 'Privada'],
    ['Universidad Austral de Chile (UACh)', 'https://www.uach.cl', 'Privada'],
    ['Universidad de Valparaíso (UV)', 'https://www.uv.cl', 'Estatal'],
    ['Universidad de La Frontera (UFRO)', 'https://www.ufro.cl', 'Estatal'],
    ['Universidad Católica del Norte (UCN)', 'https://www.ucn.cl', 'Privada'],
    ['Universidad de Talca (UTALCA)', 'https://www.utalca.cl', 'Estatal'],
    ['Universidad de Antofagasta (UA)', 'https://www.uantof.cl', 'Estatal'],
    ['Universidad de La Serena (ULS)', 'https://www.userena.cl', 'Estatal'],
    ['Universidad del Bío-Bío (UBB)', 'https://www.ubiobio.cl', 'Estatal'],
    ['Universidad Tecnológica Metropolitana (UTEM)', 'https://www.utem.cl', 'Estatal'],
    ['Universidad de Magallanes (UMAG)', 'https://umag.cl', 'Estatal'],
    ['Universidad Arturo Prat (UNAP)', 'https://www.unap.cl', 'Estatal'],
    ['Universidad Adolfo Ibáñez (UAI)', 'https://www.uai.cl', 'Privada'],
    ['Universidad Diego Portales (UDP)', 'https://www.udp.cl', 'Privada'],
    ['Universidad Andrés Bello (UNAB)', 'https://www.unab.cl', 'Privada'],
    ['Universidad de los Andes (UANDES)', 'https://www.uandes.cl', 'Privada'],
    ['Universidad del Desarrollo (UDD)', 'https://www.udd.cl', 'Privada'],
    ['Universidad Alberto Hurtado (UAH)', 'https://www.uahurtado.cl', 'Privada'],
    ['Universidad San Sebastián (USS)', 'https://www.uss.cl', 'Privada'],
    ['Universidad Mayor (UMayor)', 'https://www.umayor.cl', 'Privada'],
    ['Universidad Finis Terrae (UFT)', 'https://finis.cl', 'Privada'],
    ['Universidad Autónoma de Chile', 'https://www.uautonoma.cl', 'Privada'],
    ['Universidad Central de Chile (UCEN)', 'https://www.ucentral.cl', 'Privada'],
    ['Universidad Católica de la Santísima Concepción (UCSC)', 'https://ucsc.cl', 'Privada'],
    ['Universidad Católica de Temuco (UCT)', 'https://www.uct.cl', 'Privada'],
  ].map(([nombre, url, tipo]) => ({ nombre, url, tipo }));

  /* =========================================================
   * FECHAS CLAVE (v9): feriados nacionales de Chile e hitos de referencia.
   * Feriados calculados según las leyes vigentes (traslados de San Pedro y San Pablo y del
   * Encuentro de Dos Mundos al lunes más cercano; Pueblos Indígenas = día del solsticio de
   * invierno). Son REFERENCIALES: una ley nueva (p. ej. elecciones) puede agregar o mover
   * feriados. Cada perfil recibe una copia que el estudiante puede editar o borrar.
   * ========================================================= */
  const FUENTE_FECHAS = 'Feriados nacionales según la legislación vigente (referencial, sin feriados regionales). Fin del año escolar 2026 según el calendario escolar del Mineduc informado en prensa (varía por región y jornada). PAES: calendario DEMRE.';
  const FERIADOS_CHILE = [
    ['2026-12-08', 'Inmaculada Concepción'], ['2026-12-25', 'Navidad'],
    ['2027-01-01', 'Año Nuevo'], ['2027-03-26', 'Viernes Santo'], ['2027-03-27', 'Sábado Santo'],
    ['2027-05-01', 'Día Nacional del Trabajo'], ['2027-05-21', 'Día de las Glorias Navales'],
    ['2027-06-21', 'Día Nacional de los Pueblos Indígenas'], ['2027-06-28', 'San Pedro y San Pablo'],
    ['2027-07-16', 'Día de la Virgen del Carmen'], ['2027-08-15', 'Asunción de la Virgen'],
    ['2027-09-18', 'Independencia Nacional'], ['2027-09-19', 'Día de las Glorias del Ejército'],
    ['2027-10-11', 'Encuentro de Dos Mundos'], ['2027-10-31', 'Día de las Iglesias Evangélicas y Protestantes'],
    ['2027-11-01', 'Día de Todos los Santos'], ['2027-12-08', 'Inmaculada Concepción'], ['2027-12-25', 'Navidad'],
  ].map(([fecha, nombre]) => ({ id: `fer-${fecha}`, fecha, nombre, tipo: 'feriado' }));

  /** Hitos de referencia; los de fin de semestre o de año escolar dependen de cada colegio: edítalos. */
  const HITOS_REFERENCIA = [
    { id: 'hito-fin-anio-2026', fecha: '2026-12-04', nombre: 'Fin del año escolar 2026 (con JEC; sin JEC: 18-12)', tipo: 'hito', nota: 'Referencial: confirma la fecha de tu colegio y región.' },
    { id: 'hito-fin-semestre', fecha: '', nombre: 'Fin del semestre', tipo: 'hito', nota: 'Escribe la fecha de tu colegio o universidad.' },
    { id: 'paes-2026-m2', fecha: '2026-11-30', nombre: 'PAES Regular: M2', tipo: 'hito' },
    { id: 'paes-2026-cl', fecha: '2026-12-01', nombre: 'PAES Regular: Competencia Lectora y Ciencias', tipo: 'hito' },
    { id: 'paes-2026-m1', fecha: '2026-12-02', nombre: 'PAES Regular: M1 e Historia', tipo: 'hito' },
    { id: 'paes-2027-resultados', fecha: '2027-01-04', nombre: 'Resultados PAES y comienzo de postulaciones', tipo: 'hito' },
  ];
  /** Sube al agregar fechas de referencia nuevas (se suman a los perfiles sin pisar lo editado). */
  const VERSION_FECHAS = 1;

  /* =========================================================
   * FRASE DEL DÍA (v4, ampliada en v8)
   * - Textos propios: cadenas simples, sin autor.
   * - Citas (v8): objetos { texto, autor, obra }. Solo citas de atribución reconocida;
   *   las traducciones al español son libres y `obra` indica de dónde provienen.
   * La app elige una por fecha (Calc.indiceDiario) para que cambie cada día.
   * ========================================================= */
  const CITAS = [
    { texto: 'No es que tengamos poco tiempo, sino que perdemos mucho.', autor: 'Séneca', obra: 'De la brevedad de la vida' },
    { texto: 'Mientras enseñamos, aprendemos.', autor: 'Séneca', obra: 'Cartas a Lucilio, 7' },
    { texto: 'Lo que hay que aprender a hacer, lo aprendemos haciéndolo.', autor: 'Aristóteles', obra: 'Ética a Nicómaco, libro II' },
    { texto: 'El comienzo es la parte más importante de cualquier obra.', autor: 'Platón', obra: 'La República, libro II' },
    { texto: 'Aprender sin pensar es inútil; pensar sin aprender es peligroso.', autor: 'Confucio', obra: 'Analectas, 2.15' },
    { texto: 'Primero dite a ti mismo qué quieres ser; luego haz lo que tengas que hacer.', autor: 'Epicteto', obra: 'Disertaciones, libro III' },
    { texto: 'Ninguna gran cosa se produce de repente.', autor: 'Epicteto', obra: 'Disertaciones, libro I' },
    { texto: 'Lo que se interpone en el camino se convierte en el camino.', autor: 'Marco Aurelio', obra: 'Meditaciones, 5.20' },
    { texto: 'La mente no es un vaso que haya que llenar, sino un fuego que hay que encender.', autor: 'Plutarco', obra: 'Sobre cómo se debe escuchar (paráfrasis)' },
    { texto: 'Atrévete a saber.', autor: 'Horacio', obra: 'Epístolas, I.2 («Sapere aude»)' },
    { texto: 'La gota horada la piedra.', autor: 'Ovidio', obra: 'Pónticas, IV.10' },
    { texto: '¡Ten el valor de servirte de tu propio entendimiento!', autor: 'Immanuel Kant', obra: '¿Qué es la Ilustración? (1784)' },
    { texto: 'Más vale una cabeza bien hecha que una cabeza bien llena.', autor: 'Michel de Montaigne', obra: 'Ensayos, I.26' },
    { texto: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', autor: 'Miguel de Cervantes', obra: 'Don Quijote, II parte, cap. 25' },
    { texto: 'Caminante, no hay camino, se hace camino al andar.', autor: 'Antonio Machado', obra: 'Campos de Castilla' },
    { texto: 'Si he visto más lejos, es porque estoy sobre los hombros de gigantes.', autor: 'Isaac Newton', obra: 'Carta a Robert Hooke (1676)' },
    { texto: 'Todo ser humano puede ser, si se lo propone, escultor de su propio cerebro.', autor: 'Santiago Ramón y Cajal', obra: 'Reglas y consejos sobre investigación científica' },
    { texto: 'Hay que tener perseverancia y, sobre todo, confianza en uno mismo.', autor: 'Marie Curie', obra: 'citada en «La vida de Madame Curie», de Ève Curie' },
    { texto: 'Lo importante es no dejar de hacerse preguntas.', autor: 'Albert Einstein', obra: 'entrevista en LIFE (1955)' },
    { texto: 'El primer principio es que no debes engañarte a ti mismo, y tú eres la persona más fácil de engañar.', autor: 'Richard Feynman', obra: 'discurso «Cargo Cult Science» (1974)' },
    { texto: 'La ciencia es más que un cuerpo de conocimientos: es una forma de pensar.', autor: 'Carl Sagan', obra: 'entrevista (1996)' },
    { texto: 'Enseñar no es transferir conocimiento, sino crear las posibilidades para su propia producción o construcción.', autor: 'Paulo Freire', obra: 'Pedagogía de la autonomía' },
    { texto: 'La educación es el arma más poderosa que puedes usar para cambiar el mundo.', autor: 'Nelson Mandela', obra: 'discurso (2003)' },
    { texto: 'Un niño, un profesor, un libro y un lápiz pueden cambiar el mundo.', autor: 'Malala Yousafzai', obra: 'discurso ante la ONU (2013)' },
  ];

  /**
   * Frases propias para perfiles UNIVERSITARIOS (v8): el foco pasa de “entrar a la carrera”
   * a la formación profesional y al ejercicio futuro.
   */
  const FRASES_UNI = [
    'Cada ramo que apruebas es una herramienta que vas a usar con personas reales.',
    'El título se entrega un día; el criterio profesional se construye en cada certamen.',
    'Lo que hoy parece un ramo más, mañana será la base de una decisión profesional.',
    'Estudia para entender, no solo para aprobar: tu futuro equipo lo va a notar.',
    'La ayudantía de hoy es la reunión de trabajo de mañana: aprovéchala.',
    'Tu malla es larga, pero se recorre semestre a semestre.',
    'Un buen profesional no lo sabe todo: sabe dónde buscar y cómo aprender rápido.',
    'Los ramos difíciles son los que más te distinguen después.',
    'Organizar tu semestre es la primera práctica de gestión de tu carrera.',
    'Pregunta en clases: quienes más aprenden suelen ser quienes más preguntan.',
    'La práctica profesional se prepara desde primer año.',
    'Tu formación también se mide en ética, trabajo en equipo y responsabilidad.',
  ];

  const FRASES = [
    'No necesitas estudiar todo hoy. Necesitas estudiar algo hoy.',
    'Una nota no te define: te informa. Úsala como dato, no como juicio.',
    'Veinticinco minutos de foco real valen más que tres horas con el celular al lado.',
    'Lo que repasas mañana se queda; lo que lees una sola vez se va.',
    'Equivocarte en la guía es barato. Equivocarte en la prueba es caro. Practica donde sale barato.',
    'Si no puedes explicarlo con tus palabras, todavía no lo sabes: vuelve una vez más.',
    'La constancia aburrida le gana al entusiasmo de un día.',
    'Empieza por lo que más te cuesta, cuando todavía tienes energía.',
    'Tu yo de la semana de pruebas te va a agradecer lo que hagas hoy.',
    'Pedir ayuda a tiempo es una estrategia, no una debilidad.',
    'No compares tu capítulo 3 con el capítulo 20 de otra persona.',
    'Dormir bien también es estudiar: ahí se ordena lo que aprendiste.',
    'Un mal resultado es el mejor mapa de lo que te falta repasar.',
    'Hazlo imperfecto, pero hazlo. Después lo mejoras.',
    'La motivación va y viene; el hábito se queda. Construye el hábito.',
    'Cierra una pestaña, guarda el celular y dale diez minutos. Casi siempre después siguen veinte.',
    'Subir una décima por evaluación, todo el semestre, es subir mucho.',
    'Aprender cuesta porque estás creciendo, no porque no sirvas para esto.',
    'Pregúntate sin mirar los apuntes. Lo que no recuerdes es justo lo que tienes que estudiar.',
    'El “todavía” cambia todo: no lo entiendo todavía.',
    'Una hora planificada rinde como dos improvisadas.',
    'Tu esfuerzo de hoy no se ve en la nota de mañana, pero sí en la del mes que viene.',
    'No hace falta sentirse listo para empezar. Empezar es lo que te deja listo.',
    'Celebra los avances chicos: son los que sostienen los grandes.',
    'Si una materia te cuesta, dale más tiempo, no más culpa.',
    'Los ejercicios que te salen mal son los que más te enseñan.',
    'Estudiar con un objetivo concreto (“hoy domino derivadas”) rinde más que “hoy estudio Mate”.',
    'Descansar no es rendirse. Es recargar para volver mejor.',
    'Lo difícil de hoy es lo básico de mañana.',
    'Tu promedio es la suma de muchos días normales, no de un día heroico.',
    'Revisa tus errores con curiosidad, no con rabia.',
    'Un resumen hecho por ti vale más que diez fotos de la pizarra.',
    'Cuando te bloquees, cambia de ejercicio, no de actitud.',
    'La disciplina es elegir lo que quieres más por sobre lo que quieres ahora.',
    'Hoy basta con un paso más que ayer.',
    'Llegar preparado a una prueba se siente distinto. Ese día se gana antes.',
    'No estudies hasta que te salga una vez: estudia hasta que no te salga mal.',
    'Explicarle la materia a alguien es la forma más rápida de descubrir qué no sabes.',
    'Las metas grandes se cumplen con tareas chicas anotadas en una lista.',
    'Tu ritmo es válido. Lo importante es no detenerte.',
    'Equivocarte es parte del proceso; rendirte no tiene por qué serlo.',
    'Una semana ordenada empieza con quince minutos de planificación el domingo.',
    'Haz hoy el ejercicio que estás evitando. Probablemente era más corto de lo que pensabas.',
    'Lo que practicas con tiempo controlado deja de asustarte el día de la prueba.',
    'Confía en el proceso, pero revísalo: si algo no funciona, cámbialo.',
    'Aprender es acumulativo: nada de lo que estudias bien se pierde.',
    'Tu valor no cabe en una escala del 1 al 7.',
    'El cansancio se pasa con descanso; la duda, con práctica.',
  ];

  /* =========================================================
   * GUÍA PARA LA PRÓXIMA EVALUACIÓN (v4) — válida para cualquier materia.
   * enfoques: texto según la situación de la asignatura.
   * consejos: estrategias accionables; `para` indica en qué situaciones se priorizan
   *           (vacío = universal). `check` es la tarea que se envía al checklist.
   * ========================================================= */
  const GUIA_EVALUACION = {
    enfoques: {
      base: {
        titulo: 'Construye una base sólida desde la primera evaluación',
        texto: 'La primera evaluación marca el tono. Empieza temprano y llega con práctica, no solo lectura.',
      },
      consolidar: {
        titulo: 'Consolida y evita errores por exceso de confianza',
        texto: 'Vas bien. El riesgo es confiarte: mantén la rutina y revisa con calma cada respuesta.',
      },
      subir: {
        titulo: 'Sube el ritmo con práctica activa y buena gestión del tiempo',
        texto: 'Necesitas subir, y se puede: ejercicios tipo prueba, temas que más pesan y práctica con reloj.',
      },
      recuperar: {
        titulo: 'Maximiza cada evaluación que queda',
        texto: 'Cada décima suma. Asegura los puntos fáciles y pregunta a tu profesor por recuperaciones.',
      },
      cerrada: {
        titulo: 'Usa este cierre como punto de partida',
        texto: 'Ya no quedan evaluaciones. Anota qué te funcionó para el próximo período.',
      },
    },
    consejos: [
      { id: 'autoeval', titulo: 'Práctica activa', texto: 'Respóndete preguntas sin mirar los apuntes. Recordar cuesta más que releer, y justamente por eso fija mejor.', check: 'Autoevaluarme sin apuntes y anotar lo que no recordé', para: [] },
      { id: 'feynman', titulo: 'Explícalo en voz alta', texto: 'Explica cada tema como si se lo enseñaras a alguien (técnica Feynman). Donde te trabas, ahí está el vacío.', check: 'Explicar en voz alta los temas principales', para: [] },
      { id: 'espaciado', titulo: 'Repaso espaciado', texto: 'Haz un repaso corto 48 h antes y otro 24 h antes, en lugar de una maratón la noche anterior.', check: 'Repaso corto 48 h y 24 h antes de la evaluación', para: [] },
      { id: 'simulacro', titulo: 'Simulacro con tiempo real', texto: 'Resuelve una prueba o guía completa con el mismo tiempo que tendrás. Así entrenas el ritmo y bajas la ansiedad.', check: 'Hacer un simulacro con tiempo real', para: ['subir', 'recuperar', 'base'] },
      { id: 'temario', titulo: 'Arma tu temario', texto: 'Pide o reconstruye la lista de contenidos que entran y marca cuáles dominas, cuáles a medias y cuáles no.', check: 'Listar contenidos y marcar dominio (sí / a medias / no)', para: ['base', 'subir'] },
      { id: 'errores', titulo: 'Revisa tus errores anteriores', texto: 'Vuelve a tus pruebas y guías corregidas: los errores que ya cometiste son los más probables de repetir.', check: 'Revisar errores de evaluaciones y guías anteriores', para: ['subir', 'recuperar', 'consolidar'] },
      { id: 'prioridad', titulo: 'Prioriza lo que más pesa', texto: 'Dedica más tiempo a los temas con más puntaje o que más se repiten. No todo vale lo mismo.', check: 'Identificar los temas que más pesan y empezar por ellos', para: ['subir', 'recuperar'] },
      { id: 'dudas', titulo: 'Resuelve dudas a tiempo', texto: 'Anota tus dudas y pregúntalas antes del día de la prueba (profesor, compañeros, ayudantía).', check: 'Llevar mis dudas anotadas al profesor o ayudantía', para: ['recuperar', 'subir', 'base'] },
      { id: 'revisar', titulo: 'Revisa antes de entregar', texto: 'Reserva los últimos minutos para releer enunciados y revisar respuestas: ahí se pierden puntos por confianza.', check: 'Practicar dejar 5–10 minutos finales para revisar', para: ['consolidar'] },
      { id: 'mantener', titulo: 'Mantén la rutina', texto: 'No bajes la intensidad porque vas bien. Sesiones cortas y regulares mantienen lo aprendido fresco.', check: 'Mantener sesiones cortas de repaso durante la semana', para: ['consolidar'] },
      { id: 'descanso', titulo: 'Descansa la noche anterior', texto: 'Dormir bien consolida la memoria. Una noche en vela suele costar más puntos de los que gana.', check: 'Dormir bien la noche antes de la evaluación', para: [] },
      { id: 'registro', titulo: 'Registra qué te funcionó', texto: 'Anota cómo estudiaste y qué resultado obtuviste. Ese registro te ayuda a planificar el próximo período.', check: 'Anotar qué método de estudio me funcionó y cuál no', para: ['cerrada'] },
      // v4.1: más técnicas, manejo del tiempo, nervios y organización
      { id: 'pomodoro', titulo: 'Bloques cortos de foco', texto: 'Estudia 25–30 minutos sin celular y descansa 5. Cuatro bloques bien hechos rinden más que una tarde distraída.', check: 'Hacer 4 bloques de 25 min sin celular', para: [] },
      { id: 'calendario', titulo: 'Agenda tu repaso', texto: 'Cuenta los días hasta la evaluación y asigna un tema a cada día. Saber qué toca hoy elimina la duda de “por dónde empiezo”.', check: 'Armar calendario de repaso hasta la evaluación', para: ['base', 'subir', 'recuperar'] },
      { id: 'intercalado', titulo: 'Intercala tipos de ejercicio', texto: 'Mezcla problemas de distintos temas en una misma sesión: así entrenas a reconocer qué estrategia usar, como en la prueba real.', check: 'Resolver una guía mezclando temas', para: ['subir', 'consolidar'] },
      { id: 'fichas', titulo: 'Tarjetas de memoria', texto: 'Escribe preguntas por un lado y respuestas por el otro. Repasa primero las que fallas; deja de lado las que ya dominas.', check: 'Crear tarjetas de pregunta/respuesta de los conceptos clave', para: [] },
      { id: 'mapa', titulo: 'Mapa de una página', texto: 'Resume toda la materia en una sola hoja: conceptos, fórmulas y relaciones. Obligarte a sintetizar te muestra qué es lo esencial.', check: 'Hacer un resumen de una sola página', para: ['base', 'consolidar'] },
      { id: 'ensenar', titulo: 'Estudia con alguien', texto: 'Juntos, túrnense para hacerse preguntas o explicar ejercicios. Enseñar a otro es una de las formas más efectivas de aprender.', check: 'Sesión de estudio con un compañero (preguntas cruzadas)', para: ['subir', 'base'] },
      { id: 'respiracion', titulo: 'Calma los nervios', texto: 'Antes de empezar, respira lento: 4 segundos inhalando, 6 exhalando, tres veces. Baja el pulso y te ayuda a leer con claridad.', check: 'Practicar respiración 4-6 antes de la prueba', para: ['recuperar', 'subir'] },
      { id: 'orden', titulo: 'Empieza por lo que sabes', texto: 'En la prueba, lee todo primero y responde lo que dominas. Ganas confianza y aseguras puntos antes de ir por lo difícil.', check: 'Practicar estrategia: responder primero lo que domino', para: ['recuperar', 'subir', 'consolidar'] },
      { id: 'materiales', titulo: 'Prepara todo la noche anterior', texto: 'Deja listos lápices, calculadora, credencial y lo que pidan. Una mañana sin apuros es una prueba con más foco.', check: 'Dejar listos los materiales la noche anterior', para: [] },
      { id: 'distracciones', titulo: 'Elimina distracciones', texto: 'Silencia notificaciones o deja el celular en otra pieza mientras estudias. Cada interrupción cuesta varios minutos de concentración.', check: 'Estudiar con el celular en otra pieza', para: [] },
      { id: 'objetivo', titulo: 'Objetivo concreto por sesión', texto: 'Cambia “estudiar Física” por “dominar fuerzas centrales y hacer 10 ejercicios”. Un objetivo medible se cumple; uno vago se posterga.', check: 'Definir un objetivo medible para cada sesión', para: [] },
      { id: 'formulas', titulo: 'Ten claras las definiciones clave', texto: 'Haz una lista con las definiciones, fórmulas o fechas imprescindibles y repásala en voz alta cada día.', check: 'Lista de definiciones/fórmulas clave y repasarla a diario', para: ['base', 'consolidar', 'subir'] },
      { id: 'profesor', titulo: 'Pregunta qué se evaluará', texto: 'Consulta al profesor el formato (alternativas, desarrollo, oral) y los contenidos. Estudiar para el formato correcto ahorra horas.', check: 'Preguntar formato y contenidos de la evaluación', para: ['base', 'recuperar'] },
      { id: 'alimentacion', titulo: 'Come y tómate un vaso de agua', texto: 'Llegar con hambre o deshidratado baja la concentración. Un desayuno simple ayuda más de lo que parece.', check: 'Desayunar bien el día de la evaluación', para: [] },
      { id: 'recompensa', titulo: 'Prémiate al cumplir', texto: 'Ponte una recompensa chica al terminar cada meta de estudio. Asociar el esfuerzo con algo positivo hace más fácil volver mañana.', check: 'Definir una recompensa por cumplir mi plan de estudio', para: ['subir', 'recuperar'] },
      { id: 'reflexion', titulo: 'Analiza tu última nota', texto: 'Mira tu evaluación anterior: ¿perdiste puntos por no saber, por no entender la pregunta o por tiempo? Cada causa tiene un remedio distinto.', check: 'Analizar por qué perdí puntos en la última evaluación', para: ['subir', 'recuperar', 'cerrada'] },
      { id: 'consolidar-dominado', titulo: 'No descuides lo que ya sabes', texto: 'Un repaso rápido de los temas dominados evita que se oxiden mientras estudias lo nuevo.', check: 'Repaso rápido de temas ya dominados', para: ['consolidar'] },
      { id: 'meta-alta', titulo: 'Apunta un poco más alto', texto: 'Si vas bien, ponte como desafío subir una décima más que la vez anterior. Las metas que estiran un poco mantienen la motivación.', check: 'Fijar un desafío: una décima más que la última nota', para: ['consolidar'] },
      { id: 'planificar-proximo', titulo: 'Planifica el próximo período', texto: 'Con lo aprendido, decide desde ya qué harás distinto el próximo período: horario, técnica o forma de pedir ayuda.', check: 'Escribir 3 cambios para el próximo período', para: ['cerrada'] },
    ],
  };

  /* =========================================================
   * FEEDBACK AL REGISTRAR UNA NOTA (v4.1)
   * {nota}, {asig}, {carrera} se reemplazan en la app. Tono genuino, sin juzgar.
   * ========================================================= */
  const FEEDBACK_NOTA = {
    excelente: [
      '¡Un {nota} en {asig}! Eso es trabajo bien hecho. Disfrútalo: te lo ganaste.',
      '¡{nota}! Excelente resultado en {asig}. Lo que hiciste para esta evaluación funciona: repítelo.',
      '¡Qué notón! {nota} en {asig}. Así se construye el camino.',
      '¡Felicitaciones! Un {nota} en {asig} habla de constancia, no de suerte.',
      // v8
      '{nota} en {asig}. Eso no sale solo: hubo preparación detrás. Bien hecho.',
      '¡Excelente, {nota} en {asig}! Anota cómo estudiaste: es una receta que vale la pena repetir.',
      'Un {nota} en {asig}. Date un momento para celebrarlo antes de pensar en lo que viene.',
      '{asig}: {nota}. Así se ve el trabajo constante cuando llega la nota.',
      '¡Gran nota! {nota} en {asig}. Tu promedio te lo agradece.',
      '{nota} en {asig}: dominaste esta evaluación. Lo que aprendiste aquí te sirve para la siguiente.',
      'Qué buena noticia: {nota} en {asig}. Disfrútalo, te lo ganaste estudiando.',
      'Un {nota} en {asig} es la prueba de que tu método funciona. Confía en él.',
    ],
    buena: [
      'Buen resultado: {nota} en {asig}. Vas por buen camino; con un poco más de práctica activa puedes ir por más.',
      '{nota} en {asig}: sólido. Revisa en qué perdiste puntos y la próxima puede ser aún mejor.',
      'Bien ahí con ese {nota} en {asig}. Mantén el ritmo y apunta un escalón más arriba.',
      // v8
      '{nota} en {asig}: buen trabajo. La diferencia con un 7 suele estar en los detalles: revisa los errores chicos.',
      'Un {nota} en {asig} confirma que entiendes la materia. Ahora toca pulirla.',
      '{asig}: {nota}. Buen paso. Mira la corrección con calma; ahí están las décimas que faltan.',
      'Bien: {nota} en {asig}. Con este piso, el próximo objetivo puede ser un poco más alto.',
      '{nota} en {asig}. Nota firme. Sigue con la rutina que te trajo hasta aquí.',
      'Buen {nota} en {asig}. Repasa lo que dudaste y la próxima puede ser más tranquila.',
    ],
    ajustada: [
      '{nota} en {asig}: aprobaste y eso cuenta. Ahora tienes datos claros de qué reforzar para la siguiente.',
      'Un {nota} en {asig} es un punto de partida, no un techo. Lo que quedó débil es justo lo que conviene repasar.',
      '{nota} en {asig}. No define lo que puedes lograr: la próxima evaluación es una nueva oportunidad.',
      // v8
      'Aprobaste {asig} con {nota}. Ahora busca en qué preguntas se fueron los puntos: ahí está tu siguiente meta.',
      '{nota} en {asig}: pasaste la valla. Un par de sesiones extra antes de la próxima pueden marcar la diferencia.',
      'Un {nota} en {asig} deja margen para crecer. Pide la corrección y conversa tus dudas con el profesor.',
      '{asig}: {nota}. Aprobado, aunque justo. Revisa qué tipo de errores fueron: de contenido, de lectura o de tiempo.',
      'Con {nota} en {asig} sigues en carrera. La próxima vez, llega con más ejercicios resueltos.',
      '{nota} en {asig}. No es tu techo: es la base desde donde vas a subir.',
    ],
    baja: [
      'Este {nota} en {asig} duele, pero te muestra exactamente dónde enfocarte. Pide ayuda a tiempo y vuelve con un plan.',
      'Un {nota} en {asig} es información, no un juicio sobre ti. Revisa la prueba, aclara dudas y vamos por la siguiente.',
      'No fue el resultado que querías en {asig} ({nota}). Lo importante es lo que haces ahora: paso a paso se remonta.',
      // v8
      '{nota} en {asig}. Respira: una nota baja se compensa con un plan concreto, no con culpa.',
      'Un {nota} en {asig} no borra lo que sabes. Identifica dos temas que fallaron y empieza por ahí.',
      'Este {nota} en {asig} es un aviso a tiempo. Todavía hay evaluaciones para remontar.',
      '{asig}: {nota}. Pide ayuda pronto (profesor, compañeros o tutoría): mientras antes, mejor.',
      'No salió como esperabas ({nota} en {asig}). Revisa la prueba con calma: entender el error es la mitad de la solución.',
      'Un {nota} en {asig} pesa, pero no decide el semestre. Lo que hagas desde hoy sí lo hace.',
      '{nota} en {asig}. Cambia la estrategia, no la meta: más ejercicios y menos relectura.',
    ],
    // v8: situaciones específicas (se suman al mensaje principal cuando aplican)
    perfecta: [
      '¡Nota máxima en {asig}! No se puede pedir más.',
      '¡{nota} en {asig}! La nota más alta posible. Felicitaciones.',
      'Nota perfecta en {asig}. Guarda esa prueba como recuerdo de lo que eres capaz.',
      '¡Máximo puntaje en {asig}! Eso es dominio total.',
    ],
    primera: [
      'Primera nota de {asig} registrada: ya tienes un punto de partida.',
      'Así parte {asig}. Con esta primera nota ya puedes calcular lo que viene.',
      'Primera evaluación de {asig} lista. Las que siguen se apoyan en esta.',
      'Ya empezó {asig}: la primera nota marca el tono del período.',
    ],
    mejora: [
      'Subiste respecto de tu evaluación anterior en {asig}. Eso es progreso real.',
      'Mejor que la vez pasada en {asig}: lo que cambiaste está funcionando.',
      'Tu última nota en {asig} superó a la anterior. Sigue por ahí.',
      'Vas en alza en {asig}. Ese avance se nota en el promedio.',
      'Remontada en {asig}: subiste respecto de la evaluación anterior.',
      'Progreso en {asig}. Compararte contigo es la mejor medida.',
    ],
    caida: [
      'Esta vez bajaste un poco respecto de tu nota anterior en {asig}. Revisa qué fue distinto.',
      'Un paso atrás respecto de la evaluación anterior en {asig}: pasa en todo proceso. Ajusta y sigue.',
      'Bajó un poco frente a tu última nota en {asig}. Puede ser el tema, el tiempo o el formato: identifícalo.',
      'No igualaste tu nota anterior en {asig}, pero ya sabes que puedes: lo demostraste antes.',
    ],
    sobreMeta: [
      '¡Ya estás sobre tu meta en {asig}!',
      'Tu promedio en {asig} ya supera tu meta. Ahora cuídalo.',
      'Meta alcanzada en {asig}, por ahora. Mantén el nivel en lo que queda.',
      'Cruzaste la línea de tu meta en {asig}. Buen momento para pensar en ir más allá.',
    ],
    bajoMeta: [
      'Todavía estás bajo tu meta en {asig}, pero hay margen en lo que queda.',
      'Tu promedio en {asig} quedó bajo la meta. Mira cuánto necesitas en lo pendiente: suele ser menos de lo que crees.',
      'Bajo la meta en {asig} por ahora. Prioriza esta asignatura en tu próxima semana de estudio.',
    ],
    cierre: [
      'Con esta nota cierras {asig}. Anota qué te funcionó para el próximo período.',
      '{asig} completa: ya no quedan evaluaciones pendientes.',
      'Última evaluación de {asig} registrada. Cerraste un ciclo.',
      'Terminaste {asig}. Cada ramo cerrado es un paso firme.',
    ],
    // Motivación vocacional (escolar): se usa con moderación, no en cada mensaje
    carrera: [
      'Cada evaluación es un paso hacia {carrera}.',
      'Esto también es camino hacia {carrera}.',
      '{carrera} se construye con días como este.',
      'Piensa en {carrera}: el esfuerzo de hoy suma.',
      'Tu NEM también se arma con notas como esta.',
      'Un paso más hacia la carrera que te interesa.',
    ],
    // Motivación profesional (universitario): {carrera} = carrera que cursa
    profesion: [
      'Lo que aprendes aquí lo vas a usar en tu ejercicio profesional.',
      'Cada ramo aprobado te acerca a ejercer {carrera}.',
      'Tu formación en {carrera} se construye certamen a certamen.',
      'Esto también es preparación para tu práctica profesional.',
      'Las personas a las que vas a atender o con las que vas a trabajar se benefician de lo que estudias hoy.',
      'Un paso más hacia tu título.',
    ],
  };

  /* =========================================================
   * ÁREAS DEL CURRÍCULUM (v5) — para agrupar asignaturas por naturaleza en el diálogo "Currículum".
   * `categorias` usa las categorías del importador (Importador.categoriasDe); `palabras` cubre nombres
   * que no calzan con ninguna categoría (ej. "Educación Ciudadana", "Danza"). El orden importa.
   * ========================================================= */
  const AREAS_CURRICULO = [
    { area: 'Matemática y Tecnología', icono: '∑', categorias: ['matematica', 'programacion', 'tecnologia'], palabras: ['derivadas', 'probabilidades', 'estadistica', 'geometria', 'computacional', 'programacion', 'limites'] },
    { area: 'Ciencias Naturales', icono: '⚗', categorias: ['ciencias', 'biologia', 'quimica', 'fisica'], palabras: ['ciencias', 'biologia', 'salud', 'ecosistemas', 'celular'] },
    { area: 'Humanidades y Lenguaje', icono: '✎', categorias: ['lenguaje', 'historia', 'filosofia', 'ingles'], palabras: ['ciudadana', 'democracia', 'argumentacion', 'literatura', 'lectura', 'escritura', 'economia', 'sociedad', 'mundo global', 'geografia', 'seminario', 'filosofia', 'psicologia', 'comprension historica', 'lengua', 'estetica', 'etica'] },
    { area: 'Artes, Salud y Formación General', icono: '♫', categorias: ['artes', 'musica', 'edfisica', 'religion', 'orientacion'], palabras: ['artes', 'arte', 'musica', 'danza', 'teatro', 'diseno', 'audiovisual', 'interpretacion', 'deporte', 'actividad fisica', 'expresion corporal', 'promocion de estilos de vida', 'orientacion', 'religion'] },
  ];
  const AREA_OTRAS = { area: 'Especialidad y otras', icono: '◆' };

  /* =========================================================
   * NOVEDADES (bandeja de notificaciones de la barra superior)
   * tipo: 'version' | 'mejora' | 'aviso'. El `id` sirve para recordar cuáles se leyeron.
   * ========================================================= */
  const NOVEDADES = [
    { id: 'v14', tipo: 'version', titulo: 'Versión 14', fecha: '2026-11-26', texto: 'Nueva sección “Universidades” con sus sitios oficiales, escalas de conversión por prueba en PAES, décimas aplicadas a una evaluación (con recomendación de dónde conviene usarlas), metas por asignatura opcionales con aviso si no alcanzan tu meta general, avisos de ponderaciones incompletas y botón “Ir a mis notas” siempre a mano.' },
    { id: 'v13', tipo: 'version', titulo: 'Versión 13', fecha: '2026-11-25', texto: 'Registra tus ensayos PAES en “PAES → Mis ensayos”: convierte tus respuestas correctas con las tablas oficiales de DEMRE, muestra tu evolución, mejor puntaje y promedio por prueba, y puede llevarlos al simulador. Además, el cambio de tema ahora tiene una transición animada.' },
    { id: 'v9', tipo: 'version', titulo: 'Versión 9', fecha: '2026-11-25', texto: 'Feriados y fechas clave con cuenta regresiva (editables en “Más → Feriados y fechas clave”), bloque de próximas fechas junto a la frase, “Tu progreso” desglosado por período y, en Consolidado, el promedio de cada asignatura entre semestres emparejado por nombre.' },
    { id: 'v8', tipo: 'version', titulo: 'Versión 8', fecha: '2026-11-25', texto: 'Nueva sección PAES con temarios de la Admisión 2027, períodos que se reordenan arrastrando (clic derecho para renombrar), aporte real de cada asignatura al promedio general, aviso de asignaturas repetidas, “Tu progreso” compacto, citas de autores y muchas más frases al registrar notas.' },
    { id: 'v7-1', tipo: 'version', titulo: 'Versión 7.1', fecha: '2026-11-25', texto: 'Ahora puedes subir el PDF de tu informe de notas directamente en “Importar desde foto”: se lee en tu navegador, se detectan todas las asignaturas y se activa el modo “Informe completo”. Los PDF escaneados se convierten a imagen para el OCR.' },
    { id: 'v7', tipo: 'version', titulo: 'Versión 7', fecha: '2026-11-25', texto: 'Puntajes de corte 2026 para 1.008 carreras de 22 universidades, buscador de carreras (escribe o desliza), enfoque institucional de cada universidad e importación de informes de notas completos con varias asignaturas.' },
    { id: 'v6', tipo: 'version', titulo: 'Versión 6', fecha: '2026-11-25', texto: 'Aviso de promoción escolar, décimas extra por asignatura, guía de inicio y ayuda (?), NEM solo con los datos del perfil activo, aporte de cada prueba en el simulador de admisión y catálogo ampliado a más de 400 carreras de 22 universidades.' },
    { id: 'v5', tipo: 'version', titulo: 'Versión 5', fecha: '2026-11-24', texto: 'Tablas NEM oficiales 2026–2027 incluidas, exportar ficha de notas (PDF, TXT o CSV), lectura de fotos más estable, estado “Cerrada” visible en la lista y currículum agrupado por área.' },
    { id: 'aviso-respaldo', tipo: 'aviso', titulo: 'Tus datos viven en este navegador', texto: 'Ruta Académica guarda todo localmente. Exporta un respaldo de vez en cuando desde “Más ▾ → Exportar respaldo”.' },
    { id: 'v4-1', tipo: 'version', titulo: 'Versión 4.1', texto: 'Cierre manual de asignaturas, felicitaciones al registrar notas, “Ir más allá de tu meta”, carrera preferida y consejos que rotan.' },
    { id: 'v4', tipo: 'version', titulo: 'Versión 4', texto: 'Promedio equiponderado automático, ponderaciones en % o decimal (0,25 · 1/4), papelera de perfiles, frase del día y guía para tu próxima evaluación.' },
    { id: 'v3', tipo: 'version', titulo: 'Versión 3', texto: 'Bloques de controles, importar notas desde foto, simulador de admisión con catálogo de carreras, respaldo JSON y “Deshacer”.' },
    { id: 'v2', tipo: 'version', titulo: 'Versión 2', texto: 'Varios perfiles, modalidades CH / TP / Universitario, períodos, meta de promedio general y calculadora NEM.' },
    { id: 'v1', tipo: 'version', titulo: 'Versión 1', texto: 'Primera versión: asignaturas, evaluaciones, nota necesaria para tu meta y simulador “¿Qué pasa si…?”.' },
  ];

  /* =========================================================
   * GUÍA DE INICIO (al crear un perfil) — en el orden en que normalmente se usa la app.
   * `accion` / `etiqueta`: botón opcional que lleva directo a esa función.
   * ========================================================= */
  const GUIA_INICIO = [
    {
      icono: '①', titulo: 'Configura tu perfil',
      texto: 'Empieza por lo básico: quién eres y cómo te evalúan.',
      puntos: [
        '<strong>Perfil</strong>: modalidad (Científico-Humanista, Técnico-Profesional o Universitario), nivel y carrera preferida.',
        '<strong>Escala</strong>: nota mínima, máxima y de aprobación (en Chile, 1,0 · 7,0 · 4,0).',
        '<strong>Régimen</strong>: semestral, trimestral, bimestral o anual. Cada período aparece como pestaña.',
        '<strong>Asignaturas</strong>: agrégalas una a una o cárgalas de una vez desde <strong>Currículum</strong> (escolar) o <strong>Malla</strong> (universidad).',
      ],
      accion: 'abrir-perfil', etiqueta: 'Abrir Perfil',
    },
    {
      icono: '②', titulo: 'Registra tus notas',
      texto: 'Cada asignatura tiene su tabla de evaluaciones.',
      puntos: [
        'Escribe la nota con coma o punto (6,5 o 6.5). También puedes escribir <strong>65</strong> y se lee como 6,5.',
        'Deja la nota vacía si la evaluación aún no se rinde: queda <strong>pendiente</strong>.',
        'La <strong>ponderación</strong> va en % (25) o decimal (0,25 o 1/4). Si no pones ninguna, todas valen lo mismo automáticamente.',
        'Usa <strong>Bloque de controles</strong> para controles que se promedian entre sí, y <strong>Décimas extra</strong> para bonificaciones del profesor.',
        '¿Tienes una foto o captura de tus notas? Usa <strong>Importar desde foto</strong>: siempre podrás revisar antes de guardar.',
      ],
      accion: 'abrir-foto', etiqueta: 'Probar Importar desde foto',
    },
    {
      icono: '③', titulo: 'Revisa tus metas',
      texto: 'La app calcula lo que necesitas para llegar donde quieres.',
      puntos: [
        '<strong>Meta</strong> de cada asignatura: verás la nota que necesitas en lo pendiente y si vas bien encaminado.',
        '<strong>Meta de promedio general</strong>: te sugiere metas equilibradas por asignatura.',
        '<strong>¿Qué pasa si…?</strong> es un simulador: mueve las notas hipotéticas sin cambiar tus notas reales.',
        '<strong>Preparación para tu próxima evaluación</strong>: consejos que puedes enviar a tu checklist.',
        'En perfiles escolares, el aviso de <strong>promoción</strong> te orienta sobre si vas pasando de curso.',
      ],
    },
    {
      icono: '④', titulo: 'Explora NEM y admisión',
      texto: 'Proyecta tu postulación a la universidad.',
      puntos: [
        '<strong>Calculadora NEM</strong>: usa la tabla oficial vigente y solo los datos de este perfil.',
        '<strong>Puntajes de corte y simulador</strong>: ingresa tus puntajes PAES y compáralos con la carrera que te interesa.',
        'El catálogo trae ponderaciones <strong>de ejemplo</strong>: edítalas con las oficiales de la carrera para un cálculo real.',
      ],
      accion: 'ir-admision', etiqueta: 'Ir a NEM y Admisión',
    },
    {
      icono: '⑤', titulo: 'Cuida tus datos',
      texto: 'Todo se guarda solo en este navegador.',
      puntos: [
        '<strong>Más ▾ → Exportar respaldo</strong> descarga un archivo con tus datos; <strong>Importar respaldo</strong> los recupera.',
        '<strong>Exportar ficha de notas</strong> genera un resumen en PDF, TXT o CSV (no es un documento oficial).',
        'Si eliminas un perfil, va a la <strong>Papelera</strong>: puedes restaurarlo durante el plazo configurado.',
        '¿Dudas? El botón <strong>(?)</strong> junto a los períodos abre la ayuda en cualquier momento.',
      ],
    },
  ];

  /* =========================================================
   * AYUDA RÁPIDA (botón "(?)") — qué hace cada función, sin ambigüedades.
   * ========================================================= */
  const AYUDA = [
    { seccion: 'Datos reales vs. simulados', items: [
      ['Notas reales', 'Lo que escribes en la tabla de evaluaciones. Solo esto entra en tus promedios.'],
      ['Simulador “¿Qué pasa si…?”', 'Mueve notas hipotéticas de lo pendiente. No guarda ni cambia tus notas.'],
      ['Décimas extra', 'Bonificaciones que registras aparte. Se muestran como “promedio con décimas”; el promedio base y el promedio general no cambian.'],
      ['Equiponderado automático', 'Si ninguna evaluación tiene %, todas valen lo mismo. Al escribir un % se usa el tuyo.'],
    ] },
    { seccion: 'Asignaturas y evaluaciones', items: [
      ['Meta', 'El promedio que quieres lograr. Calcula cuánto necesitas en lo pendiente.'],
      ['Pendiente', 'Evaluación sin nota todavía. Cuenta para calcular lo que necesitas.'],
      ['Bloque de controles', 'Varios controles cuyo promedio vale una sola ponderación (ej. 4 controles = 20 %).'],
      ['Distribuir automáticamente', 'Reparte el % que falta para llegar a 100 % entre las evaluaciones pendientes. Cambia tus ponderaciones (puedes editarlas después).'],
      ['Cerrar / Reabrir asignatura', 'Cerrar = dar la asignatura por terminada con lo rendido, aunque falte %. Puedes reabrirla cuando quieras.'],
      ['Checklist de estudio', 'Tareas tuyas para preparar la asignatura. No afectan las notas.'],
    ] },
    { seccion: 'Promedios y metas generales', items: [
      ['Promedio del período', 'Media de los promedios de las asignaturas del período elegido.'],
      ['Consolidado', 'Muestra todos los períodos juntos (promedio general acumulado).'],
      ['Reordenar y renombrar períodos', 'Arrastra un período para cambiar su orden. Clic derecho (o mantenerlo presionado en el celular, o el botón “⋯ Período”) abre el menú para renombrarlo o moverlo. Con teclado: Alt+← / Alt+→.'],
      ['Aporte al general', '“Aporta” es la parte del promedio general que pone cada asignatura (la columna suma tu promedio). “Efecto” es cuánto sube o baja tu general por incluirla. Con créditos (universitario) se pondera por créditos.'],
      ['Asignaturas repetidas', 'Si dos asignaturas del mismo período tienen el mismo nombre (sin contar tildes ni mayúsculas), la app te avisa y puedes unificarlas sin perder notas.'],
      ['Meta de promedio general', 'Tu meta para el promedio de todas las asignaturas. “Aplicar metas sugeridas” cambia las metas de cada asignatura.'],
      ['Promoción escolar', 'Orientación según el criterio estándar chileno (Decreto 67/2018). La decisión oficial es del establecimiento.'],
    ] },
    { seccion: 'NEM y admisión', items: [
      ['Calculadora NEM', 'Promedia tus años de 1° a 4° Medio de ESTE perfil (automático del año actual o escritos a mano) y los convierte con la tabla oficial.'],
      ['Simulador de admisión', 'Calcula tu puntaje ponderado con tus puntajes y las ponderaciones de la carrera, y muestra el aporte de cada prueba.'],
      ['Catálogo de carreras', 'Ponderaciones de ejemplo y sin cortes oficiales: edítalas o agrega carreras con datos reales.'],
      ['Sección PAES', 'Explica la PAES, sus pruebas y los temarios de la Admisión 2027 (DEMRE). Es información de referencia: confirma siempre en demre.cl.'],
    ] },
    { seccion: 'Importar, exportar y respaldo', items: [
      ['Importar desde foto', 'Lee el texto de una imagen (o el que pegues), propone las notas y SIEMPRE te pide confirmar antes de guardar.'],
      ['Exportar ficha', 'Resumen de notas en PDF, TXT o CSV. Es un documento personal, sin validez oficial.'],
      ['Respaldo', 'Archivo con todos tus datos para guardarlos o pasarlos a otro navegador.'],
      ['Deshacer', 'Tras eliminar o importar aparece “Deshacer” unos segundos abajo en la pantalla.'],
      ['Papelera de perfiles', 'Los perfiles eliminados se guardan ahí y se borran solos tras el plazo (7, 15 o 30 días).'],
    ] },
  ];

  return {
    NOVEDADES,
    AREAS_CURRICULO, AREA_OTRAS,
    FEEDBACK_NOTA, FRASES, CITAS, FRASES_UNI, GUIA_EVALUACION, PAES,
    FERIADOS_CHILE, HITOS_REFERENCIA, VERSION_FECHAS, FUENTE_FECHAS, ESCALAS_PAES, PRUEBAS_ENSAYO, UNIVERSIDADES_INFO,
    VERSION, NIVELES_ESCOLARES, NIVELES_TP, AÑOS_MEDIA, ESPECIALIDADES_TP,
    seccionesCurriculo, UNIVERSIDADES, MALLAS, construirMalla,
    NEM_OFICIAL, NEM_FUENTE, GRUPOS_NEM, URL_NEM,
    COMPONENTES_ADMISION, REQUISITOS_GENERALES, PLANTILLAS_PONDERACION, CATALOGO_CORTES, FUENTE_ILUSTRATIVA,
    CARRERAS, TIPO_DE_CARRERA, OFERTA_UNIVERSIDADES, VERSION_CATALOGO, GUIA_INICIO, AYUDA, CORTES_2026, FUENTE_CORTES_2026, PERSPECTIVAS_AREA, PERSPECTIVAS_UNIVERSIDAD, tipoPorNombre,
  };
})();

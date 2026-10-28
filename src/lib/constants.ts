import { CoordinateConfig, MedicalQuestion } from './types';

export const STATIC_VALUES = {
  fecha: '27-10-2026',
  cargoPage1: 'OPERARIO(A) DE ASEO',
  area: 'CONCENTRADUCTO',
  horaInicio: '10:00',
  horaTermino: '12:00',
  cargoPage22: 'Operario de Aseo',
};

export const MEDICAL_QUESTIONS: MedicalQuestion[] = [
  // Página 8 (Índice 7): Antecedentes Generales
  {
    id: 'ant_cirugias',
    category: 'antecedentes',
    pageIndex: 7,
    question: '¿Ha tenido cirugías en los últimos 12 meses o fracturas no consolidadas?',
    coordsYes: { x: 440, y: 640 },
    coordsNo: { x: 490, y: 640 },
  },
  {
    id: 'ant_licencias',
    category: 'antecedentes',
    pageIndex: 7,
    question: '¿Ha tenido licencias médicas prolongadas (+ de 30 días) en el último año?',
    coordsYes: { x: 440, y: 590 },
    coordsNo: { x: 490, y: 590 },
  },
  {
    id: 'ant_hospitalizacion',
    category: 'antecedentes',
    pageIndex: 7,
    question: '¿Ha requerido hospitalización por enfermedad grave en los últimos 2 años?',
    coordsYes: { x: 440, y: 540 },
    coordsNo: { x: 490, y: 540 },
  },

  // Página 9 (Índice 8): Cardiovasculares y Respiratorias
  {
    id: 'enf_hipertension',
    category: 'enfermedades',
    pageIndex: 8,
    question: '¿Padece de Hipertensión Arterial en tratamiento o descompensada?',
    coordsYes: { x: 440, y: 640 },
    coordsNo: { x: 490, y: 640 },
  },
  {
    id: 'enf_asma',
    category: 'enfermedades',
    pageIndex: 8,
    question: '¿Padece Asma Bronquial, EPOC o dificultades respiratorias al esfuerzo?',
    coordsYes: { x: 440, y: 590 },
    coordsNo: { x: 490, y: 590 },
  },
  {
    id: 'enf_pecho',
    category: 'enfermedades',
    pageIndex: 8,
    question: '¿Ha sentido dolor opresivo en el pecho, palpitaciones anormales o desmayos?',
    coordsYes: { x: 440, y: 540 },
    coordsNo: { x: 490, y: 540 },
  },

  // Página 10 (Índice 9): Metabólicas y Osteomusculares
  {
    id: 'enf_diabetes',
    category: 'enfermedades',
    pageIndex: 9,
    question: '¿Ha sido diagnosticado de Diabetes Mellitus (Tipo 1 o Tipo 2)?',
    coordsYes: { x: 440, y: 640 },
    coordsNo: { x: 490, y: 640 },
  },
  {
    id: 'enf_columna',
    category: 'enfermedades',
    pageIndex: 9,
    question: '¿Presenta dolor crónico de columna, lumbago recurrente o hernia discal?',
    coordsYes: { x: 440, y: 590 },
    coordsNo: { x: 490, y: 590 },
  },
  {
    id: 'enf_articular',
    category: 'enfermedades',
    pageIndex: 9,
    question: '¿Presenta limitación en articulaciones, hombros, rodillas o muñecas?',
    coordsYes: { x: 440, y: 540 },
    coordsNo: { x: 490, y: 540 },
  },

  // Página 11 (Índice 10): Neurológicas y Auditivas/Visuales
  {
    id: 'enf_epilepsia',
    category: 'enfermedades',
    pageIndex: 10,
    question: '¿Ha sufrido episodios de epilepsia, convulsiones o pérdidas de conciencia?',
    coordsYes: { x: 440, y: 640 },
    coordsNo: { x: 490, y: 640 },
  },
  {
    id: 'enf_vertigo',
    category: 'enfermedades',
    pageIndex: 10,
    question: '¿Sufre de vértigo, laberintitis o fobia a la altura física/geográfica?',
    coordsYes: { x: 440, y: 590 },
    coordsNo: { x: 490, y: 590 },
  },
  {
    id: 'enf_vision',
    category: 'enfermedades',
    pageIndex: 10,
    question: '¿Presenta problemas auditivos o visuales que le impidan percibir alarmas?',
    coordsYes: { x: 440, y: 540 },
    coordsNo: { x: 490, y: 540 },
  },

  // Página 12 (Índice 11): Otras Consideraciones y Alergias
  {
    id: 'cons_alergia',
    category: 'consideraciones',
    pageIndex: 11,
    question: '¿Tiene alergias graves a medicamentos, polvo químico o picaduras?',
    coordsYes: { x: 440, y: 640 },
    coordsNo: { x: 490, y: 640 },
  },
  {
    id: 'cons_somnolencia',
    category: 'consideraciones',
    pageIndex: 11,
    question: '¿Consume habitualmente medicamentos inductores del sueño o sedantes?',
    coordsYes: { x: 440, y: 590 },
    coordsNo: { x: 490, y: 590 },
  },
  {
    id: 'cons_embarazo',
    category: 'consideraciones',
    pageIndex: 11,
    question: 'En caso de mujeres: ¿Se encuentra actualmente en estado de embarazo?',
    coordsYes: { x: 440, y: 540 },
    coordsNo: { x: 490, y: 540 },
  },
];

export const DEFAULT_COORDINATES: CoordinateConfig = {
  actaDs44: {
    page1: {
      cargo: { x: 130, y: 672 },
      fecha: { x: 460, y: 672 },
      area: { x: 130, y: 642 },
      horaInicio: { x: 380, y: 642 },
      horaTermino: { x: 485, y: 642 },
      personaNuevaX: { x: 508, y: 618, size: 24 }, // "X" gigante
      nombre: { x: 130, y: 588 },
      rut: { x: 420, y: 588 },
      contactoEmergencia: { x: 195, y: 558 },
      telefonoEmergencia: { x: 420, y: 558 },
    },
    page22: {
      nombre: { x: 80, y: 195 },
      rut: { x: 80, y: 165 },
      cargo: { x: 80, y: 135 },
      firma: { x: 360, y: 130, width: 170, height: 75 }, // Lado derecho firma trabajador
    },
  },
  consentimiento: {
    nombre: { x: 140, y: 620 },
    rut: { x: 140, y: 585 },
    fecha: { x: 380, y: 585 },
    firma: { x: 210, y: 240, width: 180, height: 80 }, // Coordenadas sobre la línea de firma
  },
};

/**
 * Validador y formateador de RUT chileno
 */
export function formatRUT(rutRaw: string): string {
  const clean = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!clean) return '';
  if (clean.length === 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

export function validateRUT(rutFormatted: string): boolean {
  const clean = rutFormatted.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8) return false;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvNum = 11 - (sum % 11);
  let expectedDv = '';
  if (expectedDvNum === 11) expectedDv = '0';
  else if (expectedDvNum === 10) expectedDv = 'K';
  else expectedDv = expectedDvNum.toString();

  return dv === expectedDv;
}

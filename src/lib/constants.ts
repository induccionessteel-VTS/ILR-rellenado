import { CoordinateConfig, MedicalQuestion } from './types';

export const STATIC_VALUES = {
  fecha: '27-10-2026',
  cargoPage1: 'OPERARIO(A) DE ASEO',
  area: 'CONCENTRADUCTO',
  horaInicio: '10:00',
  horaTermino: '12:00',
  cargoPage22: 'Operario de Aseo',
  codigoDocumento: 'VELTS-D-ACN212-HS-0012',
  empresa: 'Steel Ingeniería S.A.',
};

/**
 * Preguntas Médicas mapeadas exactamente a las tablas de la
 * Ficha Médica del Trabajador en el documento real:
 * - Página 8 (Índice 7): Enfermedades 01 a 04
 * - Página 9 (Índice 8): Enfermedades 05 a 08, Antecedentes Generales y Otras Consideraciones
 */
export const MEDICAL_QUESTIONS: MedicalQuestion[] = [
  // PÁGINA 8 (ÍNDICE 7) - ENFERMEDADES (Tabla 1)
  {
    id: 'enf_epilepsia',
    category: 'enfermedades',
    pageIndex: 7,
    question: '01. Epilepsia o convulsiones',
    coordsYes: { x: 378, y: 191 },
    coordsNo: { x: 412, y: 191 },
  },
  {
    id: 'enf_lumbago',
    category: 'enfermedades',
    pageIndex: 7,
    question: '02. Lumbago o dolor crónico de columna',
    coordsYes: { x: 378, y: 167 },
    coordsNo: { x: 412, y: 167 },
  },
  {
    id: 'enf_hipertension',
    category: 'enfermedades',
    pageIndex: 7,
    question: '03. Hipertensión Arterial',
    coordsYes: { x: 378, y: 142 },
    coordsNo: { x: 412, y: 142 },
  },
  {
    id: 'enf_diabetes',
    category: 'enfermedades',
    pageIndex: 7,
    question: '04. Diabetes (Tipo 1 o 2)',
    coordsYes: { x: 378, y: 118 },
    coordsNo: { x: 412, y: 118 },
  },

  // PÁGINA 9 (ÍNDICE 8) - ENFERMEDADES (Continuación)
  {
    id: 'enf_asma',
    category: 'enfermedades',
    pageIndex: 8,
    question: '05. Asma bronquial o dificultad respiratoria',
    coordsYes: { x: 378, y: 746 },
    coordsNo: { x: 412, y: 746 },
  },
  {
    id: 'enf_claustrofobia',
    category: 'enfermedades',
    pageIndex: 8,
    question: '06. Claustrofobia o fobia a espacios cerrados',
    coordsYes: { x: 378, y: 724 },
    coordsNo: { x: 412, y: 724 },
  },
  {
    id: 'enf_inmuno',
    category: 'enfermedades',
    pageIndex: 8,
    question: '07. Enfermedad inmunodepresora (Lupus, VIH, Cáncer)',
    coordsYes: { x: 378, y: 701 },
    coordsNo: { x: 412, y: 701 },
  },
  {
    id: 'enf_otras',
    category: 'enfermedades',
    pageIndex: 8,
    question: '08. Otras enfermedades de relevancia',
    coordsYes: { x: 378, y: 678 },
    coordsNo: { x: 412, y: 678 },
  },

  // PÁGINA 9 (ÍNDICE 8) - ANTECEDENTES GENERALES
  {
    id: 'ant_fractura',
    category: 'antecedentes',
    pageIndex: 8,
    question: '08. Fractura / Esguince / TEC (Traumatismo Cráneo Encefálico)',
    coordsYes: { x: 378, y: 616 },
    coordsNo: { x: 412, y: 616 },
  },
  {
    id: 'ant_tratamientos',
    category: 'antecedentes',
    pageIndex: 8,
    question: '09. Tratamientos Médicos vigentes o prolongados',
    coordsYes: { x: 378, y: 591 },
    coordsNo: { x: 412, y: 591 },
  },

  // PÁGINA 9 (ÍNDICE 8) - OTRAS CONSIDERACIONES
  {
    id: 'cons_alergia',
    category: 'consideraciones',
    pageIndex: 8,
    question: '11. Alergia grave a medicamentos, polvo o químicos',
    coordsYes: { x: 378, y: 516 },
    coordsNo: { x: 412, y: 516 },
  },
  {
    id: 'cons_protesis',
    category: 'consideraciones',
    pageIndex: 8,
    question: '12. Prótesis médica',
    coordsYes: { x: 378, y: 491 },
    coordsNo: { x: 412, y: 491 },
  },
  {
    id: 'cons_ortesis',
    category: 'consideraciones',
    pageIndex: 8,
    question: '13. Órtesis (apoyo externo al cuerpo)',
    coordsYes: { x: 378, y: 466 },
    coordsNo: { x: 412, y: 466 },
  },
  {
    id: 'cons_discapacidad',
    category: 'consideraciones',
    pageIndex: 8,
    question: '14. Discapacidad acreditada',
    coordsYes: { x: 378, y: 441 },
    coordsNo: { x: 412, y: 441 },
  },
];

/**
 * Coordenadas exactamente calibradas para el documento real:
 * VELTS-D-ACN212-HS-0012 (612 x 792 pt - US Letter)
 */
export const DEFAULT_COORDINATES: CoordinateConfig = {
  actaDs44: {
    page1: {
      cargo: { x: 52, y: 564 }, // Preimpreso en el documento
      fecha: { x: 435, y: 564 },
      area: { x: 80, y: 550 },
      horaInicio: { x: 460, y: 550 },
      horaTermino: { x: 535, y: 550 },
      personaNuevaX: { x: 105, y: 486, size: 20 }, // "X" gigante en casilla 'Persona Nueva'
      nombre: { x: 155, y: 578 },
      rut: { x: 450, y: 578 },
      contactoEmergencia: { x: 185, y: 536 },
      telefonoEmergencia: { x: 185, y: 522 },
    },
    page22: {
      nombre: { x: 125, y: 541 },
      rut: { x: 80, y: 527 },
      cargo: { x: 55, y: 512 },
      firma: { x: 295, y: 130, width: 175, height: 75 }, // Lado derecho (respetando casilla Huella)
    },
  },
  consentimiento: {
    nombre: { x: 140, y: 620 },
    rut: { x: 140, y: 585 },
    fecha: { x: 380, y: 585 },
    firma: { x: 210, y: 240, width: 180, height: 80 },
  },
};

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

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DEFAULT_COORDINATES, MEDICAL_QUESTIONS, STATIC_VALUES } from './constants';
import { CoordinateConfig, WorkerFormData } from './types';

/**
 * Convierte un Data URL o Base64 a Uint8Array de forma segura
 * Funciona de forma idéntica en Node.js y en el Navegador
 */
export function base64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '').trim();
  if (typeof atob === 'function') {
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  // Fallback para entornos Node.js puros
  const buffer = Buffer.from(cleanBase64, 'base64');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Genera un PDF sintético de 22 páginas representativo del Acta DS 44
 * Se utiliza cuando aún no se sube el archivo PDF original a /public
 */
export async function createMockDs44Template(): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < 22; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 estándar
    const pageNumber = i + 1;

    // Encabezado institucional
    page.drawRectangle({
      x: 40,
      y: 770,
      width: 515,
      height: 45,
      borderColor: rgb(0.2, 0.3, 0.45),
      borderWidth: 1,
      color: rgb(0.95, 0.97, 1.0),
    });

    page.drawText('ACTA DE INDUCCIÓN Y RECONOCIMIENTO LABORAL (IRL) - D.S. N° 44', {
      x: 55,
      y: 795,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.35),
    });

    page.drawText(`Página ${pageNumber} de 22 - Documento Oficial de Registro de Seguridad`, {
      x: 55,
      y: 778,
      size: 8,
      font,
      color: rgb(0.4, 0.45, 0.5),
    });

    // Contenido esquemático por página
    if (i === 0) {
      // PÁGINA 1 (Índice 0): Datos de la Empresa y Trabajador
      page.drawText('SECCIÓN 1: ANTECEDENTES GENERALES Y PUESTO DE TRABAJO', {
        x: 40,
        y: 730,
        size: 11,
        font: boldFont,
        color: rgb(0.15, 0.25, 0.4),
      });

      // Grilla de datos simulada
      page.drawRectangle({
        x: 40,
        y: 530,
        width: 515,
        height: 180,
        borderColor: rgb(0.75, 0.8, 0.85),
        borderWidth: 1,
      });

      page.drawText('Cargo:', { x: 50, y: 672, size: 9, font: boldFont });
      page.drawLine({ start: { x: 120, y: 670 }, end: { x: 340, y: 670 }, thickness: 0.5 });

      page.drawText('Fecha:', { x: 370, y: 672, size: 9, font: boldFont });
      page.drawLine({ start: { x: 420, y: 670 }, end: { x: 540, y: 670 }, thickness: 0.5 });

      page.drawText('Área / Faena:', { x: 50, y: 642, size: 9, font: boldFont });
      page.drawLine({ start: { x: 120, y: 640 }, end: { x: 260, y: 640 }, thickness: 0.5 });

      page.drawText('Hora Inicio:', { x: 280, y: 642, size: 9, font: boldFont });
      page.drawLine({ start: { x: 350, y: 640 }, end: { x: 400, y: 640 }, thickness: 0.5 });

      page.drawText('Hora Término:', { x: 410, y: 642, size: 9, font: boldFont });
      page.drawLine({ start: { x: 480, y: 640 }, end: { x: 540, y: 640 }, thickness: 0.5 });

      page.drawText('Tipo de Ingreso: [ ] Trabajador Antiguo    [ ] Persona Nueva', {
        x: 50,
        y: 618,
        size: 9,
        font,
      });
      // Casilla para la X gigante de Persona Nueva
      page.drawRectangle({
        x: 500,
        y: 612,
        width: 25,
        height: 25,
        borderColor: rgb(0.3, 0.4, 0.5),
        borderWidth: 1.5,
      });

      page.drawText('Nombre Trabajador:', { x: 50, y: 588, size: 9, font: boldFont });
      page.drawLine({ start: { x: 160, y: 586 }, end: { x: 340, y: 586 }, thickness: 0.5 });

      page.drawText('R.U.T.:', { x: 360, y: 588, size: 9, font: boldFont });
      page.drawLine({ start: { x: 400, y: 586 }, end: { x: 540, y: 586 }, thickness: 0.5 });

      page.drawText('Contacto Emergencia:', { x: 50, y: 558, size: 9, font: boldFont });
      page.drawLine({ start: { x: 165, y: 556 }, end: { x: 340, y: 556 }, thickness: 0.5 });

      page.drawText('Fono Emergencia:', { x: 350, y: 558, size: 9, font: boldFont });
      page.drawLine({ start: { x: 440, y: 556 }, end: { x: 540, y: 556 }, thickness: 0.5 });
    } else if (i >= 7 && i <= 11) {
      // PÁGINAS 8 AL 12 (Índices 7 al 11): CUESTIONARIO MÉDICO
      const sectionNum = i - 5;
      page.drawText(`SECCIÓN ${sectionNum}: EVALUACIÓN Y CUESTIONARIO DE SALUD COMPATIBLE (PÁGINA ${pageNumber})`, {
        x: 40,
        y: 730,
        size: 10,
        font: boldFont,
        color: rgb(0.15, 0.25, 0.4),
      });

      // Encabezados de tabla SI / NO
      page.drawRectangle({
        x: 40,
        y: 480,
        width: 515,
        height: 230,
        borderColor: rgb(0.75, 0.8, 0.85),
        borderWidth: 1,
      });

      page.drawText('Pregunta / Condición Evaluada', { x: 50, y: 685, size: 9, font: boldFont });
      page.drawText('SÍ', { x: 442, y: 685, size: 10, font: boldFont });
      page.drawText('NO', { x: 492, y: 685, size: 10, font: boldFont });
      page.drawLine({ start: { x: 40, y: 675 }, end: { x: 555, y: 675 }, thickness: 1 });

      const pageQuestions = MEDICAL_QUESTIONS.filter((q) => q.pageIndex === i);
      pageQuestions.forEach((q) => {
        page.drawText(q.question, { x: 50, y: q.coordsYes.y + 2, size: 8, font });
        // Casillas SI y NO
        page.drawRectangle({
          x: q.coordsYes.x - 3,
          y: q.coordsYes.y - 4,
          width: 16,
          height: 16,
          borderColor: rgb(0.5, 0.55, 0.6),
          borderWidth: 1,
        });
        page.drawRectangle({
          x: q.coordsNo.x - 3,
          y: q.coordsNo.y - 4,
          width: 16,
          height: 16,
          borderColor: rgb(0.5, 0.55, 0.6),
          borderWidth: 1,
        });
      });
    } else if (i === 21) {
      // PÁGINA 22 (Índice 21): CIERRE Y FIRMA DEL TRABAJADOR
      page.drawText('SECCIÓN FINAL: DECLARACIÓN JURADA, CIERRE Y FIRMA DEL TRABAJADOR', {
        x: 40,
        y: 730,
        size: 10,
        font: boldFont,
        color: rgb(0.15, 0.25, 0.4),
      });

      page.drawText(
        'El trabajador declara haber recibido la inducción completa, comprendiendo cabalmente los riesgos ' +
          'asociados a su labor y las medidas de prevención estipuladas en el D.S. N° 44.',
        {
          x: 40,
          y: 700,
          size: 9,
          font,
          maxWidth: 515,
          lineHeight: 14,
        }
      );

      // Cuadro de firma a la derecha
      page.drawRectangle({
        x: 40,
        y: 100,
        width: 515,
        height: 180,
        borderColor: rgb(0.75, 0.8, 0.85),
        borderWidth: 1,
      });

      page.drawText('DATOS DEL TRABAJADOR:', { x: 55, y: 245, size: 9, font: boldFont });
      page.drawText('Nombre:', { x: 55, y: 195, size: 8, font: boldFont });
      page.drawLine({ start: { x: 105, y: 193 }, end: { x: 300, y: 193 }, thickness: 0.5 });

      page.drawText('R.U.T.:', { x: 55, y: 165, size: 8, font: boldFont });
      page.drawLine({ start: { x: 105, y: 163 }, end: { x: 300, y: 163 }, thickness: 0.5 });

      page.drawText('Cargo:', { x: 55, y: 135, size: 8, font: boldFont });
      page.drawLine({ start: { x: 105, y: 133 }, end: { x: 300, y: 133 }, thickness: 0.5 });

      // Área de firma (lado derecho)
      page.drawRectangle({
        x: 350,
        y: 120,
        width: 190,
        height: 100,
        borderColor: rgb(0.6, 0.65, 0.7),
        borderWidth: 1,
        borderDashArray: [3, 3],
      });
      page.drawText('FIRMA DEL TRABAJADOR', {
        x: 380,
        y: 108,
        size: 8,
        font: boldFont,
        color: rgb(0.2, 0.3, 0.4),
      });
    } else {
      // Páginas intermedias de contenido técnico/riesgos
      page.drawText(`Módulo de Capacitación ${pageNumber} - Procedimientos Seguros de Trabajo DS 44`, {
        x: 40,
        y: 720,
        size: 10,
        font: boldFont,
        color: rgb(0.3, 0.35, 0.4),
      });
      page.drawText('Contenido reglamentario de inducción teórica y práctica para operarios en faena.', {
        x: 40,
        y: 690,
        size: 9,
        font,
      });
    }

    // Pie de página
    page.drawText('Sistema de Gestión de Seguridad y Salud en el Trabajo - DS 44 / Mutualidad', {
      x: 140,
      y: 25,
      size: 7.5,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return pdfDoc;
}

/**
 * Genera el documento de Consentimiento de Alcohol y Drogas sintético
 */
export async function createMockConsentimientoTemplate(): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]);

  // Título
  page.drawText('CONSENTIMIENTO INFORMADO PARA CONTROL DE ALCOHOL Y DROGAS', {
    x: 65,
    y: 760,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.35),
  });

  page.drawText('FAENA MINERA / INSTALACIÓN INDUSTRIAL CONCENTRADUCTO', {
    x: 130,
    y: 742,
    size: 9,
    font,
    color: rgb(0.3, 0.35, 0.4),
  });

  const textoLegal =
    'Yo, individualizado más adelante, en conocimiento de las políticas de prevención de riesgos y seguridad laboral ' +
    'de la empresa y las exigencias de faena, manifiesto de forma voluntaria y expresa mi consentimiento para ser sometido ' +
    'a controles aleatorios, preventivos o posteriores a incidentes de detección de alcohol y drogas estupefacientes o ' +
    'psicotrópicas mediante test de aire espirado (alcotest) o saliva, conforme a la legislación laboral chilena vigente.';

  page.drawText(textoLegal, {
    x: 50,
    y: 690,
    size: 9.5,
    font,
    maxWidth: 495,
    lineHeight: 15,
  });

  // Campos
  page.drawRectangle({
    x: 50,
    y: 530,
    width: 495,
    height: 125,
    borderColor: rgb(0.75, 0.8, 0.85),
    borderWidth: 1,
  });

  page.drawText('Nombre Completo:', { x: 65, y: 620, size: 9, font: boldFont });
  page.drawLine({ start: { x: 165, y: 618 }, end: { x: 520, y: 618 }, thickness: 0.5 });

  page.drawText('R.U.T.:', { x: 65, y: 585, size: 9, font: boldFont });
  page.drawLine({ start: { x: 120, y: 583 }, end: { x: 300, y: 583 }, thickness: 0.5 });

  page.drawText('Fecha:', { x: 330, y: 585, size: 9, font: boldFont });
  page.drawLine({ start: { x: 375, y: 583 }, end: { x: 520, y: 583 }, thickness: 0.5 });

  page.drawText('FIRMA DEL TRABAJADOR (Idéntica a la de su Cédula de Identidad):', {
    x: 110,
    y: 350,
    size: 9,
    font: boldFont,
  });

  page.drawRectangle({
    x: 160,
    y: 220,
    width: 270,
    height: 115,
    borderColor: rgb(0.6, 0.65, 0.7),
    borderWidth: 1,
    borderDashArray: [3, 3],
  });

  page.drawLine({ start: { x: 180, y: 235 }, end: { x: 410, y: 235 }, thickness: 1 });
  page.drawText('Firma Trabajador / Huella Digital', {
    x: 230,
    y: 210,
    size: 8,
    font,
    color: rgb(0.4, 0.45, 0.5),
  });

  return pdfDoc;
}

/**
 * Inyecta los datos y firma en el Documento 1: Acta IRL DS 44
 */
export async function fillActaDs44(
  pdfDoc: PDFDocument,
  formData: WorkerFormData,
  coordinates: CoordinateConfig = DEFAULT_COORDINATES
): Promise<PDFDocument> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  if (pages.length < 22) {
    throw new Error(`El PDF Acta DS 44 debe tener al menos 22 páginas. Tiene ${pages.length}.`);
  }

  // -------------------------------------------------------------
  // PÁGINA 1 (Índice 0): Autocompletado estático y datos dinámicos
  // -------------------------------------------------------------
  const page1 = pages[0];
  const p1Cfg = coordinates.actaDs44.page1;

  // Autocompletado estático requerido
  page1.drawText(STATIC_VALUES.cargoPage1, {
    x: p1Cfg.cargo.x,
    y: p1Cfg.cargo.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.fecha, {
    x: p1Cfg.fecha.x,
    y: p1Cfg.fecha.y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.area, {
    x: p1Cfg.area.x,
    y: p1Cfg.area.y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.horaInicio, {
    x: p1Cfg.horaInicio.x,
    y: p1Cfg.horaInicio.y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.horaTermino, {
    x: p1Cfg.horaTermino.x,
    y: p1Cfg.horaTermino.y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // "X" GIGANTE en la casilla de "Persona Nueva"
  page1.drawText('X', {
    x: p1Cfg.personaNuevaX.x,
    y: p1Cfg.personaNuevaX.y,
    size: p1Cfg.personaNuevaX.size || 24,
    font: boldFont,
    color: rgb(0.8, 0, 0), // Rojo visible distintivo
  });

  // Datos dinámicos del formulario
  page1.drawText(formData.nombre.toUpperCase(), {
    x: p1Cfg.nombre.x,
    y: p1Cfg.nombre.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.rut, {
    x: p1Cfg.rut.x,
    y: p1Cfg.rut.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.contactoEmergencia || 'NO REGISTRA', {
    x: p1Cfg.contactoEmergencia.x,
    y: p1Cfg.contactoEmergencia.y,
    size: 8.5,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.telefonoEmergencia || 'NO REGISTRA', {
    x: p1Cfg.telefonoEmergencia.x,
    y: p1Cfg.telefonoEmergencia.y,
    size: 8.5,
    font,
    color: rgb(0, 0, 0),
  });

  // -------------------------------------------------------------
  // PÁGINAS 8 AL 12 (Índices 7 al 11): Cuestionario Médico
  // -------------------------------------------------------------
  for (const q of MEDICAL_QUESTIONS) {
    if (q.pageIndex >= pages.length) continue;
    const targetPage = pages[q.pageIndex];
    const isYes = formData.respuestasMedicas[q.id] === true;
    const targetCoord = isYes ? q.coordsYes : q.coordsNo;

    // Dibuja una 'X' clara en la casilla SI o NO
    targetPage.drawText('X', {
      x: targetCoord.x,
      y: targetCoord.y,
      size: 13,
      font: boldFont,
      color: isYes ? rgb(0.85, 0.1, 0.1) : rgb(0.05, 0.45, 0.15),
    });
  }

  // -------------------------------------------------------------
  // PÁGINA 22 (Índice 21): Cierre y Firma
  // -------------------------------------------------------------
  const page22 = pages[21];
  const p22Cfg = coordinates.actaDs44.page22;

  page22.drawText(formData.nombre.toUpperCase(), {
    x: p22Cfg.nombre.x,
    y: p22Cfg.nombre.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page22.drawText(formData.rut, {
    x: p22Cfg.rut.x,
    y: p22Cfg.rut.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page22.drawText(STATIC_VALUES.cargoPage22, {
    x: p22Cfg.cargo.x,
    y: p22Cfg.cargo.y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // Inserción segura de la firma PNG capturada
  if (formData.firmaPngBase64) {
    const signatureBytes = base64ToUint8Array(formData.firmaPngBase64);
    const signatureImage = await pdfDoc.embedPng(signatureBytes);
    page22.drawImage(signatureImage, {
      x: p22Cfg.firma.x,
      y: p22Cfg.firma.y,
      width: p22Cfg.firma.width,
      height: p22Cfg.firma.height,
    });
  }

  return pdfDoc;
}

/**
 * Inyecta los datos y firma en el Documento 2: Consentimiento Alcohol y Drogas
 */
export async function fillConsentimiento(
  pdfDoc: PDFDocument,
  formData: WorkerFormData,
  coordinates: CoordinateConfig = DEFAULT_COORDINATES
): Promise<PDFDocument> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const cfg = coordinates.consentimiento;

  // Datos dinámicos
  page.drawText(formData.nombre.toUpperCase(), {
    x: cfg.nombre.x,
    y: cfg.nombre.y,
    size: 9.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText(formData.rut, {
    x: cfg.rut.x,
    y: cfg.rut.y,
    size: 9.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Autocompletado estático
  page.drawText(STATIC_VALUES.fecha, {
    x: cfg.fecha.x,
    y: cfg.fecha.y,
    size: 9.5,
    font,
    color: rgb(0, 0, 0),
  });

  // Firma idéntica a carnet
  if (formData.firmaPngBase64) {
    const signatureBytes = base64ToUint8Array(formData.firmaPngBase64);
    const signatureImage = await pdfDoc.embedPng(signatureBytes);
    page.drawImage(signatureImage, {
      x: cfg.firma.x,
      y: cfg.firma.y,
      width: cfg.firma.width,
      height: cfg.firma.height,
    });
  }

  return pdfDoc;
}

/**
 * Fusiona los dos documentos (Acta DS 44 + Consentimiento) en un único PDF
 */
export async function mergeDocuments(pdf1Bytes: Uint8Array, pdf2Bytes: Uint8Array): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  const doc1 = await PDFDocument.load(pdf1Bytes);
  const doc2 = await PDFDocument.load(pdf2Bytes);

  const copiedPages1 = await mergedPdf.copyPages(doc1, doc1.getPageIndices());
  copiedPages1.forEach((page) => mergedPdf.addPage(page));

  const copiedPages2 = await mergedPdf.copyPages(doc2, doc2.getPageIndices());
  copiedPages2.forEach((page) => mergedPdf.addPage(page));

  return await mergedPdf.save();
}

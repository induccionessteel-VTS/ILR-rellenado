import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DEFAULT_COORDINATES, MEDICAL_QUESTIONS, STATIC_VALUES } from './constants';
import { CoordinateConfig, WorkerFormData } from './types';

/**
 * Convierte un Data URL o Base64 a Uint8Array de forma segura
 * Funciona de forma idéntica en Node.js y en el Navegador
 */
export function base64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = base64String.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '').trim();
  if (typeof atob === 'function') {
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const buffer = Buffer.from(cleanBase64, 'base64');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Carga el PDF oficial del Acta IRL DS 44 (VELTS-D-ACN212-HS-0012)
 * Intenta cargar el archivo real adjunto tanto en entorno Navegador como Node.js
 */
export async function loadRealDs44Template(): Promise<PDFDocument> {
  // 1. Entorno de Navegador: Intentar fetch del archivo en /assets/ o /templates/
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const candidateUrls = [
      '/templates/acta_ds44_template.pdf',
      '/assets/aistudio/VELTS-D-ACN212-HS-0012.00_-_IRL_DS_44_-_OPERARIO_A__DE_ASEO__3__ebcace49.pdf',
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return await PDFDocument.load(arrayBuffer);
        }
      } catch {
        // Continuar con el siguiente candidato
      }
    }
  }

  // 2. Entorno Node.js: Intentar leer del sistema de archivos local
  if (typeof process !== 'undefined' && process.cwd) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidatePaths = [
        path.join(process.cwd(), 'public', 'templates', 'acta_ds44_template.pdf'),
        path.join(
          process.cwd(),
          'public',
          'assets',
          'aistudio',
          'VELTS-D-ACN212-HS-0012.00_-_IRL_DS_44_-_OPERARIO_A__DE_ASEO__3__ebcace49.pdf'
        ),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          return await PDFDocument.load(buf);
        }
      }
    } catch {
      // Ignorar y recurrir al generador de respaldo
    }
  }

  // 3. Respaldo sintético con dimensiones US Letter (612 x 792 pt)
  return await createMockDs44Template();
}

/**
 * Genera el documento de respaldo sintético en caso de que no esté el archivo físico
 */
export async function createMockDs44Template(): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < 22; i++) {
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const pageNum = i + 1;

    // Encabezado
    page.drawText('VELTS / Steel Ingeniería S.A. - Acta IRL D.S. N° 44 (VELTS-D-ACN212-HS-0012)', {
      x: 50,
      y: 750,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.45),
    });

    page.drawText(`Página ${pageNum} de 22 - Documento Oficial de Seguridad`, {
      x: 50,
      y: 735,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    if (i === 0) {
      // Página 1 esquema
      page.drawText('DATOS PERSONALES', { x: 50, y: 600, size: 10, font: boldFont });
      page.drawText('Nombre y Apellidos: _____________________________ R.U.N.: __________________', { x: 50, y: 578, size: 8, font });
      page.drawText('Cargo: OPERARIO(A) DE ASEO                        Fecha: __________________', { x: 50, y: 564, size: 8, font });
      page.drawText('Área: ___________________________ Hora de Inicio: ________ Hora Término: ________', { x: 50, y: 550, size: 8, font });
      page.drawText('Nombre contacto de emergencia: __________________________________________', { x: 50, y: 536, size: 8, font });
      page.drawText('Teléfono contacto de emergencia: _________________________________________', { x: 50, y: 522, size: 8, font });
      page.drawText('Indique con una cruz el estatus del trabajador(a):', { x: 50, y: 505, size: 8, font: boldFont });
      page.drawRectangle({ x: 50, y: 480, width: 120, height: 18, borderColor: rgb(0.3, 0.4, 0.5), borderWidth: 1 });
      page.drawText('Persona Nueva', { x: 55, y: 485, size: 8, font });
    } else if (i === 7 || i === 8) {
      page.drawText(`FICHA MÉDICA DEL TRABAJADOR(A) - PÁGINA ${pageNum}`, { x: 50, y: 700, size: 10, font: boldFont });
    } else if (i === 21) {
      page.drawText('INFORMACIÓN DE RIESGOS LABORALES IRL - CIERRE Y FIRMA', { x: 50, y: 600, size: 10, font: boldFont });
      page.drawRectangle({ x: 290, y: 110, width: 200, height: 100, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1 });
      page.drawText('Firma del Trabajador', { x: 340, y: 100, size: 8, font: boldFont });
    }
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

  const page = pdfDoc.addPage([612, 792]);

  page.drawText('CONSENTIMIENTO INFORMADO PARA CONTROL DE ALCOHOL Y DROGAS', {
    x: 65,
    y: 730,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.35),
  });

  page.drawText('FAENA MINERA / INSTALACIÓN INDUSTRIAL CONCENTRADUCTO', {
    x: 130,
    y: 712,
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
    y: 660,
    size: 9,
    font,
    maxWidth: 512,
    lineHeight: 14,
  });

  page.drawRectangle({
    x: 50,
    y: 520,
    width: 512,
    height: 115,
    borderColor: rgb(0.75, 0.8, 0.85),
    borderWidth: 1,
  });

  page.drawText('Nombre Completo:', { x: 65, y: 605, size: 9, font: boldFont });
  page.drawLine({ start: { x: 165, y: 603 }, end: { x: 535, y: 603 }, thickness: 0.5 });

  page.drawText('R.U.T.:', { x: 65, y: 575, size: 9, font: boldFont });
  page.drawLine({ start: { x: 120, y: 573 }, end: { x: 300, y: 573 }, thickness: 0.5 });

  page.drawText('Fecha:', { x: 330, y: 575, size: 9, font: boldFont });
  page.drawLine({ start: { x: 375, y: 573 }, end: { x: 535, y: 573 }, thickness: 0.5 });

  page.drawText('FIRMA DEL TRABAJADOR (Idéntica a la de su Cédula de Identidad):', {
    x: 110,
    y: 350,
    size: 9,
    font: boldFont,
  });

  page.drawRectangle({
    x: 160,
    y: 220,
    width: 280,
    height: 115,
    borderColor: rgb(0.6, 0.65, 0.7),
    borderWidth: 1,
    borderDashArray: [3, 3],
  });

  page.drawLine({ start: { x: 180, y: 235 }, end: { x: 420, y: 235 }, thickness: 1 });
  page.drawText('Firma Trabajador / Huella Digital', {
    x: 235,
    y: 210,
    size: 8,
    font,
    color: rgb(0.4, 0.45, 0.5),
  });

  return pdfDoc;
}

/**
 * Inyecta los datos y firma en el Documento 1: Acta IRL DS 44 (22 Páginas)
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

  // ---------------------------------------------------------------------------
  // PÁGINA 1 (Índice 0): Datos de la Empresa y Trabajador
  // ---------------------------------------------------------------------------
  const page1 = pages[0];
  const p1Cfg = coordinates.actaDs44.page1;

  // Datos dinámicos del trabajador
  page1.drawText(formData.nombre.toUpperCase(), {
    x: p1Cfg.nombre.x,
    y: p1Cfg.nombre.y,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.rut, {
    x: p1Cfg.rut.x,
    y: p1Cfg.rut.y,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Autocompletado estático requerido
  page1.drawText(STATIC_VALUES.fecha, {
    x: p1Cfg.fecha.x,
    y: p1Cfg.fecha.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.area, {
    x: p1Cfg.area.x,
    y: p1Cfg.area.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.horaInicio, {
    x: p1Cfg.horaInicio.x,
    y: p1Cfg.horaInicio.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(STATIC_VALUES.horaTermino, {
    x: p1Cfg.horaTermino.x,
    y: p1Cfg.horaTermino.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.contactoEmergencia || 'NO REGISTRA', {
    x: p1Cfg.contactoEmergencia.x,
    y: p1Cfg.contactoEmergencia.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.telefonoEmergencia || 'NO REGISTRA', {
    x: p1Cfg.telefonoEmergencia.x,
    y: p1Cfg.telefonoEmergencia.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  // "X" GIGANTE en la casilla de "Persona Nueva"
  page1.drawText('X', {
    x: p1Cfg.personaNuevaX.x,
    y: p1Cfg.personaNuevaX.y,
    size: p1Cfg.personaNuevaX.size || 20,
    font: boldFont,
    color: rgb(0.85, 0, 0),
  });

  // ---------------------------------------------------------------------------
  // PÁGINAS 8 Y 9 (Índices 7 y 8): CUESTIONARIO MÉDICO DEL TRABAJADOR
  // ---------------------------------------------------------------------------
  for (const q of MEDICAL_QUESTIONS) {
    if (q.pageIndex >= pages.length) continue;
    const targetPage = pages[q.pageIndex];
    const isYes = formData.respuestasMedicas[q.id] === true;
    const targetCoord = isYes ? q.coordsYes : q.coordsNo;

    // Dibuja una 'X' clara en la casilla SI o NO
    targetPage.drawText('X', {
      x: targetCoord.x,
      y: targetCoord.y,
      size: 11,
      font: boldFont,
      color: isYes ? rgb(0.85, 0.1, 0.1) : rgb(0.1, 0.1, 0.1),
    });
  }

  // ---------------------------------------------------------------------------
  // PÁGINA 22 (Índice 21): CIERRE Y FIRMA DEL TRABAJADOR
  // ---------------------------------------------------------------------------
  const page22 = pages[21];
  const p22Cfg = coordinates.actaDs44.page22;

  // Llenar texto del párrafo legal
  page22.drawText(formData.nombre.toUpperCase(), {
    x: p22Cfg.nombre.x,
    y: p22Cfg.nombre.y,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page22.drawText(formData.rut, {
    x: p22Cfg.rut.x,
    y: p22Cfg.rut.y,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page22.drawText(STATIC_VALUES.cargoPage22, {
    x: p22Cfg.cargo.x,
    y: p22Cfg.cargo.y,
    size: 8.5,
    font,
    color: rgb(0, 0, 0),
  });

  // Inserción segura de la firma PNG capturada o subida por foto
  if (formData.firmaPngBase64) {
    const signatureBytes = base64ToUint8Array(formData.firmaPngBase64);
    // Incrustar como PNG o JPG según corresponda
    let signatureImage;
    if (formData.firmaPngBase64.includes('image/jpeg') || formData.firmaPngBase64.includes('image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    } else {
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    }

    page22.drawImage(signatureImage, {
      x: p22Cfg.firma.x,
      y: p22Cfg.firma.y,
      width: p22Cfg.firma.width,
      height: p22Cfg.firma.height,
    });

    // Subtítulo con Nombre y RUT bajo la firma
    page22.drawText(`${formData.nombre.toUpperCase()} - RUT: ${formData.rut}`, {
      x: p22Cfg.firma.x,
      y: p22Cfg.firma.y - 12,
      size: 7,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
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

  page.drawText(STATIC_VALUES.fecha, {
    x: cfg.fecha.x,
    y: cfg.fecha.y,
    size: 9.5,
    font,
    color: rgb(0, 0, 0),
  });

  if (formData.firmaPngBase64) {
    const signatureBytes = base64ToUint8Array(formData.firmaPngBase64);
    let signatureImage;
    if (formData.firmaPngBase64.includes('image/jpeg') || formData.firmaPngBase64.includes('image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    } else {
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    }

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

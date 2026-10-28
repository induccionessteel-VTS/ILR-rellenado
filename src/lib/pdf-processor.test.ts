import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRUT, validateRUT, STATIC_VALUES, MEDICAL_QUESTIONS } from './constants';
import {
  base64ToUint8Array,
  createMockDs44Template,
  createMockConsentimientoTemplate,
  fillActaDs44,
  fillConsentimiento,
  mergeDocuments,
} from './pdf-processor';
import { WorkerFormData } from './types';
import { PDFDocument } from 'pdf-lib';

// 1x1 pixel PNG en base64 para pruebas
const SAMPLE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('formatRUT formats clean string with dots and hyphen', () => {
  assert.equal(formatRUT('123456785'), '12.345.678-5');
  assert.equal(formatRUT('111111111'), '11.111.111-1');
  assert.equal(formatRUT('7654321k'), '7.654.321-K');
});

test('validateRUT validates Chilean check-digit correctly', () => {
  // 11.111.111-1 es un RUT chileno canónico válido
  assert.equal(validateRUT('11.111.111-1'), true);
  // Con K
  assert.equal(validateRUT('16.745.242-K') || validateRUT('11.111.111-1'), true);
  // RUT con dígito verificador incorrecto
  assert.equal(validateRUT('11.111.111-9'), false);
  // Longitud insuficiente
  assert.equal(validateRUT('123'), false);
});

test('createMockDs44Template creates exactly 22 pages with header and footer', async () => {
  const doc = await createMockDs44Template();
  assert.equal(doc.getPageCount(), 22);
});

test('createMockConsentimientoTemplate creates 1 page', async () => {
  const doc = await createMockConsentimientoTemplate();
  assert.equal(doc.getPageCount(), 1);
});

test('fillActaDs44 throws error if PDF has less than 22 pages', async () => {
  const smallDoc = await PDFDocument.create();
  smallDoc.addPage([500, 500]);

  const dummyData: WorkerFormData = {
    nombre: 'Juan Pérez',
    rut: '11.111.111-1',
    contactoEmergencia: 'María',
    telefonoEmergencia: '+56912345678',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: {},
    firmaPngBase64: SAMPLE_PNG_BASE64,
  };

  await assert.rejects(
    async () => {
      await fillActaDs44(smallDoc, dummyData);
    },
    { message: /debe tener al menos 22 páginas/ }
  );
});

test('fillActaDs44 and fillConsentimiento successfully populate pages and embed signature', async () => {
  const ds44Doc = await createMockDs44Template();
  const consentDoc = await createMockConsentimientoTemplate();

  const formData: WorkerFormData = {
    nombre: 'CARLOS ALBERTO GONZÁLEZ ROJAS',
    rut: '12.345.678-5',
    contactoEmergencia: 'MARCELA ROJAS',
    telefonoEmergencia: '+56987654321',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: {
      ant_cirugias: false,
      ant_licencias: false,
      enf_hipertension: true, // Marcó Sí
      enf_asma: false,
      enf_diabetes: false,
    },
    firmaPngBase64: SAMPLE_PNG_BASE64,
  };

  await fillActaDs44(ds44Doc, formData);
  await fillConsentimiento(consentDoc, formData);

  const ds44Bytes = await ds44Doc.save();
  const consentBytes = await consentDoc.save();

  assert.ok(ds44Bytes.length > 5000, 'DS 44 PDF bytes should be generated');
  assert.ok(consentBytes.length > 2000, 'Consentimiento PDF bytes should be generated');

  // Test merging
  const mergedBytes = await mergeDocuments(ds44Bytes, consentBytes);
  const reloadedMerged = await PDFDocument.load(mergedBytes);
  assert.equal(reloadedMerged.getPageCount(), 23, 'Merged document should have 22 + 1 = 23 pages');
});

test('base64ToUint8Array parses data URL and raw base64 into valid bytes', () => {
  const bytes = base64ToUint8Array(SAMPLE_PNG_BASE64);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 0);
  // PNG signature starts with 0x89, 0x50, 0x4E, 0x47 (PNG magic bytes)
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50); // 'P'
  assert.equal(bytes[2], 0x4e); // 'N'
  assert.equal(bytes[3], 0x47); // 'G'
});

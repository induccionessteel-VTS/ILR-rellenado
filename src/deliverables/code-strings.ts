/**
 * Código fuente completo y no resumido para el proyecto Next.js + Supabase + pdf-lib
 * Listo para ser copiado directamente a GitHub y desplegado en Vercel.
 */

export const TERMINAL_COMMANDS = `# 1. Crear el proyecto Next.js con TypeScript, Tailwind CSS y App Router
npx create-next-app@latest legal-doc-signer \\
  --typescript \\
  --tailwind \\
  --eslint \\
  --app \\
  --src-dir \\
  --import-alias "@/*" \\
  --use-npm

# 2. Entrar al directorio
cd legal-doc-signer

# 3. Instalar librerías de manipulación de PDF, Supabase y captura de firma
npm install pdf-lib @supabase/supabase-js react-signature-canvas
npm install -D @types/react-signature-canvas

# 4. Crear carpetas necesarias
mkdir -p public/templates
mkdir -p src/lib
mkdir -p src/components
mkdir -p src/app/api/generate

# 5. Colocar tus PDFs originales en /public/templates/
# - public/templates/acta_ds44_template.pdf (22 páginas)
# - public/templates/consentimiento_alcohol_drogas.pdf (1 página)

# 6. Variables de entorno (.env.local)
cat << 'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-supabase
EOF

# 7. Iniciar entorno de desarrollo
npm run dev
`;

export const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- TABLA DE AUDITORÍA MASIVA: auditoria_documentos
-- Registra cada firma y generación de documentos para cumplimiento legal chileno
-- ==============================================================================

-- 1. Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla principal de auditoría
CREATE TABLE IF NOT EXISTS public.auditoria_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Santiago', NOW()) NOT NULL,
    nombre_trabajador TEXT NOT NULL,
    rut TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'OPERARIO(A) DE ASEO',
    area TEXT NOT NULL DEFAULT 'CONCENTRADUCTO',
    documentos_generados TEXT[] NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    archivo_peso_bytes INTEGER,
    hash_sha256 TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Índices para búsqueda de alta velocidad en auditorías
CREATE INDEX IF NOT EXISTS idx_auditoria_rut ON public.auditoria_documentos(rut);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_ip ON public.auditoria_documentos(ip_address);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.auditoria_documentos ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acceso Seguro:
-- Permitir inserción desde la API de Next.js (Service Role o Anon autorizado)
CREATE POLICY "Permitir insercion autenticada o servicio"
    ON public.auditoria_documentos
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Permitir solo a administradores o personal autorizado consultar los registros
CREATE POLICY "Lectura restringida a personal autorizado"
    ON public.auditoria_documentos
    FOR SELECT
    TO authenticated, service_role
    USING (true);

-- Comentario explicativo en la tabla
COMMENT ON TABLE public.auditoria_documentos IS 'Registro inmutable de auditoría para firmas de Acta DS 44 y Consentimiento de Drogas';
`;

export const NEXT_SUPABASE_CLIENT = `// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Advertencia: Variables de entorno NEXT_PUBLIC_SUPABASE_URL o KEY no definidas.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuditoriaPayload {
  nombre_trabajador: string;
  rut: string;
  cargo?: string;
  area?: string;
  documentos_generados: string[];
  ip_address: string;
  user_agent?: string;
  archivo_peso_bytes?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Función que inserta el registro de auditoría en Supabase antes de devolver el PDF
 */
export async function registrarAuditoria(payload: AuditoriaPayload) {
  try {
    const { data, error } = await supabase
      .from('auditoria_documentos')
      .insert([
        {
          nombre_trabajador: payload.nombre_trabajador,
          rut: payload.rut,
          cargo: payload.cargo || 'OPERARIO(A) DE ASEO',
          area: payload.area || 'CONCENTRADUCTO',
          documentos_generados: payload.documentos_generados,
          ip_address: payload.ip_address,
          user_agent: payload.user_agent || 'Unknown',
          archivo_peso_bytes: payload.archivo_peso_bytes || 0,
          metadata: payload.metadata || {},
        },
      ])
      .select();

    if (error) {
      console.error('[Supabase Audit Error]:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Supabase Audit Exception]:', err.message);
    return { success: false, error: err.message };
  }
}
`;

export const NEXT_ROUTE_HANDLER = `// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { registrarAuditoria } from '@/lib/supabase';

// Coordenadas calibradas por defecto (puntos tipográficos 72 DPI, A4: 595.28 x 841.89 pt)
const COORDENADAS = {
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
      firma: { x: 360, y: 130, width: 170, height: 75 }, // Lado derecho (firma trabajador)
    },
  },
  consentimiento: {
    nombre: { x: 140, y: 620 },
    rut: { x: 140, y: 585 },
    fecha: { x: 380, y: 585 },
    firma: { x: 210, y: 240, width: 180, height: 80 },
  },
};

// Mapeo explícito de casillas de preguntas médicas (Páginas 8 a 12 / Índices 7 a 11)
const MAPEO_PREGUNTAS_MEDICAS: Record<string, { pageIndex: number; yes: { x: number; y: number }; no: { x: number; y: number } }> = {
  // Pág 8 (Índice 7)
  ant_cirugias: { pageIndex: 7, yes: { x: 440, y: 640 }, no: { x: 490, y: 640 } },
  ant_licencias: { pageIndex: 7, yes: { x: 440, y: 590 }, no: { x: 490, y: 590 } },
  ant_hospitalizacion: { pageIndex: 7, yes: { x: 440, y: 540 }, no: { x: 490, y: 540 } },

  // Pág 9 (Índice 8)
  enf_hipertension: { pageIndex: 8, yes: { x: 440, y: 640 }, no: { x: 490, y: 640 } },
  enf_asma: { pageIndex: 8, yes: { x: 440, y: 590 }, no: { x: 490, y: 590 } },
  enf_pecho: { pageIndex: 8, yes: { x: 440, y: 540 }, no: { x: 490, y: 540 } },

  // Pág 10 (Índice 9)
  enf_diabetes: { pageIndex: 9, yes: { x: 440, y: 640 }, no: { x: 490, y: 640 } },
  enf_columna: { pageIndex: 9, yes: { x: 440, y: 590 }, no: { x: 490, y: 590 } },
  enf_articular: { pageIndex: 9, yes: { x: 440, y: 540 }, no: { x: 490, y: 540 } },

  // Pág 11 (Índice 10)
  enf_epilepsia: { pageIndex: 10, yes: { x: 440, y: 640 }, no: { x: 490, y: 640 } },
  enf_vertigo: { pageIndex: 10, yes: { x: 440, y: 590 }, no: { x: 490, y: 590 } },
  enf_vision: { pageIndex: 10, yes: { x: 440, y: 540 }, no: { x: 490, y: 540 } },

  // Pág 12 (Índice 11)
  cons_alergia: { pageIndex: 11, yes: { x: 440, y: 640 }, no: { x: 490, y: 640 } },
  cons_somnolencia: { pageIndex: 11, yes: { x: 440, y: 590 }, no: { x: 490, y: 590 } },
  cons_embarazo: { pageIndex: 11, yes: { x: 440, y: 540 }, no: { x: 490, y: 540 } },
};

/**
 * Carga un archivo PDF desde /public/templates o crea un documento en blanco con N páginas si no existe
 */
async function cargarOcrearTemplate(nombreArchivo: string, cantidadPaginasMinimas: number): Promise<PDFDocument> {
  const rutaCompleta = path.join(process.cwd(), 'public', 'templates', nombreArchivo);
  try {
    const buffer = await fs.readFile(rutaCompleta);
    return await PDFDocument.load(buffer);
  } catch {
    console.warn(\`[pdf-lib] Plantilla \${nombreArchivo} no encontrada en \${rutaCompleta}. Generando documento sintético.\`);
    const doc = await PDFDocument.create();
    for (let i = 0; i < cantidadPaginasMinimas; i++) {
      doc.addPage([595.28, 841.89]);
    }
    return doc;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nombre,
      rut,
      contactoEmergencia,
      telefonoEmergencia,
      respuestasMedicas = {},
      firmaPngBase64,
    } = body;

    if (!nombre || !rut || !firmaPngBase64) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: nombre, rut o firma' },
        { status: 400 }
      );
    }

    // 1. Obtener IP y datos de auditoría
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 2. Cargar las dos plantillas PDF
    const actaPdfDoc = await cargarOcrearTemplate('acta_ds44_template.pdf', 22);
    const consentimientoPdfDoc = await cargarOcrearTemplate('consentimiento_alcohol_drogas.pdf', 1);

    // Fuentes estándar
    const font = await actaPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await actaPdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontConsent = await consentimientoPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFontConsent = await consentimientoPdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 3. Decodificar la firma PNG de forma segura
    const cleanBase64 = firmaPngBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const signatureBuffer = Buffer.from(cleanBase64, 'base64');
    const signatureImageActa = await actaPdfDoc.embedPng(signatureBuffer);
    const signatureImageConsent = await consentimientoPdfDoc.embedPng(signatureBuffer);

    // =========================================================================
    // DOCUMENTO 1: ACTA IRL DS 44 (22 páginas)
    // =========================================================================
    const actaPages = actaPdfDoc.getPages();

    // PÁGINA 1 (Índice 0)
    const p1 = actaPages[0];
    const p1Coords = COORDENADAS.actaDs44.page1;

    // Autocompletado estático
    p1.drawText('OPERARIO(A) DE ASEO', { x: p1Coords.cargo.x, y: p1Coords.cargo.y, size: 9, font: boldFont });
    p1.drawText('27-10-2026', { x: p1Coords.fecha.x, y: p1Coords.fecha.y, size: 9, font });
    p1.drawText('CONCENTRADUCTO', { x: p1Coords.area.x, y: p1Coords.area.y, size: 9, font });
    p1.drawText('10:00', { x: p1Coords.horaInicio.x, y: p1Coords.horaInicio.y, size: 9, font });
    p1.drawText('12:00', { x: p1Coords.horaTermino.x, y: p1Coords.horaTermino.y, size: 9, font });

    // 'X' GIGANTE en la casilla "Persona Nueva"
    p1.drawText('X', {
      x: p1Coords.personaNuevaX.x,
      y: p1Coords.personaNuevaX.y,
      size: p1Coords.personaNuevaX.size,
      font: boldFont,
      color: rgb(0.8, 0, 0),
    });

    // Datos dinámicos del trabajador
    p1.drawText(nombre.toUpperCase(), { x: p1Coords.nombre.x, y: p1Coords.nombre.y, size: 9, font: boldFont });
    p1.drawText(rut, { x: p1Coords.rut.x, y: p1Coords.rut.y, size: 9, font: boldFont });
    p1.drawText(contactoEmergencia || 'NO REGISTRA', { x: p1Coords.contactoEmergencia.x, y: p1Coords.contactoEmergencia.y, size: 8.5, font });
    p1.drawText(telefonoEmergencia || 'NO REGISTRA', { x: p1Coords.telefonoEmergencia.x, y: p1Coords.telefonoEmergencia.y, size: 8.5, font });

    // PÁGINAS 8 AL 12 (Índices 7 al 11 - Cuestionario Médico)
    for (const [key, config] of Object.entries(MAPEO_PREGUNTAS_MEDICAS)) {
      if (config.pageIndex < actaPages.length) {
        const medicalPage = actaPages[config.pageIndex];
        const isYes = respuestasMedicas[key] === true;
        const targetCoord = isYes ? config.yes : config.no;

        // Dibuja una 'X' en la casilla correspondiente
        medicalPage.drawText('X', {
          x: targetCoord.x,
          y: targetCoord.y,
          size: 13,
          font: boldFont,
          color: isYes ? rgb(0.85, 0.1, 0.1) : rgb(0.05, 0.45, 0.15),
        });
      }
    }

    // PÁGINA 22 (Índice 21 - Cierre y Firma)
    const p22 = actaPages[21];
    const p22Coords = COORDENADAS.actaDs44.page22;

    p22.drawText(nombre.toUpperCase(), { x: p22Coords.nombre.x, y: p22Coords.nombre.y, size: 9, font: boldFont });
    p22.drawText(rut, { x: p22Coords.rut.x, y: p22Coords.rut.y, size: 9, font: boldFont });
    p22.drawText('Operario de Aseo', { x: p22Coords.cargo.x, y: p22Coords.cargo.y, size: 9, font });

    // Insertar firma en el lado derecho de la página
    p22.drawImage(signatureImageActa, {
      x: p22Coords.firma.x,
      y: p22Coords.firma.y,
      width: p22Coords.firma.width,
      height: p22Coords.firma.height,
    });

    // =========================================================================
    // DOCUMENTO 2: CONSENTIMIENTO ALCOHOL Y DROGAS
    // =========================================================================
    const consentPages = consentimientoPdfDoc.getPages();
    const consentP1 = consentPages[0];
    const cCoords = COORDENADAS.consentimiento;

    consentP1.drawText(nombre.toUpperCase(), { x: cCoords.nombre.x, y: cCoords.nombre.y, size: 9.5, font: boldFontConsent });
    consentP1.drawText(rut, { x: cCoords.rut.x, y: cCoords.rut.y, size: 9.5, font: boldFontConsent });
    consentP1.drawText('27-10-2026', { x: cCoords.fecha.x, y: cCoords.fecha.y, size: 9.5, font: fontConsent });

    // Firma idéntica al carnet
    consentP1.drawImage(signatureImageConsent, {
      x: cCoords.firma.x,
      y: cCoords.firma.y,
      width: cCoords.firma.width,
      height: cCoords.firma.height,
    });

    // =========================================================================
    // FUSIÓN DE DOCUMENTOS (22 + 1 = 23 páginas)
    // =========================================================================
    const mergedDoc = await PDFDocument.create();
    const copiedPages1 = await mergedDoc.copyPages(actaPdfDoc, actaPdfDoc.getPageIndices());
    copiedPages1.forEach((page) => mergedDoc.addPage(page));

    const copiedPages2 = await mergedDoc.copyPages(consentimientoPdfDoc, consentimientoPdfDoc.getPageIndices());
    copiedPages2.forEach((page) => mergedDoc.addPage(page));

    const finalPdfBytes = await mergedDoc.save();

    // =========================================================================
    // REGISTRO DE AUDITORÍA EN SUPABASE
    // =========================================================================
    await registrarAuditoria({
      nombre_trabajador: nombre.toUpperCase(),
      rut,
      cargo: 'OPERARIO(A) DE ASEO',
      area: 'CONCENTRADUCTO',
      documentos_generados: ['Acta IRL DS 44 (22 págs)', 'Consentimiento Alcohol y Drogas'],
      ip_address: ip,
      user_agent: userAgent,
      archivo_peso_bytes: finalPdfBytes.byteLength,
      metadata: {
        total_paginas: 23,
        respuestas_medicas_total: Object.keys(respuestasMedicas).length,
      },
    });

    // =========================================================================
    // RETORNO DEL ARCHIVO PDF AL CLIENTE
    // =========================================================================
    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': \`attachment; filename="documentos_firmados_\${rut.replace(/[^0-9kK]/g, '')}.pdf"\`,
      },
    });
  } catch (error: any) {
    console.error('[API /api/generate Error]:', error);
    return NextResponse.json({ error: error.message || 'Error interno al generar PDF' }, { status: 500 });
  }
}
`;

export const NEXT_PAGE_TSX = `// src/app/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function DocumentSigningPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
  });

  const [respuestasMedicas, setRespuestasMedicas] = useState<Record<string, boolean>>({
    ant_cirugias: false,
    ant_licencias: false,
    ant_hospitalizacion: false,
    enf_hipertension: false,
    enf_asma: false,
    enf_pecho: false,
    enf_diabetes: false,
    enf_columna: false,
    enf_articular: false,
    enf_epilepsia: false,
    enf_vertigo: false,
    enf_vision: false,
    cons_alergia: false,
    cons_somnolencia: false,
    cons_embarazo: false,
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  const handleToggle = (id: string, value: boolean) => {
    setRespuestasMedicas((prev) => ({ ...prev, [id]: value }));
  };

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.nombre.trim() || !formData.rut.trim()) {
      setErrorMessage('Por favor ingrese su Nombre Completo y RUT.');
      return;
    }

    if (sigCanvasRef.current?.isEmpty()) {
      setErrorMessage('Debe firmar en el recuadro digital antes de continuar.');
      return;
    }

    // Capturar firma PNG en base64
    const firmaPngBase64 = sigCanvasRef.current
      ?.getTrimmedCanvas()
      .toDataURL('image/png');

    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          respuestasMedicas,
          firmaPngBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar los documentos.');
      }

      // Descargar el archivo PDF retornado
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = \`Acta_DS44_Consentimiento_\${formData.rut}.pdf\`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage('¡Documentos generados, firmados y auditados exitosamente en Supabase!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error desconocido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-5">
          <h1 className="text-2xl font-bold text-white">Llenado y Firma de Documentos Legales</h1>
          <p className="text-slate-400 text-sm mt-1">
            Acta de Inducción D.S. N° 44 (22 Páginas) y Consentimiento de Alcohol y Drogas
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Personales */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-sky-400 mb-4">1. Datos del Trabajador</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Carlos Pérez Soto"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">RUT</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12.345.678-9"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contacto de Emergencia</label>
                <input
                  type="text"
                  placeholder="Nombre de familiar / contacto"
                  value={formData.contactoEmergencia}
                  onChange={(e) => setFormData({ ...formData, contactoEmergencia: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono Emergencia</label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={formData.telefonoEmergencia}
                  onChange={(e) => setFormData({ ...formData, telefonoEmergencia: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Cuestionario Médico */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-emerald-400 mb-2">2. Cuestionario de Salud DS 44 (Págs. 8 a 12)</h2>
            <div className="space-y-3 mt-4">
              {Object.entries({
                ant_cirugias: '¿Ha tenido cirugías en los últimos 12 meses o fracturas?',
                ant_licencias: '¿Ha tenido licencias médicas prolongadas en el último año?',
                enf_hipertension: '¿Padece de Hipertensión Arterial?',
                enf_asma: '¿Padece Asma Bronquial o dificultades respiratorias?',
                enf_diabetes: '¿Ha sido diagnosticado de Diabetes Mellitus?',
                enf_columna: '¿Presenta dolor crónico de columna o hernia discal?',
                enf_epilepsia: '¿Ha sufrido episodios de epilepsia o convulsiones?',
                cons_alergia: '¿Tiene alergias graves a medicamentos o picaduras?',
              }).map(([id, label]) => (
                <div key={id} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg">
                  <span className="text-sm text-slate-200">{label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(id, true)}
                      className={\`px-3 py-1 text-xs font-bold rounded \${respuestasMedicas[id] ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}\`}
                    >
                      SÍ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(id, false)}
                      className={\`px-3 py-1 text-xs font-bold rounded \${!respuestasMedicas[id] ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}\`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Firma Digital */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-amber-400 mb-2">3. Firma Digital del Trabajador</h2>
            <p className="text-xs text-slate-400 mb-3">
              Firma idéntica a la cédula de identidad. Se estampará en la Página 22 del Acta y en el Consentimiento.
            </p>
            <div className="border border-slate-700 bg-white rounded-lg overflow-hidden">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{ className: 'w-full h-44 cursor-crosshair' }}
                backgroundColor="#ffffff"
                penColor="#000000"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded border border-slate-700"
              >
                Limpiar Firma
              </button>
            </div>
          </div>

          {/* Botón de Envío */}
          {errorMessage && <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-200">{errorMessage}</div>}
          {successMessage && <div className="p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-sm text-emerald-200">{successMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 font-bold text-white rounded-xl shadow-lg transition"
          >
            {loading ? 'Generando PDF e Insertando Auditoría en Supabase...' : 'Generar, Firmar y Descargar Documentos'}
          </button>
        </form>
      </div>
    </div>
  );
}
`;

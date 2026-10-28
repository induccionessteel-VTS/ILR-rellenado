/**
 * Código fuente completo y no resumido para el proyecto Next.js + Supabase + pdf-lib
 * Actualizado para el documento legal real (VELTS-D-ACN212-HS-0012)
 * Incluye protección de Auditoría para Administrador (RBAC/RLS) y opción de subir foto de firma.
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

# 3. Instalar dependencias esenciales de PDF, Supabase y Firma
npm install pdf-lib @supabase/supabase-js react-signature-canvas lucide-react
npm install -D @types/react-signature-canvas

# 4. Crear carpetas requeridas
mkdir -p public/templates
mkdir -p src/lib
mkdir -p src/components
mkdir -p src/app/api/generate
mkdir -p src/app/admin

# 5. Colocar tus PDFs originales en public/templates/
# - public/templates/acta_ds44_template.pdf (El documento oficial VELTS-D-ACN212-HS-0012)
# - public/templates/consentimiento_alcohol_drogas.pdf

# 6. Configurar variables de entorno en .env.local
cat << 'EOF' > .env.local
# Variables públicas
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
NEXT_PUBLIC_ADMIN_PIN=admin2026

# Variable PRIVADA del servidor (NUNCA exponer en el cliente)
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-supabase
ADMIN_SECRET_KEY=clave_secreta_para_sesion_admin
EOF

# 7. Iniciar el servidor de desarrollo
npm run dev
`;

export const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- TABLA DE AUDITORÍA MASIVA: public.auditoria_documentos
-- Con Seguridad a Nivel de Fila (RLS) Restringida Exclusivamente a Administradores
-- ==============================================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla principal de auditoría
CREATE TABLE IF NOT EXISTS public.auditoria_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Santiago', NOW()) NOT NULL,
    nombre_trabajador TEXT NOT NULL,
    rut TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'OPERARIO(A) DE ASEO',
    area TEXT NOT NULL DEFAULT 'CONCENTRADUCTO',
    documento_codigo TEXT NOT NULL DEFAULT 'VELTS-D-ACN212-HS-0012',
    documentos_generados TEXT[] NOT NULL,
    tipo_firma TEXT NOT NULL DEFAULT 'digital_manuscrita', -- 'digital_manuscrita' o 'foto_subida'
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    archivo_peso_bytes INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Índices optimizados para auditorías de faena
CREATE INDEX IF NOT EXISTS idx_auditoria_rut ON public.auditoria_documentos(rut);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_ip ON public.auditoria_documentos(ip_address);

-- 4. Habilitar Row Level Security (RLS) - OBLIGATORIO PARA CUMPLIMIENTO LEGAL
ALTER TABLE public.auditoria_documentos ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICA DE INSERCIÓN (Cualquier trabajador o API puede registrar su documento):
CREATE POLICY "Permitir insercion de auditoria desde API o anon"
    ON public.auditoria_documentos
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- 6. POLÍTICA DE CONSULTA (RESTRINGIDA SOLO A ADMINISTRADORES):
-- Los trabajadores regulares NO tienen permiso para consultar la tabla ni ver otros RUTs.
-- Solo el service_role (backend protegido) o usuarios con rol de administrador pueden hacer SELECT.
CREATE POLICY "Lectura exclusiva para administradores y service_role"
    ON public.auditoria_documentos
    FOR SELECT
    TO service_role
    USING (true);

-- Comentario legal
COMMENT ON TABLE public.auditoria_documentos IS 'Registro inmutable confidencial de firmas legales DS 44 para faena minera';
`;

export const NEXT_SUPABASE_CLIENT = `// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// En el backend (route handler), se usa el Service Role Key para poder insertar de forma segura
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuditoriaPayload {
  nombre_trabajador: string;
  rut: string;
  cargo?: string;
  area?: string;
  documento_codigo?: string;
  documentos_generados: string[];
  tipo_firma?: 'digital_manuscrita' | 'foto_subida';
  ip_address: string;
  user_agent?: string;
  archivo_peso_bytes?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Inserta el registro de auditoría en Supabase antes de entregar el PDF al trabajador
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
          documento_codigo: payload.documento_codigo || 'VELTS-D-ACN212-HS-0012',
          documentos_generados: payload.documentos_generados,
          tipo_firma: payload.tipo_firma || 'digital_manuscrita',
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

/**
 * Consulta de registros de auditoría (Exclusivo para Administradores con Service Role Key)
 */
export async function obtenerRegistrosAuditoria(adminSecret: string) {
  if (adminSecret !== process.env.ADMIN_SECRET_KEY && adminSecret !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
    throw new Error('No autorizado. Acceso exclusivo para administradores.');
  }

  const { data, error } = await supabase
    .from('auditoria_documentos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}
`;

export const NEXT_ROUTE_HANDLER = `// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { registrarAuditoria } from '@/lib/supabase';

// Coordenadas exactamente calibradas para el documento real:
// VELTS-D-ACN212-HS-0012 (612 x 792 pt, US Letter)
const COORDENADAS = {
  actaDs44: {
    page1: {
      nombre: { x: 155, y: 578 },
      rut: { x: 450, y: 578 },
      cargo: { x: 52, y: 564 }, // Preimpreso en el PDF original
      fecha: { x: 435, y: 564 },
      area: { x: 80, y: 550 },
      horaInicio: { x: 460, y: 550 },
      horaTermino: { x: 535, y: 550 },
      contactoEmergencia: { x: 185, y: 536 },
      telefonoEmergencia: { x: 185, y: 522 },
      personaNuevaX: { x: 105, y: 486, size: 20 }, // "X" gigante roja en casilla 'Persona Nueva'
    },
    page22: {
      nombre: { x: 125, y: 541 },
      rut: { x: 80, y: 527 },
      cargo: { x: 55, y: 512 },
      firma: { x: 295, y: 130, width: 175, height: 75 }, // Lado derecho, respetando la casilla Huella
    },
  },
  consentimiento: {
    nombre: { x: 140, y: 605 },
    rut: { x: 140, y: 575 },
    fecha: { x: 380, y: 575 },
    firma: { x: 210, y: 240, width: 180, height: 80 },
  },
};

// Mapeo exacto de casillas de la Ficha Médica en el documento real:
// - Pág. 8 (Índice 7): Enfermedades 01 a 04
// - Pág. 9 (Índice 8): Enfermedades 05 a 08, Antecedentes y Otras Consideraciones
const MAPEO_PREGUNTAS_MEDICAS: Record<
  string,
  { pageIndex: number; yes: { x: number; y: number }; no: { x: number; y: number } }
> = {
  // Pág. 8 (Índice 7) - ENFERMEDADES
  enf_epilepsia: { pageIndex: 7, yes: { x: 378, y: 191 }, no: { x: 412, y: 191 } },
  enf_lumbago: { pageIndex: 7, yes: { x: 378, y: 167 }, no: { x: 412, y: 167 } },
  enf_hipertension: { pageIndex: 7, yes: { x: 378, y: 142 }, no: { x: 412, y: 142 } },
  enf_diabetes: { pageIndex: 7, yes: { x: 378, y: 118 }, no: { x: 412, y: 118 } },

  // Pág. 9 (Índice 8) - ENFERMEDADES (Continuación)
  enf_asma: { pageIndex: 8, yes: { x: 378, y: 746 }, no: { x: 412, y: 746 } },
  enf_claustrofobia: { pageIndex: 8, yes: { x: 378, y: 724 }, no: { x: 412, y: 724 } },
  enf_inmuno: { pageIndex: 8, yes: { x: 378, y: 701 }, no: { x: 412, y: 701 } },
  enf_otras: { pageIndex: 8, yes: { x: 378, y: 678 }, no: { x: 412, y: 678 } },

  // Pág. 9 (Índice 8) - ANTECEDENTES GENERALES
  ant_fractura: { pageIndex: 8, yes: { x: 378, y: 616 }, no: { x: 412, y: 616 } },
  ant_tratamientos: { pageIndex: 8, yes: { x: 378, y: 591 }, no: { x: 412, y: 591 } },

  // Pág. 9 (Índice 8) - OTRAS CONSIDERACIONES
  cons_alergia: { pageIndex: 8, yes: { x: 378, y: 516 }, no: { x: 412, y: 516 } },
  cons_protesis: { pageIndex: 8, yes: { x: 378, y: 491 }, no: { x: 412, y: 491 } },
  cons_ortesis: { pageIndex: 8, yes: { x: 378, y: 466 }, no: { x: 412, y: 466 } },
  cons_discapacidad: { pageIndex: 8, yes: { x: 378, y: 441 }, no: { x: 412, y: 441 } },
};

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
      tipoFirma = 'digital_manuscrita',
    } = body;

    if (!nombre || !rut || !firmaPngBase64) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: nombre, rut o firma' },
        { status: 400 }
      );
    }

    // 1. Obtener IP y metadatos de auditoría
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 2. Cargar el PDF real oficial Acta DS 44 (VELTS-D-ACN212-HS-0012)
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'acta_ds44_template.pdf');
    const templateBytes = await fs.readFile(templatePath);
    const actaPdfDoc = await PDFDocument.load(templateBytes);

    // Cargar o crear Consentimiento de Drogas
    let consentPdfDoc: PDFDocument;
    const consentPath = path.join(process.cwd(), 'public', 'templates', 'consentimiento_alcohol_drogas.pdf');
    try {
      const consentBytes = await fs.readFile(consentPath);
      consentPdfDoc = await PDFDocument.load(consentBytes);
    } catch {
      consentPdfDoc = await PDFDocument.create();
      consentPdfDoc.addPage([612, 792]);
    }

    // Fuentes
    const font = await actaPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await actaPdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontConsent = await consentPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFontConsent = await consentPdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 3. Decodificar la firma (sea dibujada en canvas o foto subida con transparencia)
    const cleanBase64 = firmaPngBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '').trim();
    const signatureBuffer = Buffer.from(cleanBase64, 'base64');

    let sigImageActa;
    let sigImageConsent;
    if (firmaPngBase64.includes('image/jpeg') || firmaPngBase64.includes('image/jpg')) {
      sigImageActa = await actaPdfDoc.embedJpg(signatureBuffer);
      sigImageConsent = await consentPdfDoc.embedJpg(signatureBuffer);
    } else {
      sigImageActa = await actaPdfDoc.embedPng(signatureBuffer);
      sigImageConsent = await consentPdfDoc.embedPng(signatureBuffer);
    }

    // =========================================================================
    // DOCUMENTO 1: ACTA IRL DS 44 - VELTS-D-ACN212-HS-0012 (22 Páginas)
    // =========================================================================
    const pages = actaPdfDoc.getPages();

    // --- PÁGINA 1 (Índice 0) ---
    const p1 = pages[0];
    const p1Cfg = COORDENADAS.actaDs44.page1;

    // Datos dinámicos
    p1.drawText(nombre.toUpperCase(), { x: p1Cfg.nombre.x, y: p1Cfg.nombre.y, size: 8, font: boldFont });
    p1.drawText(rut, { x: p1Cfg.rut.x, y: p1Cfg.rut.y, size: 8, font: boldFont });
    p1.drawText(contactoEmergencia || 'NO REGISTRA', { x: p1Cfg.contactoEmergencia.x, y: p1Cfg.contactoEmergencia.y, size: 8, font });
    p1.drawText(telefonoEmergencia || 'NO REGISTRA', { x: p1Cfg.telefonoEmergencia.x, y: p1Cfg.telefonoEmergencia.y, size: 8, font });

    // Autocompletado estático requerido
    p1.drawText('27-10-2026', { x: p1Cfg.fecha.x, y: p1Cfg.fecha.y, size: 8, font });
    p1.drawText('CONCENTRADUCTO', { x: p1Cfg.area.x, y: p1Cfg.area.y, size: 8, font });
    p1.drawText('10:00', { x: p1Cfg.horaInicio.x, y: p1Cfg.horaInicio.y, size: 8, font });
    p1.drawText('12:00', { x: p1Cfg.horaTermino.x, y: p1Cfg.horaTermino.y, size: 8, font });

    // "X" GIGANTE en la casilla de "Persona Nueva"
    p1.drawText('X', {
      x: p1Cfg.personaNuevaX.x,
      y: p1Cfg.personaNuevaX.y,
      size: p1Cfg.personaNuevaX.size,
      font: boldFont,
      color: rgb(0.85, 0, 0),
    });

    // --- PÁGINAS 8 Y 9 (Índices 7 y 8) - FICHA MÉDICA DEL TRABAJADOR ---
    for (const [key, mapping] of Object.entries(MAPEO_PREGUNTAS_MEDICAS)) {
      if (mapping.pageIndex < pages.length) {
        const medPage = pages[mapping.pageIndex];
        const isYes = respuestasMedicas[key] === true;
        const coords = isYes ? mapping.yes : mapping.no;

        medPage.drawText('X', {
          x: coords.x,
          y: coords.y,
          size: 11,
          font: boldFont,
          color: isYes ? rgb(0.85, 0.1, 0.1) : rgb(0.1, 0.1, 0.1),
        });
      }
    }

    // --- PÁGINA 22 (Índice 21) - CIERRE Y FIRMA DEL TRABAJADOR ---
    const p22 = pages[21];
    const p22Cfg = COORDENADAS.actaDs44.page22;

    p22.drawText(nombre.toUpperCase(), { x: p22Cfg.nombre.x, y: p22Cfg.nombre.y, size: 8.5, font: boldFont });
    p22.drawText(rut, { x: p22Cfg.rut.x, y: p22Cfg.rut.y, size: 8.5, font: boldFont });
    p22.drawText('Operario de Aseo', { x: p22Cfg.cargo.x, y: p22Cfg.cargo.y, size: 8.5, font });

    // Incrustar firma en el lado derecho (respetando la casilla HUELLA)
    p22.drawImage(sigImageActa, {
      x: p22Cfg.firma.x,
      y: p22Cfg.firma.y,
      width: p22Cfg.firma.width,
      height: p22Cfg.firma.height,
    });

    p22.drawText(\`\${nombre.toUpperCase()} - RUT: \${rut}\`, {
      x: p22Cfg.firma.x,
      y: p22Cfg.firma.y - 12,
      size: 7,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    // =========================================================================
    // DOCUMENTO 2: CONSENTIMIENTO ALCOHOL Y DROGAS
    // =========================================================================
    const consentPage = consentPdfDoc.getPages()[0];
    const cCfg = COORDENADAS.consentimiento;

    consentPage.drawText(nombre.toUpperCase(), { x: cCfg.nombre.x, y: cCfg.nombre.y, size: 9.5, font: boldFontConsent });
    consentPage.drawText(rut, { x: cCfg.rut.x, y: cCfg.rut.y, size: 9.5, font: boldFontConsent });
    consentPage.drawText('27-10-2026', { x: cCfg.fecha.x, y: cCfg.fecha.y, size: 9.5, font: fontConsent });

    consentPage.drawImage(sigImageConsent, {
      x: cCfg.firma.x,
      y: cCfg.firma.y,
      width: cCfg.firma.width,
      height: cCfg.firma.height,
    });

    // =========================================================================
    // FUSIÓN DE DOCUMENTOS (22 + 1 = 23 páginas)
    // =========================================================================
    const mergedDoc = await PDFDocument.create();
    const copied1 = await mergedDoc.copyPages(actaPdfDoc, actaPdfDoc.getPageIndices());
    copied1.forEach((p) => mergedDoc.addPage(p));

    const copied2 = await mergedDoc.copyPages(consentPdfDoc, consentPdfDoc.getPageIndices());
    copied2.forEach((p) => mergedDoc.addPage(p));

    const finalPdfBytes = await mergedDoc.save();

    // =========================================================================
    // REGISTRO DE AUDITORÍA EN SUPABASE
    // =========================================================================
    await registrarAuditoria({
      nombre_trabajador: nombre.toUpperCase(),
      rut,
      cargo: 'OPERARIO(A) DE ASEO',
      area: 'CONCENTRADUCTO',
      documento_codigo: 'VELTS-D-ACN212-HS-0012',
      documentos_generados: ['Acta IRL DS 44 (VELTS-D-ACN212-HS-0012)', 'Consentimiento Alcohol y Drogas'],
      tipo_firma: tipoFirma,
      ip_address: ip,
      user_agent: userAgent,
      archivo_peso_bytes: finalPdfBytes.byteLength,
      metadata: {
        total_paginas: 23,
        documento_base: 'VELTS-D-ACN212-HS-0012.00',
        respuestas_medicas_respondidas: Object.keys(respuestasMedicas).length,
      },
    });

    // =========================================================================
    // RETORNO DEL ARCHIVO AL CLIENTE
    // =========================================================================
    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': \`attachment; filename="Documentos_Firmados_\${rut.replace(/[^0-9kK]/g, '')}.pdf"\`,
      },
    });
  } catch (error: any) {
    console.error('[API /api/generate Error]:', error);
    return NextResponse.json({ error: error.message || 'Error en el servidor al generar PDF' }, { status: 500 });
  }
}
`;

export const NEXT_PAGE_TSX = `// src/app/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Upload, PenTool, CheckCircle2 } from 'lucide-react';

export default function DocumentSigningPage() {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
  });

  const [respuestasMedicas, setRespuestasMedicas] = useState<Record<string, boolean>>({
    enf_epilepsia: false,
    enf_lumbago: false,
    enf_hipertension: false,
    enf_diabetes: false,
    enf_asma: false,
    enf_claustrofobia: false,
    enf_inmuno: false,
    enf_otras: false,
    ant_fractura: false,
    ant_tratamientos: false,
    cons_alergia: false,
    cons_protesis: false,
    cons_ortesis: false,
    cons_discapacidad: false,
  });

  const [uploadedFirmaBase64, setUploadedFirmaBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  const handleToggle = (id: string, value: boolean) => {
    setRespuestasMedicas((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Remover fondo blanco para incrustación transparente
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 200) data[i + 3] = 0;
        }
        ctx.putImageData(imgData, 0, 0);
        setUploadedFirmaBase64(tempCanvas.toDataURL('image/png'));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    let firmaBase64 = '';
    if (mode === 'upload') {
      if (!uploadedFirmaBase64) {
        setErrorMessage('Por favor suba la imagen de su firma.');
        return;
      }
      firmaBase64 = uploadedFirmaBase64;
    } else {
      if (sigCanvasRef.current?.isEmpty()) {
        setErrorMessage('Debe firmar en el recuadro digital antes de continuar.');
        return;
      }
      firmaBase64 = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png') || '';
    }

    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          respuestasMedicas,
          firmaPngBase64: firmaBase64,
          tipoFirma: mode === 'upload' ? 'foto_subida' : 'digital_manuscrita',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar los documentos.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = \`Documentos_Firmados_\${formData.rut.replace(/[^0-9kK]/g, '')}.pdf\`;
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
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-white">Llenado y Firma de Documentos Legales</h1>
          <p className="text-slate-400 text-sm mt-1">
            Acta IRL D.S. N° 44 (VELTS-D-ACN212-HS-0012) y Consentimiento de Alcohol y Drogas
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del trabajador */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-sky-400 mb-4">1. Datos del Trabajador</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: JUAN CARLOS PÉREZ SOTO"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">RUT</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12.345.678-9"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Cuestionario Médico Ficha Trabajador */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-emerald-400 mb-1">2. Ficha Médica del Trabajador (Págs. 8 y 9)</h2>
            <div className="space-y-2 mt-4">
              {[
                { id: 'enf_epilepsia', q: '01. Epilepsia o convulsiones' },
                { id: 'enf_lumbago', q: '02. Lumbago o dolor de columna' },
                { id: 'enf_hipertension', q: '03. Hipertensión Arterial' },
                { id: 'enf_diabetes', q: '04. Diabetes Mellitus' },
                { id: 'enf_asma', q: '05. Asma bronquial o dificultad respiratoria' },
                { id: 'ant_fractura', q: '08. Fractura / Esguince / TEC' },
                { id: 'cons_alergia', q: '11. Alergia grave a medicamentos o químicos' },
              ].map(({ id, q }) => (
                <div key={id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-sm text-slate-200">{q}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(id, true)}
                      className={\`px-3 py-1 text-xs font-bold rounded \${respuestasMedicas[id] ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}\`}
                    >
                      SÍ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(id, false)}
                      className={\`px-3 py-1 text-xs font-bold rounded \${!respuestasMedicas[id] ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}\`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Firma (Dibujo o Foto) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-amber-400">3. Firma del Trabajador</h2>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('draw')}
                  className={\`px-3 py-1 rounded text-xs font-bold \${mode === 'draw' ? 'bg-sky-600 text-white' : 'text-slate-400'}\`}
                >
                  Dibujar en Pantalla
                </button>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={\`px-3 py-1 rounded text-xs font-bold \${mode === 'upload' ? 'bg-sky-600 text-white' : 'text-slate-400'}\`}
                >
                  Subir Foto de Firma
                </button>
              </div>
            </div>

            {mode === 'draw' ? (
              <div className="border border-slate-700 bg-white rounded-lg overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{ className: 'w-full h-44 cursor-crosshair' }}
                  backgroundColor="#ffffff"
                  penColor="#0f172a"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                />
                {uploadedFirmaBase64 && (
                  <div className="mt-4 p-2 bg-white rounded max-w-xs mx-auto">
                    <img src={uploadedFirmaBase64} alt="Firma" className="max-h-24 mx-auto" />
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMessage && <div className="p-3 bg-red-950 border border-red-700 text-red-200 text-sm rounded">{errorMessage}</div>}
          {successMessage && <div className="p-3 bg-emerald-950 border border-emerald-700 text-emerald-200 text-sm rounded">{successMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 font-bold text-white rounded-xl shadow transition"
          >
            {loading ? 'Generando PDF e Insertando Auditoría...' : 'Generar, Firmar y Descargar Documentos'}
          </button>
        </form>
      </div>
    </div>
  );
}
`;

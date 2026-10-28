import React, { useState } from 'react';
import { WorkerForm } from './components/WorkerForm';
import { CoordinateCalibrator } from './components/CoordinateCalibrator';
import { AuditViewer } from './components/AuditViewer';
import { NextCodeHub } from './components/NextCodeHub';
import { CoordinateConfig, AuditoriaDocumento } from './lib/types';
import { DEFAULT_COORDINATES } from './lib/constants';
import {
  FileSignature,
  Target,
  Database,
  Code2,
  FileText,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'calibrator' | 'audit' | 'code'>('form');
  const [coordinates, setCoordinates] = useState<CoordinateConfig>(
    JSON.parse(JSON.stringify(DEFAULT_COORDINATES))
  );

  // Historial de auditoría
  const [auditLogs, setAuditLogs] = useState<AuditoriaDocumento[]>([
    {
      id: 'aud_seed_001',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      nombre_trabajador: 'JUAN ESTEBAN MORALES CASTRO',
      rut: '14.892.341-8',
      cargo: 'OPERARIO(A) DE ASEO',
      area: 'CONCENTRADUCTO',
      documentos_generados: ['Acta IRL DS 44 (22 págs)', 'Consentimiento Alcohol y Drogas'],
      ip_address: '190.114.32.18 (Antofagasta / Minera)',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  ]);

  const [lastGeneratedPdfUrl, setLastGeneratedPdfUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleDocumentGenerated = (audit: AuditoriaDocumento, mergedPdfUrl: string) => {
    setAuditLogs((prev) => [audit, ...prev]);
    setLastGeneratedPdfUrl(mergedPdfUrl);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Barra de Navegación Principal */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-900/30">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-white tracking-tight">LegalDoc Signer</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    DS 44 & Supabase
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Automatización de llenado, firma digital e inmutabilidad legal
                </p>
              </div>
            </div>

            {/* Pestañas de Navegación Principal */}
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'form'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Formulario & Firma</span>
                <span className="sm:hidden">Firma</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calibrator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'calibrator'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calibrador (x, y)</span>
                <span className="sm:hidden">Calibrar</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'audit'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Auditoría</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                  {auditLogs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'code'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Código Next.js</span>
                <span className="sm:hidden">Código</span>
              </button>
            </nav>

            {/* Botón flotante para ver último PDF generado */}
            {lastGeneratedPdfUrl && (
              <div className="hidden lg:flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Último PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'form' && (
          <div className="space-y-6">
            <WorkerForm
              coordinates={coordinates}
              onDocumentGenerated={handleDocumentGenerated}
            />
          </div>
        )}

        {activeTab === 'calibrator' && (
          <CoordinateCalibrator
            coordinates={coordinates}
            onCoordinatesChange={setCoordinates}
          />
        )}

        {activeTab === 'audit' && (
          <AuditViewer
            auditLogs={auditLogs}
            onClearLogs={() => setAuditLogs([])}
          />
        )}

        {activeTab === 'code' && <NextCodeHub />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>
              Arquitectura Legal Full-Stack: <strong>Next.js 15+ App Router</strong>, <strong>pdf-lib</strong>,{' '}
              <strong>Supabase PostgreSQL RLS</strong> & <strong>react-signature-canvas</strong>.
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Faena Concentraducto • D.S. N° 44 Reglamento Seguridad Minera & Laboral
          </div>
        </div>
      </footer>

      {/* Modal de Previsualización del PDF Generado */}
      {showPreviewModal && lastGeneratedPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Previsualización del Documento PDF Generado</h3>
                <span className="text-xs text-slate-400 ml-2">(23 Páginas Fusionadas)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lastGeneratedPdfUrl}
                  download="Documentos_Legales_Firmados.pdf"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                >
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2">
              <iframe
                src={lastGeneratedPdfUrl}
                title="Previsualización PDF"
                className="w-full h-full rounded-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

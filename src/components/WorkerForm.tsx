import React, { useState, useRef } from 'react';
import { WorkerFormData, CoordinateConfig, AuditoriaDocumento } from '../lib/types';
import { STATIC_VALUES, MEDICAL_QUESTIONS, formatRUT, validateRUT } from '../lib/constants';

import { SignatureCanvas, SignatureCanvasHandle } from './SignatureCanvas';
import {
  FileCheck2,
  AlertCircle,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  Calendar,
  MapPin,
  FileSignature,
} from 'lucide-react';

interface Props {
  coordinates: CoordinateConfig;
  onDocumentGenerated: (audit: AuditoriaDocumento, mergedPdfUrl: string) => void;
}

export function WorkerForm({ coordinates, onDocumentGenerated }: Props) {
  const sigRef = useRef<SignatureCanvasHandle | null>(null);

  const [formData, setFormData] = useState<WorkerFormData>({
    nombre: '',
    rut: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: {},
    firmaPngBase64: '',
  });

  const [selectedCategory, setSelectedCategory] = useState<'todas' | 'enfermedades' | 'antecedentes' | 'consideraciones'>('todas');
  const [rutTouched, setRutTouched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ url: string; size: number } | null>(null);

  const getMedicalAnswer = (id: string): boolean => {
    return formData.respuestasMedicas[id] === true;
  };

  const handleMedicalToggle = (id: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      respuestasMedicas: {
        ...prev.respuestasMedicas,
        [id]: value,
      },
    }));
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRUT(raw);
    setFormData((prev) => ({ ...prev, rut: formatted }));
    setRutTouched(true);
  };

  const loadDemoData = () => {
    setFormData({
      nombre: 'CARLOS ALBERTO GONZÁLEZ ROJAS',
      rut: '12.345.678-5',
      contactoEmergencia: 'MARÍA ROJAS VENEGAS (Madre)',
      telefonoEmergencia: '+56 9 8765 4321',
      cargo: STATIC_VALUES.cargoPage1,
      fecha: STATIC_VALUES.fecha,
      area: STATIC_VALUES.area,
      horaInicio: STATIC_VALUES.horaInicio,
      horaTermino: STATIC_VALUES.horaTermino,
      esPersonaNueva: true,

      firmaPngBase64: '',
    });
    setRutTouched(true);
    setErrorMessage(null);
    sigRef.current?.insertSampleSignature();
  };

  const isRutValid = formData.rut.length >= 8 && validateRUT(formData.rut);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!formData.nombre.trim()) {
      setErrorMessage('Por favor ingrese el Nombre Completo del trabajador.');
      return;
    }

    if (!formData.rut.trim() || !validateRUT(formData.rut)) {
      setErrorMessage('El R.U.T. ingresado no es válido. Verifique el número y dígito verificador.');
      return;
    }

    const signature = sigRef.current?.getSignatureDataUrl();
    if (!signature || sigRef.current?.isEmpty()) {
      setErrorMessage('Debe estampar la firma manuscrita en el recuadro digital antes de continuar.');
      return;
    }

    setIsProcessing(true);

    try {
      const dataToProcess: WorkerFormData = {
        ...formData,
        firmaPngBase64: signature,
      };



      // 2. Inyectar datos en el Acta DS 44 (Pág 1, Cuestionario médico Págs 8-12, y Pág 22 con firma)
      await fillActaDs44(ds44Doc, dataToProcess, coordinates);

      // 3. Inyectar datos en Consentimiento de Alcohol y Drogas
      await fillConsentimiento(consentimientoDoc, dataToProcess, coordinates);

      // 4. Guardar bytes de ambos documentos
      const ds44Bytes = await ds44Doc.save();
      const consentBytes = await consentimientoDoc.save();

      // 5. Fusionar en un único paquete PDF oficial (22 + 1 = 23 páginas)
      const mergedPdfBytes = await mergeDocuments(ds44Bytes, consentBytes);

      // Crear URL descargable en el navegador
      const pdfBlob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(pdfBlob);

      // Registrar auditoría
      const auditEntry: AuditoriaDocumento = {
        id: crypto.randomUUID ? crypto.randomUUID() : `aud_${Date.now()}`,
        created_at: new Date().toISOString(),
        nombre_trabajador: formData.nombre.toUpperCase(),
        rut: formData.rut,
        documentos_generados: ['Acta IRL D.S. N° 44 (22 Páginas)', 'Consentimiento Alcohol y Drogas (1 Página)'],
        ip_address: '192.168.1.105 (Cliente Local / Minera)',
        user_agent: navigator.userAgent,
        metadata: {
          area: STATIC_VALUES.area,
          cargo: STATIC_VALUES.cargoPage1,
          peso_pdf_kb: Math.round(mergedPdfBytes.byteLength / 1024),
          total_paginas: 23,
        },
      };

      onDocumentGenerated(auditEntry, downloadUrl);
      setSuccessInfo({ url: downloadUrl, size: mergedPdfBytes.byteLength });

      // Disparar descarga automática del archivo
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Documentos_Firmados_DS44_${formData.rut.replace(/[^0-9kK]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Error al procesar y firmar PDFs: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredQuestions =
    selectedCategory === 'todas'
      ? MEDICAL_QUESTIONS
      : MEDICAL_QUESTIONS.filter((q) => q.category === selectedCategory);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Barra superior con botón demo */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-sky-400" />
            Llenado y Firma Digital de Documentación Laboral
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatización de Acta IRL D.S. N° 44 (22 págs) y Consentimiento de Alcohol y Drogas para Faena Concentraducto.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDemoData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Cargar Datos de Prueba (Demo)
        </button>
      </div>

      {/* SECCIÓN 1: DATOS PERSONALES DEL TRABAJADOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
              1
            </span>
            <h3 className="text-sm font-bold text-white">Datos del Trabajador (Dinámicos)</h3>
          </div>
          <span className="text-[11px] text-slate-400">Pág. 1, Pág. 22 y Consentimiento</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre Completo del Trabajador <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: JUAN CARLOS PÉREZ SOTO"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>R.U.T. Chileno <span className="text-red-400">*</span></span>
              {rutTouched && (
                <span className={`text-[10px] font-bold ${isRutValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isRutValid ? '✓ RUT Válido' : '✕ RUT Inválido'}
                </span>
              )}
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 12.345.678-9"
              value={formData.rut}
              onChange={handleRutChange}
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none ${
                rutTouched
                  ? isRutValid
                    ? 'border-emerald-500/70 focus:border-emerald-500'
                    : 'border-red-500/70 focus:border-red-500'
                  : 'border-slate-700 focus:border-sky-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre Contacto de Emergencia
            </label>
            <input
              type="text"
              placeholder="Ej: MARÍA ROJAS (Madre / Cónyuge)"
              value={formData.contactoEmergencia}
              onChange={(e) => setFormData({ ...formData, contactoEmergencia: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Teléfono Contacto de Emergencia
            </label>
            <input
              type="tel"
              placeholder="+56 9 1234 5678"
              value={formData.telefonoEmergencia}
              onChange={(e) => setFormData({ ...formData, telefonoEmergencia: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: DATOS OPERACIONALES AUTOCOMPLETADOS (ESTÁTICOS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
              2
            </span>
            <h3 className="text-sm font-bold text-white">Parámetros Operacionales Estáticos (Inyectados por Regla)</h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            Autocompletado Automático
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-sky-400" />
              <span>Cargo Pág. 1 / 22:</span>
            </div>
            <div className="font-bold text-white">{STATIC_VALUES.cargoPage1}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fecha Registro:</span>
            </div>
            <div className="font-bold text-white font-mono">{STATIC_VALUES.fecha}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Área / Faena:</span>
            </div>
            <div className="font-bold text-white">{STATIC_VALUES.area}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Horario Inducción:</span>
            </div>
            <div className="font-bold text-white font-mono">
              {STATIC_VALUES.horaInicio} a {STATIC_VALUES.horaTermino}
            </div>
          </div>
        </div>

        {/* Notificación de X gigante */}
        <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/40 p-3 rounded-xl text-xs text-red-200">
          <span className="text-xl font-black text-red-400 font-mono">❌</span>
          <div>
            <strong className="text-red-300">Regla Acta IRL DS 44 (Página 1):</strong> Se inyectará una{' '}
            <strong>"X" gigante</strong> en la casilla de <strong>"Persona Nueva"</strong> en las coordenadas (x: {coordinates.actaDs44.page1.personaNuevaX.x}, y: {coordinates.actaDs44.page1.personaNuevaX.y}).
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: CUESTIONARIO MÉDICO DS 44 (PÁGINAS 8 AL 12 / ÍNDICES 7 AL 11) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold">
              3
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Cuestionario Médico de Salud (Páginas 8 al 12)</h3>
              <p className="text-[11px] text-slate-400">
                Cada respuesta inyecta una 'X' en la casilla correspondiente de los índices 7 al 11 del PDF.
              </p>
            </div>
          </div>

          {/* Filtro por categoría */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedCategory('todas')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'todas' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas (15)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('antecedentes')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'antecedentes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Antecedentes (Pág. 8)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('enfermedades')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'enfermedades' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enfermedades (Págs. 9-11)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('consideraciones')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'consideraciones' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Otras (Pág. 12)
            </button>
          </div>
        </div>

        {/* Lista de preguntas con botones SÍ / NO accesibles */}
        <div className="space-y-2.5">
          {filteredQuestions.map((q) => {
            const isYes = getMedicalAnswer(q.id);
            return (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/60">
                      Pág. {q.pageIndex + 1} (Índice {q.pageIndex})
                    </span>
                    <span className="text-xs font-medium text-slate-200">{q.question}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMedicalToggle(q.id, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isYes
                        ? 'bg-red-600 text-white shadow ring-2 ring-red-400/50'
                        : 'bg-slate-800/90 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMedicalToggle(q.id, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      !isYes
                        ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400/50'
                        : 'bg-slate-800/90 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 4: PAD DE FIRMA DIGITAL MANUSCRITA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold">
              4
            </span>
            <h3 className="text-sm font-bold text-white">Captura de Firma Digital (PNG)</h3>
          </div>
          <span className="text-[11px] text-amber-400 font-semibold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
            Incrustación en DS 44 (Pág. 22) y Consentimiento
          </span>
        </div>

        <SignatureCanvas ref={sigRef} height={190} />
      </div>

      {/* Mensajes de Alerta y Éxito */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/80 border border-red-700 text-sm text-red-200 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successInfo && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-sm text-emerald-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">¡Documentos Generados, Firmados y Auditados!</div>
              <div className="text-xs text-emerald-300">
                Paquete de 23 páginas compilado con pdf-lib ({Math.round(successInfo.size / 1024)} KB) y auditado en Supabase.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={successInfo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver en Nueva Pestaña
            </a>
            <a
              href={successInfo.url}
              download={`Documentos_Firmados_DS44_${formData.rut.replace(/[^0-9kK]/g, '')}.pdf`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar PDF
            </a>
          </div>
        </div>
      )}

      {/* BOTÓN PRINCIPAL DE GENERACIÓN Y FIRMA */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-4 px-6 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Procesando PDF con pdf-lib e Insertando Auditoría en Supabase...</span>
            </>
          ) : (
            <>
              <FileCheck2 className="w-5 h-5" />
              <span>Generar, Firmar y Descargar Documentos Legales (DS 44 + Consentimiento)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { CoordinateConfig } from '../lib/types';
import { DEFAULT_COORDINATES } from '../lib/constants';
import { Target, Copy, Check, Info, Sliders, RefreshCw } from 'lucide-react';

interface Props {
  coordinates: CoordinateConfig;
  onCoordinatesChange: (newCoords: CoordinateConfig) => void;
}

export function CoordinateCalibrator({ coordinates, onCoordinatesChange }: Props) {
  const [selectedDoc, setSelectedDoc] = useState<'acta_p1' | 'acta_p22' | 'consentimiento'>('acta_p1');
  const [selectedField, setSelectedField] = useState<string>('personaNuevaX');
  const [copied, setCopied] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Dimensiones estándar A4 en puntos (72 DPI)
  const PDF_WIDTH = 595.28;
  const PDF_HEIGHT = 841.89;

  // Escala para renderizado en pantalla
  const DISPLAY_WIDTH = 380;
  const SCALE = DISPLAY_WIDTH / PDF_WIDTH;
  const DISPLAY_HEIGHT = PDF_HEIGHT * SCALE;

  const handleCopyCode = () => {
    const formattedCode = `// Coordenadas Calibradas para app/api/generate/route.ts
const COORDENADAS = ${JSON.stringify(coordinates, null, 2)};`;
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    onCoordinatesChange(JSON.parse(JSON.stringify(DEFAULT_COORDINATES)));
  };

  // Convertir click de ratón en la pantalla a coordenadas de pdf-lib (origen inferior izquierdo)
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // En PDF: x = clickX / SCALE; y = (DISPLAY_HEIGHT - clickY) / SCALE
    const pdfX = Math.round(clickX / SCALE);
    const pdfY = Math.round((DISPLAY_HEIGHT - clickY) / SCALE);

    updateFieldCoord(selectedDoc, selectedField, pdfX, pdfY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pdfX = Math.round(clickX / SCALE);
    const pdfY = Math.round((DISPLAY_HEIGHT - clickY) / SCALE);
    setHoverCoord({ x: pdfX, y: pdfY });
  };

  const updateFieldCoord = (doc: string, field: string, x: number, y: number) => {
    const next = JSON.parse(JSON.stringify(coordinates)) as CoordinateConfig;

    if (doc === 'acta_p1') {
      const p1 = next.actaDs44.page1 as any;
      if (p1[field]) {
        p1[field].x = x;
        p1[field].y = y;
      }
    } else if (doc === 'acta_p22') {
      const p22 = next.actaDs44.page22 as any;
      if (p22[field]) {
        p22[field].x = x;
        p22[field].y = y;
      }
    } else if (doc === 'consentimiento') {
      const c = next.consentimiento as any;
      if (c[field]) {
        c[field].x = x;
        c[field].y = y;
      }
    }

    onCoordinatesChange(next);
  };

  // Obtener la coordenada actual del campo seleccionado
  const getCurrentCoord = (): { x: number; y: number } => {
    if (selectedDoc === 'acta_p1') {
      return (coordinates.actaDs44.page1 as any)[selectedField] || { x: 0, y: 0 };
    }
    if (selectedDoc === 'acta_p22') {
      return (coordinates.actaDs44.page22 as any)[selectedField] || { x: 0, y: 0 };
    }
    return (coordinates.consentimiento as any)[selectedField] || { x: 0, y: 0 };
  };

  const currentCoord = getCurrentCoord();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Target className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">Calibrador Interactivo de Coordenadas (pdf-lib)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sistema de referencia PDF de 72 DPI (A4: 595 × 842 pt). Haz clic sobre la lámina o ajusta los valores para alinear textos y firmas sobre las líneas de tu PDF original.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restablecer Defecto
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '¡Copiado al Portapapeles!' : 'Copiar Configuración'}
          </button>
        </div>
      </div>

      {/* Selectores de Documento y Página */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedDoc('acta_p1');
            setSelectedField('personaNuevaX');
          }}
          className={`p-3 rounded-xl border text-left transition ${
            selectedDoc === 'acta_p1'
              ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
              : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-bold text-sky-400">Página 1 (Índice 0)</div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">Acta DS 44: Datos y X Gigante</div>
          <div className="text-[11px] text-slate-400 mt-1">Cargo, Fecha, Área, Persona Nueva, Nombre, RUT</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDoc('acta_p22');
            setSelectedField('firma');
          }}
          className={`p-3 rounded-xl border text-left transition ${
            selectedDoc === 'acta_p22'
              ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
              : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-bold text-sky-400">Página 22 (Índice 21)</div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">Acta DS 44: Cierre y Firma</div>
          <div className="text-[11px] text-slate-400 mt-1">Firma Trabajador (Lado derecho), Nombre, RUT</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDoc('consentimiento');
            setSelectedField('firma');
          }}
          className={`p-3 rounded-xl border text-left transition ${
            selectedDoc === 'consentimiento'
              ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
              : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <div className="text-xs font-bold text-sky-400">Página 1 (Índice 0)</div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">Consentimiento Alcohol/Drogas</div>
          <div className="text-[11px] text-slate-400 mt-1">Firma Idéntica a Cédula, Fecha 27-10-2026</div>
        </button>
      </div>

      {/* Selector de campo individual y controles numéricos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/70 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Campo a Calibrar:
            </label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-sky-500"
            >
              {selectedDoc === 'acta_p1' && (
                <>
                  <option value="personaNuevaX">Casilla "Persona Nueva" (X Gigante)</option>
                  <option value="cargo">Cargo ("OPERARIO(A) DE ASEO")</option>
                  <option value="fecha">Fecha ("27-10-2026")</option>
                  <option value="area">Área ("CONCENTRADUCTO")</option>
                  <option value="horaInicio">Hora Inicio ("10:00")</option>
                  <option value="horaTermino">Hora Término ("12:00")</option>
                  <option value="nombre">Nombre Trabajador</option>
                  <option value="rut">R.U.T. Trabajador</option>
                  <option value="contactoEmergencia">Contacto Emergencia</option>
                  <option value="telefonoEmergencia">Teléfono Emergencia</option>
                </>
              )}

              {selectedDoc === 'acta_p22' && (
                <>
                  <option value="firma">Recuadro de Firma del Trabajador (Lado Derecho)</option>
                  <option value="nombre">Nombre Trabajador</option>
                  <option value="rut">R.U.T. Trabajador</option>
                  <option value="cargo">Cargo ("Operario de Aseo")</option>
                </>
              )}

              {selectedDoc === 'consentimiento' && (
                <>
                  <option value="firma">Firma (Idéntica a Cédula de Identidad)</option>
                  <option value="nombre">Nombre Trabajador</option>
                  <option value="rut">R.U.T. Trabajador</option>
                  <option value="fecha">Fecha ("27-10-2026")</option>
                </>
              )}
            </select>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Coordenada X (pt)</span>
                  <span className="text-sky-400 font-mono">{currentCoord.x}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={Math.round(PDF_WIDTH)}
                  value={currentCoord.x}
                  onChange={(e) => updateFieldCoord(selectedDoc, selectedField, Number(e.target.value), currentCoord.y)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Coordenada Y (pt)</span>
                  <span className="text-sky-400 font-mono">{currentCoord.y}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={Math.round(PDF_HEIGHT)}
                  value={currentCoord.y}
                  onChange={(e) => updateFieldCoord(selectedDoc, selectedField, currentCoord.x, Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono mt-1"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[11px] text-slate-400 block mb-1">Ajuste fino con barra de desplazamiento:</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max={Math.round(PDF_WIDTH)}
                  value={currentCoord.x}
                  onChange={(e) => updateFieldCoord(selectedDoc, selectedField, Number(e.target.value), currentCoord.y)}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max={Math.round(PDF_HEIGHT)}
                  value={currentCoord.y}
                  onChange={(e) => updateFieldCoord(selectedDoc, selectedField, currentCoord.x, Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-sky-950/40 border border-sky-800/50 rounded-xl p-3.5 flex gap-2.5 text-xs text-sky-200">
            <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white">¿Cómo funciona la calibración?</span>
              <p>
                En <strong>pdf-lib</strong>, el punto <code className="bg-black/40 px-1 py-0.5 rounded text-sky-300">(0, 0)</code> está en la <em>esquina inferior izquierda</em>.
                Al hacer clic directamente en la hoja visual de la derecha, el punto se calculará e inyectará automáticamente en la coordenada seleccionada.
              </p>
            </div>
          </div>
        </div>

        {/* Hoja visual A4 interactiva */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="text-xs text-slate-400 font-mono mb-2 flex items-center justify-between w-[380px]">
            <span>Lámina A4 Interactiva (Clic para posicionar)</span>
            {hoverCoord && (
              <span className="text-sky-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                Cursor: X:{hoverCoord.x} Y:{hoverCoord.y}
              </span>
            )}
          </div>

          <div
            onClick={handlePageClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCoord(null)}
            style={{ width: `${DISPLAY_WIDTH}px`, height: `${DISPLAY_HEIGHT}px` }}
            className="relative bg-white rounded-lg shadow-2xl border-2 border-slate-600 overflow-hidden cursor-crosshair select-none"
          >
            {/* Cuadrícula milimétrica suave */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Encabezado simulado del PDF */}
            <div className="absolute top-4 left-6 right-6 border-b border-slate-300 pb-2">
              <div className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">
                {selectedDoc === 'acta_p1' && 'ACTA DE INDUCCIÓN LABORAL D.S. 44 - PÁGINA 1'}
                {selectedDoc === 'acta_p22' && 'ACTA DE INDUCCIÓN D.S. 44 - PÁGINA 22 (CIERRE)'}
                {selectedDoc === 'consentimiento' && 'CONSENTIMIENTO CONTROL ALCOHOL Y DROGAS'}
              </div>
              <div className="text-[8px] text-slate-500">Documento Oficial de Registro de Seguridad</div>
            </div>

            {/* Marcadores de todos los campos en la página actual */}
            {selectedDoc === 'acta_p1' &&
              Object.entries(coordinates.actaDs44.page1).map(([key, val]: [string, any]) => {
                const isSelected = key === selectedField;
                const leftPx = val.x * SCALE;
                const topPx = DISPLAY_HEIGHT - val.y * SCALE;

                return (
                  <div
                    key={key}
                    style={{ left: `${leftPx}px`, top: `${topPx}px` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all ${
                      isSelected ? 'z-30 scale-110' : 'z-10 opacity-70'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow ${
                        isSelected
                          ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                          : 'bg-sky-700 text-white'
                      }`}
                    >
                      {key === 'personaNuevaX' ? '❌ X GIGANTE' : key}
                    </div>
                  </div>
                );
              })}

            {selectedDoc === 'acta_p22' &&
              Object.entries(coordinates.actaDs44.page22).map(([key, val]: [string, any]) => {
                const isSelected = key === selectedField;
                const leftPx = val.x * SCALE;
                const topPx = DISPLAY_HEIGHT - val.y * SCALE;

                if (key === 'firma') {
                  return (
                    <div
                      key={key}
                      style={{
                        left: `${leftPx}px`,
                        top: `${topPx - (val.height || 75) * SCALE}px`,
                        width: `${(val.width || 170) * SCALE}px`,
                        height: `${(val.height || 75) * SCALE}px`,
                      }}
                      className={`absolute border-2 border-dashed rounded flex flex-col items-center justify-center pointer-events-none ${
                        isSelected
                          ? 'border-red-500 bg-red-500/20 text-red-700 ring-2 ring-red-300'
                          : 'border-sky-600 bg-sky-500/10 text-sky-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold">ÁREA FIRMA TRABAJADOR</span>
                      <span className="text-[8px]">(Lado Derecho)</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    style={{ left: `${leftPx}px`, top: `${topPx}px` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
                      isSelected ? 'z-30 scale-110' : 'z-10'
                    }`}
                  >
                    <div
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow ${
                        isSelected ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {key}
                    </div>
                  </div>
                );
              })}

            {selectedDoc === 'consentimiento' &&
              Object.entries(coordinates.consentimiento).map(([key, val]: [string, any]) => {
                const isSelected = key === selectedField;
                const leftPx = val.x * SCALE;
                const topPx = DISPLAY_HEIGHT - val.y * SCALE;

                if (key === 'firma') {
                  return (
                    <div
                      key={key}
                      style={{
                        left: `${leftPx}px`,
                        top: `${topPx - (val.height || 80) * SCALE}px`,
                        width: `${(val.width || 180) * SCALE}px`,
                        height: `${(val.height || 80) * SCALE}px`,
                      }}
                      className={`absolute border-2 border-dashed rounded flex flex-col items-center justify-center pointer-events-none ${
                        isSelected
                          ? 'border-red-500 bg-red-500/20 text-red-700 ring-2 ring-red-300'
                          : 'border-emerald-600 bg-emerald-500/10 text-emerald-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold">FIRMA CARNET DE IDENTIDAD</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    style={{ left: `${leftPx}px`, top: `${topPx}px` }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
                      isSelected ? 'z-30 scale-110' : 'z-10'
                    }`}
                  >
                    <div
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow ${
                        isSelected ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {key}
                    </div>
                  </div>
                );
              })}

            {/* Regla de referencia inferior */}
            <div className="absolute bottom-2 left-6 right-6 flex items-center justify-between text-[8px] text-slate-400 border-t border-slate-200 pt-1">
              <span>(0, 0) Origen Inferior</span>
              <span>Ancho: 595 pt | Alto: 842 pt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

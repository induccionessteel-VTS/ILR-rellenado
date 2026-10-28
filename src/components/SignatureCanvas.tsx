import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Eraser, RotateCcw, PenTool, CheckCircle2, Sparkles } from 'lucide-react';

export interface SignatureCanvasHandle {
  getSignatureDataUrl: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
  insertSampleSignature: () => void;
}

interface SignatureCanvasProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  height?: number;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ onSignatureChange, height = 180 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
    const [history, setHistory] = useState<ImageData[]>([]);

    const saveState = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), imgData]);
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = strokeWidth;

      saveState();
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.lineWidth = strokeWidth;
    }, [strokeWidth]);

    const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      saveState();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange?.(dataUrl);
    };

    const clear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      setHasDrawn(false);
      setHistory([]);
      saveState();
      onSignatureChange?.(null);
    };

    const undo = () => {
      const canvas = canvasRef.current;
      if (!canvas || history.length <= 1) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newHistory = [...history];
      newHistory.pop();
      const previousState = newHistory[newHistory.length - 1];

      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
      if (newHistory.length <= 1) {
        setHasDrawn(false);
        onSignatureChange?.(null);
      } else {
        onSignatureChange?.(canvas.toDataURL('image/png'));
      }
    };

    const drawSampleSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      clear();
      saveState();

      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      // Dibujo de firma manuscrita realista
      ctx.moveTo(60, 95);
      ctx.bezierCurveTo(90, 45, 130, 45, 150, 90);
      ctx.bezierCurveTo(165, 125, 170, 75, 200, 80);
      ctx.bezierCurveTo(220, 85, 230, 115, 260, 100);
      ctx.bezierCurveTo(290, 85, 310, 75, 350, 105);
      // Rúbrica y lazo inferior
      ctx.moveTo(55, 130);
      ctx.bezierCurveTo(160, 120, 270, 125, 360, 115);
      ctx.stroke();
      ctx.restore();

      setHasDrawn(true);
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange?.(dataUrl);
    };

    useImperativeHandle(ref, () => ({
      getSignatureDataUrl: () => {
        if (!hasDrawn || !canvasRef.current) return null;
        return canvasRef.current.toDataURL('image/png');
      },
      isEmpty: () => !hasDrawn,
      clear,
      insertSampleSignature: drawSampleSignature,
    }));

    return (
      <div className="space-y-3">
        {/* Barra superior de herramientas de firma */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <PenTool className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">Grosor de Trazo:</span>
            <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setStrokeWidth(1.5)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  strokeWidth === 1.5 ? 'bg-sky-600 text-white' : 'hover:text-white'
                }`}
              >
                Fino
              </button>
              <button
                type="button"
                onClick={() => setStrokeWidth(2.5)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  strokeWidth === 2.5 ? 'bg-sky-600 text-white' : 'hover:text-white'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setStrokeWidth(4.0)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  strokeWidth === 4.0 ? 'bg-sky-600 text-white' : 'hover:text-white'
                }`}
              >
                Grueso
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={drawSampleSignature}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 text-[11px] font-semibold transition"
              title="Insertar trazo de firma de muestra"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Estampar Firma Ejemplo</span>
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={history.length <= 1}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded border border-slate-700 transition"
              title="Deshacer último trazo"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Deshacer</span>
            </button>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-200 rounded border border-slate-700 transition"
              title="Borrar lienzo"
            >
              <Eraser className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Contenedor del Canvas de Firma */}
        <div className="relative rounded-xl border-2 border-dashed border-slate-700 bg-white shadow-inner overflow-hidden">
          <canvas
            ref={canvasRef}
            style={{ height: `${height}px`, width: '100%', touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair w-full block"
          />

          {/* Línea guía para firmar */}
          <div className="pointer-events-none absolute bottom-8 left-10 right-10 flex items-center justify-between border-b border-slate-300 pb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Firme dentro de este recuadro (Idéntica a su Cédula de Identidad)
            </span>
            <span className="text-[10px] text-slate-400">X ____________________</span>
          </div>

          {/* Badge de estado */}
          {hasDrawn && (
            <div className="absolute top-2 right-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Firma Capturada
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          Nota legal: Esta firma digital manuscrita será incrustada como imagen PNG con canal alfa transparente en la Página 22 del Acta IRL DS 44 y en el Consentimiento Informado.
        </p>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Eraser, RotateCcw, PenTool, CheckCircle2, Sparkles, Upload, Image as ImageIcon, X } from 'lucide-react';

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
    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
    const [history, setHistory] = useState<ImageData[]>([]);

    // Estado para firma subida por foto
    const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    const saveState = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), imgData]);
    };

    useEffect(() => {
      if (mode !== 'draw') return;
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
    }, [mode]);

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
      if (mode === 'draw') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        setHasDrawn(false);
        setHistory([]);
        saveState();
      } else {
        setUploadedDataUrl(null);
        setUploadedFileName(null);
      }
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
      setMode('draw');
      setTimeout(() => {
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
      }, 50);
    };

    /**
     * Procesa la imagen subida: elimina el fondo blanco del papel y genera PNG transparente
     */
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Crear un canvas temporal para eliminar el fondo blanco/claro
          const tempCanvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = (h / w) * maxDim;
              w = maxDim;
            } else {
              w = (w / h) * maxDim;
              h = maxDim;
            }
          }
          tempCanvas.width = w;
          tempCanvas.height = h;

          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return;

          tempCtx.drawImage(img, 0, 0, w, h);
          const imgData = tempCtx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Convertir píxeles claros (papel blanco) a transparentes
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;

            // Si es blanco o casi blanco (> 205), hacerlo transparente
            if (brightness > 205) {
              data[i + 3] = 0; // Alpha 0
            } else {
              // Intensificar el trazo oscuro
              data[i] = Math.min(r, 20);
              data[i + 1] = Math.min(g, 30);
              data[i + 2] = Math.min(b, 50);
              // Suavizado de bordes
              if (brightness > 160) {
                data[i + 3] = Math.round(((205 - brightness) / 45) * 255);
              }
            }
          }

          tempCtx.putImageData(imgData, 0, 0);
          const transparentPng = tempCanvas.toDataURL('image/png');
          setUploadedDataUrl(transparentPng);
          onSignatureChange?.(transparentPng);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    useImperativeHandle(ref, () => ({
      getSignatureDataUrl: () => {
        if (mode === 'upload' && uploadedDataUrl) {
          return uploadedDataUrl;
        }
        if (mode === 'draw' && hasDrawn && canvasRef.current) {
          return canvasRef.current.toDataURL('image/png');
        }
        return null;
      },
      isEmpty: () => {
        if (mode === 'upload') return !uploadedDataUrl;
        return !hasDrawn;
      },
      clear,
      insertSampleSignature: drawSampleSignature,
    }));

    const isSignatureReady = mode === 'upload' ? !!uploadedDataUrl : hasDrawn;

    return (
      <div className="space-y-3">
        {/* Selector de Modo: Dibujar en Canvas vs Subir Foto */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mode === 'draw' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Dibujar en Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mode === 'upload' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Foto de Firma</span>
            </button>
          </div>

          {/* Herramientas según el modo */}
          {mode === 'draw' ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStrokeWidth(1.5)}
                  className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 1.5 ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                >
                  Fino
                </button>
                <button
                  type="button"
                  onClick={() => setStrokeWidth(2.5)}
                  className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 2.5 ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setStrokeWidth(4.0)}
                  className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 4.0 ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                >
                  Grueso
                </button>
              </div>

              <button
                type="button"
                onClick={drawSampleSignature}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-[11px] font-semibold transition"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Firma Ejemplo</span>
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={history.length <= 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 transition"
                title="Deshacer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clear}
                className="p-1.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-200 rounded-lg border border-slate-700 transition"
                title="Borrar"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {uploadedDataUrl && (
                <button
                  type="button"
                  onClick={clear}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 rounded-lg border border-slate-700 text-xs transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Quitar Foto</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* MODO 1: CANVAS DE DIBUJO */}
        {mode === 'draw' && (
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

            <div className="pointer-events-none absolute bottom-8 left-10 right-10 flex items-center justify-between border-b border-slate-300 pb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Firme dentro de este recuadro (Idéntica a su Cédula de Identidad)
              </span>
              <span className="text-[10px] text-slate-400">X ____________________</span>
            </div>

            {hasDrawn && (
              <div className="absolute top-2 right-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Firma Capturada
              </div>
            )}
          </div>
        )}

        {/* MODO 2: SUBIDA DE FOTO DE FIRMA */}
        {mode === 'upload' && (
          <div>
            {!uploadedDataUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-sky-600/50 hover:border-sky-500 rounded-xl p-8 bg-slate-900/60 hover:bg-slate-900 transition flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="p-3 bg-sky-500/10 text-sky-400 rounded-full">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Haz clic aquí o arrastra la foto de tu firma</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Formatos: PNG, JPG, JPEG o WebP. Puede ser una foto tomada con tu celular sobre papel blanco.
                  </div>
                </div>
                <span className="px-3 py-1 bg-sky-600 text-white rounded-lg text-xs font-semibold shadow">
                  Seleccionar Imagen
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-4 flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between w-full">
                  <span>Vista previa de la firma (Fondo blanco removido automáticamente para PDF):</span>
                  <span className="text-emerald-400 font-mono text-[11px]">{uploadedFileName}</span>
                </div>

                <div className="p-4 bg-white rounded-lg border border-slate-300 w-full max-w-md flex justify-center shadow-inner">
                  <img
                    src={uploadedDataUrl}
                    alt="Firma subida"
                    className="max-h-36 object-contain"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Foto de Firma Procesada y Lista para Incrustar
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-sky-400 hover:underline ml-2"
                  >
                    Cambiar imagen
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Nota legal: La firma digital (manuscrita o por foto) será incrustada con canal alfa transparente en la Página 22 del Acta IRL DS 44 (VELTS-D-ACN212-HS-0012) y en el Consentimiento Informado.
        </p>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

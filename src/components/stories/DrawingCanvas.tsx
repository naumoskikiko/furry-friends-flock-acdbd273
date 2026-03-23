import { useRef, useState, useCallback, useEffect } from "react";
import { Undo2, Redo2, Eraser } from "lucide-react";

interface DrawingCanvasProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  brushSize: number;
  erasing: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const DrawingCanvas = ({ width, height, active, color, brushSize, erasing, canvasRef }: DrawingCanvasProps) => {
  const drawing = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const [, forceRender] = useState(0);

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext("2d") ?? null;
  }, [canvasRef]);

  const saveState = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
    redoRef.current = [];
  }, [getCtx, canvasRef]);

  const startDraw = useCallback((x: number, y: number) => {
    if (!active) return;
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    saveState();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (erasing) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
  }, [active, getCtx, saveState, color, brushSize, erasing]);

  const draw = useCallback((x: number, y: number) => {
    if (!drawing.current || !active) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [active, getCtx]);

  const endDraw = useCallback(() => {
    drawing.current = false;
  }, []);

  const undo = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current || historyRef.current.length === 0) return;
    redoRef.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    const prev = historyRef.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    forceRender(n => n + 1);
  }, [getCtx, canvasRef]);

  const redo = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current || redoRef.current.length === 0) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    const next = redoRef.current.pop()!;
    ctx.putImageData(next, 0, 0);
    forceRender(n => n + 1);
  }, [getCtx, canvasRef]);

  const getPos = (e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !canvasRef.current) return { x: 0, y: 0 };
    return {
      x: (e.touches[0].clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (e.touches[0].clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const getMousePos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !canvasRef.current) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-30 w-full h-full"
        style={{ pointerEvents: active ? "auto" : "none", touchAction: "none" }}
        onTouchStart={(e) => { e.stopPropagation(); const p = getPos(e); startDraw(p.x, p.y); }}
        onTouchMove={(e) => { e.stopPropagation(); const p = getPos(e); draw(p.x, p.y); }}
        onTouchEnd={(e) => { e.stopPropagation(); endDraw(); }}
        onMouseDown={(e) => { e.stopPropagation(); const p = getMousePos(e); startDraw(p.x, p.y); }}
        onMouseMove={(e) => { const p = getMousePos(e); draw(p.x, p.y); }}
        onMouseUp={() => endDraw()}
        onMouseLeave={() => endDraw()}
      />
      {active && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
          <button onClick={undo} className="rounded-full bg-black/60 p-2 text-white/80 hover:text-white backdrop-blur-sm" disabled={historyRef.current.length === 0}>
            <Undo2 className="h-5 w-5" />
          </button>
          <button onClick={redo} className="rounded-full bg-black/60 p-2 text-white/80 hover:text-white backdrop-blur-sm" disabled={redoRef.current.length === 0}>
            <Redo2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
};

export default DrawingCanvas;

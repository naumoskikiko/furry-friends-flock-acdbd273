import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, RotateCcw, Sun, Contrast, Droplets, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface PhotoPostEditorProps {
  imageFile: File;
  onClose: () => void;
  onDone: (result: { editedBlob: Blob; previewUrl: string }) => void;
}

type AspectRatio = "original" | "1:1" | "4:5" | "16:9";

const ASPECT_MAP: Record<AspectRatio, number | null> = {
  original: null,
  "1:1": 1,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
};

const PhotoPostEditor = ({ imageFile, onClose, onDone }: PhotoPostEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [step, setStep] = useState<"edit" | "preview">("edit");

  // Transform state
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [aspect, setAspect] = useState<AspectRatio>("1:1");

  // Filter state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Drag state
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, initPanX: 0, initPanY: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = URL.createObjectURL(imageFile);
    return () => URL.revokeObjectURL(img.src);
  }, [imageFile]);

  // Get output dimensions
  const getOutputSize = useCallback(() => {
    if (!imgRef.current) return { w: 800, h: 800 };
    const img = imgRef.current;
    const isRotated = rotation % 180 !== 0;
    const natW = isRotated ? img.naturalHeight : img.naturalWidth;
    const natH = isRotated ? img.naturalWidth : img.naturalHeight;
    const ratio = ASPECT_MAP[aspect];
    if (!ratio) return { w: natW, h: natH };
    if (natW / natH > ratio) {
      return { w: Math.round(natH * ratio), h: natH };
    }
    return { w: natW, h: Math.round(natW / ratio) };
  }, [rotation, aspect]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const { w, h } = getOutputSize();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + panX * zoom, h / 2 + panY * zoom);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [brightness, contrast, saturation, rotation, zoom, panX, panY, getOutputSize]);

  useEffect(() => {
    if (imgLoaded) drawCanvas();
  }, [imgLoaded, drawCanvas]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, initPanX: panX, initPanY: panY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = (e.clientX - dragRef.current.startX) / zoom;
    const dy = (e.clientY - dragRef.current.startY) / zoom;
    setPanX(dragRef.current.initPanX + dx);
    setPanY(dragRef.current.initPanY + dy);
  };
  const handlePointerUp = () => { dragRef.current.dragging = false; };

  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));

  const handlePreview = () => {
    drawCanvas();
    canvasRef.current?.toBlob((blob) => {
      if (blob) {
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setStep("preview");
      }
    }, "image/jpeg", 0.92);
  };

  const handleConfirm = () => {
    if (previewBlob) {
      onDone({ editedBlob: previewBlob, previewUrl });
    }
  };

  const aspects: AspectRatio[] = ["original", "1:1", "4:5", "16:9"];

  if (step === "preview") {
    return (
      <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={() => setStep("edit")} className="text-sm font-medium text-primary">← Edit</button>
          <h3 className="font-display font-bold text-sm">Preview</h3>
          <Button size="sm" onClick={handleConfirm} className="petkeep-gradient text-primary-foreground font-bold">
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 bg-secondary/30">
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-xl object-contain shadow-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-display font-bold text-sm">Edit Photo</h3>
        <Button size="sm" onClick={handlePreview} className="petkeep-gradient text-primary-foreground font-bold">
          Next →
        </Button>
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 flex items-center justify-center bg-secondary/30 overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <canvas ref={canvasRef} className="max-w-full max-h-full rounded-lg shadow-md" style={{ cursor: "grab" }} />
      </div>

      {/* Tools */}
      <div className="bg-card border-t border-border safe-area-bottom">
        {/* Aspect ratio */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border">
          {aspects.map((a) => (
            <button
              key={a}
              onClick={() => setAspect(a)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                aspect === a ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {a === "original" ? "Original" : a}
            </button>
          ))}
        </div>

        {/* Transform buttons */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-b border-border">
          <button onClick={handleRotate} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-5 w-5" />
            <span className="text-[10px]">Rotate</span>
          </button>
          <button onClick={handleZoomOut} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ZoomOut className="h-5 w-5" />
            <span className="text-[10px]">Zoom-</span>
          </button>
          <button onClick={handleZoomIn} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ZoomIn className="h-5 w-5" />
            <span className="text-[10px]">Zoom+</span>
          </button>
          <button
            onClick={() => { setPanX(0); setPanY(0); setZoom(1); }}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Move className="h-5 w-5" />
            <span className="text-[10px]">Reset</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-2">
          {[
            { key: "brightness", icon: Sun, value: brightness, set: setBrightness, label: "Bright" },
            { key: "contrast", icon: Contrast, value: contrast, set: setContrast, label: "Contrast" },
            { key: "saturation", icon: Droplets, value: saturation, set: setSaturation, label: "Saturate" },
          ].map(({ key, icon: Icon, value, set, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(activeFilter === key ? null : key)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeFilter === key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>

        {/* Active slider */}
        {activeFilter && (
          <div className="px-6 pb-3">
            <Slider
              min={50}
              max={150}
              step={1}
              value={[
                activeFilter === "brightness" ? brightness :
                activeFilter === "contrast" ? contrast : saturation
              ]}
              onValueChange={([v]) => {
                if (activeFilter === "brightness") setBrightness(v);
                else if (activeFilter === "contrast") setContrast(v);
                else setSaturation(v);
              }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>50%</span>
              <span>{activeFilter === "brightness" ? brightness : activeFilter === "contrast" ? contrast : saturation}%</span>
              <span>150%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoPostEditor;

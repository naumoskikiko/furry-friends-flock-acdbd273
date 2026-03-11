import { useState, useRef, useCallback } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";

interface SlideToPayProps {
  amount: number;
  currency?: string;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
}

const SlideToPayButton = ({ amount, currency = "MKD", disabled, onConfirm }: SlideToPayProps) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const THUMB_SIZE = 56;
  const getTrackWidth = () => (trackRef.current?.clientWidth || 300) - THUMB_SIZE;

  const handleStart = useCallback((clientX: number) => {
    if (disabled || confirmed || processing) return;
    startXRef.current = clientX - offset;
    setDragging(true);
  }, [disabled, confirmed, processing, offset]);

  const handleMove = useCallback((clientX: number) => {
    if (!dragging) return;
    const maxOffset = getTrackWidth();
    const newOffset = Math.min(Math.max(0, clientX - startXRef.current), maxOffset);
    setOffset(newOffset);
  }, [dragging]);

  const handleEnd = useCallback(async () => {
    if (!dragging) return;
    setDragging(false);
    const maxOffset = getTrackWidth();
    const threshold = maxOffset * 0.85;

    if (offset >= threshold) {
      setOffset(maxOffset);
      setProcessing(true);
      try {
        await onConfirm();
        setConfirmed(true);
      } catch {
        setOffset(0);
      }
      setProcessing(false);
    } else {
      setOffset(0);
    }
  }, [dragging, offset, onConfirm]);

  const progress = offset / getTrackWidth();

  return (
    <div
      ref={trackRef}
      className={`relative h-16 rounded-2xl overflow-hidden select-none touch-none transition-colors ${
        disabled ? "bg-muted opacity-50" : confirmed ? "bg-green-500 dark:bg-green-600" : "petkeep-gradient"
      }`}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (dragging) handleEnd(); }}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Track label */}
      <div
        className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-sm transition-opacity"
        style={{ opacity: confirmed ? 0 : Math.max(0, 1 - progress * 2) }}
      >
        Slide to Pay · {amount.toLocaleString()} {currency}
      </div>

      {/* Confirmed label */}
      {confirmed && (
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm gap-2">
          <Check className="h-5 w-5" /> Payment Confirmed!
        </div>
      )}

      {/* Thumb */}
      {!confirmed && (
        <div
          className={`absolute top-1 left-1 h-14 w-14 rounded-xl bg-white dark:bg-background shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
            !dragging && !processing ? "transition-all duration-300" : ""
          }`}
          style={{ transform: `translateX(${offset}px)` }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ChevronRight className="h-5 w-5 text-primary" />
          )}
        </div>
      )}

      {/* Progress overlay */}
      <div
        className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-2xl pointer-events-none"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
};

export default SlideToPayButton;

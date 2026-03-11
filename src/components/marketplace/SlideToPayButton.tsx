import { useState, useRef, useCallback, useEffect } from "react";
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
  const draggingRef = useRef(false);
  const offsetRef = useRef(0);

  const THUMB_SIZE = 56;
  const getTrackWidth = useCallback(() => (trackRef.current?.clientWidth || 300) - THUMB_SIZE, []);

  const handleStart = useCallback((clientX: number) => {
    if (disabled || confirmed || processing) return;
    startXRef.current = clientX - offsetRef.current;
    setDragging(true);
    draggingRef.current = true;
  }, [disabled, confirmed, processing]);

  const handleMove = useCallback((clientX: number) => {
    if (!draggingRef.current) return;
    const maxOffset = getTrackWidth();
    const newOffset = Math.min(Math.max(0, clientX - startXRef.current), maxOffset);
    offsetRef.current = newOffset;
    setOffset(newOffset);
  }, [getTrackWidth]);

  const handleEnd = useCallback(async () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const maxOffset = getTrackWidth();
    const currentOffset = offsetRef.current;
    const threshold = maxOffset * 0.75; // Lower threshold for easier triggering

    if (currentOffset >= threshold) {
      offsetRef.current = maxOffset;
      setOffset(maxOffset);
      setProcessing(true);
      try {
        await onConfirm();
        setConfirmed(true);
      } catch {
        offsetRef.current = 0;
        setOffset(0);
      }
      setProcessing(false);
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }, [onConfirm, getTrackWidth]);

  // Global mouse/touch listeners to prevent losing drag outside element
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, handleMove, handleEnd]);

  const progress = getTrackWidth() > 0 ? offset / getTrackWidth() : 0;

  return (
    <div
      ref={trackRef}
      className={`relative h-16 rounded-2xl overflow-hidden select-none transition-colors ${
        disabled ? "bg-muted opacity-50" : confirmed ? "bg-green-500 dark:bg-green-600" : "petkeep-gradient"
      }`}
      style={{ touchAction: "none" }}
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
          className={`absolute top-1 left-1 h-14 w-14 rounded-xl bg-white dark:bg-background shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing ${
            !dragging && !processing ? "transition-all duration-300" : ""
          }`}
          style={{ transform: `translateX(${offset}px)` }}
          onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX); }}
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

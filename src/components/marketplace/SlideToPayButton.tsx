import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";

interface SlideToPayProps {
  amount: number;
  currency?: string;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
}

const SlideToPayButton = forwardRef<HTMLDivElement, SlideToPayProps>(({ amount, currency = "MKD", disabled, onConfirm }, forwardedRef) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const draggingRef = useRef(false);
  const offsetRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const THUMB_SIZE = 56;
  const getTrackWidth = useCallback(() => (trackRef.current?.clientWidth || 300) - THUMB_SIZE, []);

  const setTrackRefs = useCallback(
    (node: HTMLDivElement | null) => {
      trackRef.current = node;
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  const handleStart = useCallback((clientX: number, pointerId?: number) => {
    if (disabled || confirmed || processing) return;
    startXRef.current = clientX - offsetRef.current;
    setDragging(true);
    draggingRef.current = true;
    pointerIdRef.current = pointerId ?? null;
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
    pointerIdRef.current = null;
    setDragging(false);

    const maxOffset = getTrackWidth();
    const currentOffset = offsetRef.current;
    const threshold = maxOffset * 0.75;

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
      } finally {
        setProcessing(false);
      }
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }, [onConfirm, getTrackWidth]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      handleMove(e.clientX);
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      void handleEnd();
    };

    if (dragging) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);
    }

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [dragging, handleMove, handleEnd]);

  const progress = getTrackWidth() > 0 ? offset / getTrackWidth() : 0;

  return (
    <div
      ref={setTrackRefs}
      className={`relative h-16 rounded-2xl overflow-hidden select-none transition-colors ${
        disabled ? "bg-muted opacity-50" : confirmed ? "bg-green-500 dark:bg-green-600" : "petkeep-gradient"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        handleStart(e.clientX, e.pointerId);
        handleMove(e.clientX);
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-sm transition-opacity"
        style={{ opacity: confirmed ? 0 : Math.max(0, 1 - progress * 2) }}
      >
        Slide to Pay · {amount.toLocaleString()} {currency}
      </div>

      {confirmed && (
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm gap-2">
          <Check className="h-5 w-5" /> Payment Confirmed!
        </div>
      )}

      {!confirmed && (
        <div
          className={`absolute top-1 left-1 h-14 w-14 rounded-xl bg-white dark:bg-background shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing ${
            !dragging && !processing ? "transition-all duration-300" : ""
          }`}
          style={{ transform: `translateX(${offset}px)` }}
          onPointerDown={(e) => {
            e.preventDefault();
            handleStart(e.clientX, e.pointerId);
          }}
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ChevronRight className="h-5 w-5 text-primary" />
          )}
        </div>
      )}

      <div
        className="absolute inset-0 bg-white/10 dark:bg-white/5 rounded-2xl pointer-events-none"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
});

SlideToPayButton.displayName = "SlideToPayButton";

export default SlideToPayButton;

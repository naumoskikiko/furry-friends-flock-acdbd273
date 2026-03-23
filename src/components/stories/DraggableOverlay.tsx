import { useRef, useState, useCallback } from "react";

interface DraggableOverlayProps {
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  onRemove?: () => void;
}

const DraggableOverlay = ({ children, initialX = 50, initialY = 50, onRemove }: DraggableOverlayProps) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance.current = Math.sqrt(dx * dx + dy * dy);
      initialScale.current = scale;
    } else if (e.touches.length === 1) {
      dragging.current = true;
      const rect = containerRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;
      offset.current = {
        x: e.touches[0].clientX - (rect.left + (pos.x / 100) * rect.width),
        y: e.touches[0].clientY - (rect.top + (pos.y / 100) * rect.height),
      };
    }
  }, [pos, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.3, Math.min(4, initialScale.current * (dist / initialDistance.current)));
      setScale(newScale);
    } else if (dragging.current && e.touches.length === 1) {
      const rect = containerRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const newX = ((e.touches[0].clientX - offset.current.x - rect.left) / rect.width) * 100;
      const newY = ((e.touches[0].clientY - offset.current.y - rect.top) / rect.height) * 100;
      setPos({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    dragging.current = false;
  }, []);

  // Mouse fallback
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = true;
    const rect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    offset.current = {
      x: e.clientX - (rect.left + (pos.x / 100) * rect.width),
      y: e.clientY - (rect.top + (pos.y / 100) * rect.height),
    };

    const handleMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const r = containerRef.current?.parentElement?.getBoundingClientRect();
      if (!r) return;
      const newX = ((ev.clientX - offset.current.x - r.left) / r.width) * 100;
      const newY = ((ev.clientY - offset.current.y - r.top) / r.height) * 100;
      setPos({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
    };
    const handleUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [pos]);

  return (
    <div
      ref={containerRef}
      className="absolute z-40 cursor-grab active:cursor-grabbing touch-none"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onRemove?.(); }}
    >
      {children}
    </div>
  );
};

export default DraggableOverlay;

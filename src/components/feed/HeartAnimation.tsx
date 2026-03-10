import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface HeartAnimationProps {
  show: boolean;
  onComplete: () => void;
}

const HeartAnimation = ({ show, onComplete }: HeartAnimationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <Heart
        className="h-20 w-20 fill-primary text-primary animate-heart-burst"
        style={{ filter: "drop-shadow(0 4px 12px hsl(var(--primary) / 0.4))" }}
      />
    </div>
  );
};

export default HeartAnimation;

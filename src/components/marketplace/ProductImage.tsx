import { useState } from "react";
import { PRODUCT_CATEGORIES } from "@/hooks/useBusiness";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  category?: string;
  className?: string;
  aspectRatio?: "square" | "landscape" | "auto";
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-28 w-full",
  xl: "h-72 w-full",
};

const ProductImage = ({
  src,
  alt,
  category,
  className = "",
  aspectRatio = "auto",
  size = "lg",
}: ProductImageProps) => {
  const [error, setError] = useState(false);
  const catInfo = PRODUCT_CATEGORIES.find((c) => c.value === category);
  const fallbackIcon = catInfo?.icon || "📦";
  const sizeClass = sizeMap[size] || sizeMap.lg;
  const aspectClass = aspectRatio === "square" ? "aspect-square" : "";

  if (!src || error) {
    return (
      <div
        className={`bg-secondary flex items-center justify-center ${sizeClass} ${aspectClass} ${className}`}
        aria-hidden="true"
      >
        <span className={size === "xl" ? "text-6xl" : size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-sm"}>
          {fallbackIcon}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`object-cover ${sizeClass} ${aspectClass} ${className}`}
    />
  );
};

export default ProductImage;

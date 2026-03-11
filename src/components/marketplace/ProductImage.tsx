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
  lg: "w-full",
  xl: "w-full",
};

const aspectMap = {
  square: "aspect-square",
  landscape: "aspect-[4/3]",
  auto: "",
};

const ProductImage = ({
  src,
  alt,
  category,
  className = "",
  aspectRatio = "square",
  size = "lg",
}: ProductImageProps) => {
  const [error, setError] = useState(false);
  const catInfo = PRODUCT_CATEGORIES.find((c) => c.value === category);
  const fallbackIcon = catInfo?.icon || "📦";
  const sizeClass = sizeMap[size] || sizeMap.lg;
  const aspectClass = aspectMap[aspectRatio] || "";

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
    <div className={`overflow-hidden ${sizeClass} ${aspectClass} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default ProductImage;

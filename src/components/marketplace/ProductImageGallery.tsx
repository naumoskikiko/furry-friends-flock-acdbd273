import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CATEGORIES } from "@/hooks/useBusiness";

interface ProductImageGalleryProps {
  productId: string;
  mainImageUrl: string | null | undefined;
  category?: string;
  alt: string;
}

const ProductImageGallery = ({ productId, mainImageUrl, category, alt }: ProductImageGalleryProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<Record<number, boolean>>({});

  const catInfo = PRODUCT_CATEGORIES.find((c) => c.value === category);
  const fallbackIcon = catInfo?.icon || "📦";

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("product_images")
        .select("image_url, display_order")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });

      const extraImages = (data || []).map((d: any) => d.image_url as string);
      const allImages = mainImageUrl ? [mainImageUrl, ...extraImages] : extraImages;
      setImages(allImages.length > 0 ? allImages : []);
    };
    load();
  }, [productId, mainImageUrl]);

  const handlePrev = () => setActiveIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const handleNext = () => setActiveIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  if (images.length === 0) {
    return (
      <div className="w-full aspect-square bg-secondary flex items-center justify-center">
        <span className="text-6xl">{fallbackIcon}</span>
      </div>
    );
  }

  const currentSrc = images[activeIndex];
  const hasError = error[activeIndex];

  return (
    <div className="relative w-full">
      {/* Main image */}
      <div className="w-full aspect-square overflow-hidden bg-secondary">
        {hasError ? (
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-6xl">{fallbackIcon}</span>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={alt}
            className="h-full w-full object-contain bg-secondary"
            onError={() => setError((e) => ({ ...e, [activeIndex]: true }))}
          />
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm p-1.5 shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm p-1.5 shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-foreground/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIndex ? "border-primary" : "border-transparent opacity-60"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;

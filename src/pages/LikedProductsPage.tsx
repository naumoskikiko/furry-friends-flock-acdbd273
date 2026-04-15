import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useLanguage } from "@/i18n/LanguageContext";
import ProductImage from "@/components/marketplace/ProductImage";

const LikedProductsPage = () => {
  const navigate = useNavigate();
  const { items, loading, toggle } = useWishlist();
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-20">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => navigate("/marketplace")} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-lg font-extrabold">{t("marketplace.likedProducts")}</h1>
            <p className="text-xs text-muted-foreground">{items.length} product{items.length !== 1 ? "s" : ""} saved</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
              <Heart className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold">You haven't liked any products yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Browse the marketplace and tap ❤️ to save products here
            </p>
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-2 rounded-xl petkeep-gradient text-primary-foreground px-5 py-2.5 text-xs font-bold"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div className="px-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 petkeep-card-hover"
              >
                <div
                  className="h-16 w-16 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => navigate(`/product/${item.product_id}`)}
                >
                  <ProductImage
                    src={item.product?.image_url || null}
                    alt={item.product?.name || "Product"}
                    category={item.product?.category || "other"}
                    size="md"
                    aspectRatio="square"
                    className="rounded-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-sm font-bold truncate cursor-pointer"
                    onClick={() => navigate(`/product/${item.product_id}`)}
                  >
                    {item.product?.name || "Product"}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.product?.category?.replace("_", " ") || ""}
                  </p>
                  <p className="text-sm font-extrabold text-primary mt-1">
                    {item.product?.price || 0} MKD
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggle(item.product_id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                  <button
                    onClick={() => navigate(`/product/${item.product_id}`)}
                    className="text-[10px] font-bold text-primary"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LikedProductsPage;

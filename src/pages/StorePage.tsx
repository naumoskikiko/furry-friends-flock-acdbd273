import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Star, MapPin, Globe, Phone, MessageCircle, BadgeCheck, Plus, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { BUSINESS_CATEGORIES, PRODUCT_CATEGORIES, type BusinessProfile, type Product } from "@/hooks/useBusiness";
import ProductImage from "@/components/marketplace/ProductImage";

const fromTable = (table: string) => supabase.from(table as any);

const StorePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, itemCount, totalPrice } = useCart();
  const [business, setBusiness] = useState<(BusinessProfile & { banner_url?: string }) | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [bizRes, prodRes] = await Promise.all([
        fromTable("business_profiles").select("*").eq("id", id).single(),
        fromTable("products").select("*").eq("business_id", id).eq("is_active", true).order("created_at", { ascending: false }),
      ]);
      setBusiness(bizRes.data as any);
      setProducts((prodRes.data as any) || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleMessage = async () => {
    if (!business || !user) return;
    try {
      const { data: convId } = await supabase.rpc("create_conversation_with_participant", {
        _other_user_id: business.user_id,
      });
      if (convId) navigate(`/messages?conversation=${convId}&userId=${business.user_id}`);
    } catch {
      navigate("/messages");
    }
  };

  const handleQuickAdd = async (productId: string, productName: string) => {
    try {
      await addToCart(productId, 1);
      toast({ title: "Added!", description: `${productName} added to cart` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filteredProducts = activeCategory === "all"
    ? products
    : products.filter((p) => p.category === activeCategory);

  const productCategories = [...new Set(products.map((p) => p.category))];
  const catInfo = business ? BUSINESS_CATEGORIES.find((c) => c.value === business.category) : null;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!business) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <span className="text-4xl mb-2">🏪</span>
          <p className="text-sm font-semibold">Store not found</p>
          <button onClick={() => navigate("/marketplace")} className="text-xs text-primary mt-2 font-bold">
            Back to Marketplace
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-24">
        {/* Banner */}
        <div className="relative">
          {business.banner_url ? (
            <div className="w-full aspect-[3/1] overflow-hidden">
              <img src={business.banner_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-[3/1] bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          <button
            onClick={() => navigate("/marketplace")}
            className="absolute top-3 left-3 rounded-full bg-background/80 backdrop-blur-sm p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Store info */}
        <div className="px-4 -mt-8 relative z-10">
          <div className="flex items-end gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card border-4 border-background text-2xl shadow-sm overflow-hidden shrink-0">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                catInfo?.icon || "🏪"
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-lg font-extrabold truncate">{business.business_name}</h1>
                {business.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground capitalize">{business.category.replace("_", " ")}</p>
            </div>
          </div>

          {business.description && (
            <p className="text-sm text-muted-foreground mt-3">{business.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3">
            {business.avg_rating > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {Number(business.avg_rating).toFixed(1)}
                <span className="text-muted-foreground">({business.total_reviews})</span>
              </span>
            )}
            {business.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {business.location}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{products.length} products</span>
          </div>

          <div className="flex gap-2 mt-3">
            {user?.id !== business.user_id && (
              <button
                onClick={handleMessage}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-bold"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Message Store
              </button>
            )}
            {business.website && (
              <a
                href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2.5 text-xs font-bold hover:bg-secondary"
              >
                <Globe className="h-3.5 w-3.5" />
              </a>
            )}
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2.5 text-xs font-bold hover:bg-secondary"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Product categories */}
        <div className="mt-5 px-4">
          <h3 className="font-display text-base font-bold mb-2">Menu ({products.length})</h3>
          {productCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setActiveCategory("all")}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategory === "all" ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                All
              </button>
              {productCategories.map((cat) => {
                const ci = PRODUCT_CATEGORIES.find((c) => c.value === cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeCategory === cat ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {ci?.icon} {ci?.label || cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product list */}
        <div className="px-4 mt-3">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl mb-2">📦</span>
              <p className="text-sm font-semibold">No products yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => {
                const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 petkeep-card-hover">
                    <div className="cursor-pointer shrink-0" onClick={() => navigate(`/product/${p.id}`)}>
                      <ProductImage src={p.image_url} alt={p.name} category={p.category} size="md" aspectRatio="square" className="rounded-xl" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>
                      <h4 className="text-sm font-bold truncate">{p.name}</h4>
                      {p.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                      <p className="text-sm font-extrabold text-primary mt-1">{p.price} MKD</p>
                    </div>
                    {!outOfStock ? (
                      <button
                        onClick={() => handleQuickAdd(p.id, p.name)}
                        className="flex h-9 w-9 items-center justify-center rounded-full petkeep-gradient text-primary-foreground shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-destructive shrink-0">Sold out</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating cart */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[358px]">
          <button
            onClick={() => navigate("/cart")}
            className="w-full flex items-center justify-between rounded-2xl petkeep-gradient text-primary-foreground px-5 py-4 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {itemCount}
              </div>
              <span className="text-sm font-bold">View Cart</span>
            </div>
            <span className="text-sm font-extrabold">{totalPrice.toLocaleString()} MKD</span>
          </button>
        </div>
      )}
    </AppLayout>
  );
};

export default StorePage;

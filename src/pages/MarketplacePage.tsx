import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Search, Star, Store, Plus, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAllBusinesses, useAllProducts, useMyBusiness, BUSINESS_CATEGORIES, PRODUCT_CATEGORIES } from "@/hooks/useBusiness";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import BusinessDashboard from "@/components/business/BusinessDashboard";
import ProductImage from "@/components/marketplace/ProductImage";
import { useRankedBusinesses, useRankedProducts } from "@/hooks/useRankedBusinesses";

const MarketplacePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [showDashboard, setShowDashboard] = useState(false);

  const { businesses, loading: bizLoading } = useAllBusinesses(undefined, searchQuery || undefined);
  const { products, loading: prodLoading } = useAllProducts(
    productCategory !== "all" ? productCategory : undefined,
    searchQuery || undefined
  );

  const handleSearch = (q: string) => {
    setSearchInput(q);
    if (q.length >= 2 || q.length === 0) setSearchQuery(q);
  };

  const isBusiness = profile?.role === "business";
  const { isAdmin } = useIsAdmin();
  const { itemCount, totalPrice, addToCart } = useCart();
  const { business: myBusiness, loading: myBizLoading } = useMyBusiness();
  const hasStore = !!myBusiness;
  const canManageStore = isBusiness || isAdmin;

  // Apply ranking algorithm (boost affects order, not visual)
  const rankedBusinesses = useRankedBusinesses(businesses);
  const rankedProducts = useRankedProducts(products);

  const featured = rankedBusinesses.filter((b) => b.avg_rating >= 4.0).slice(0, 6);
  const popularProducts = rankedProducts.slice(0, 6);

  const handleQuickAdd = async (productId: string, productName: string) => {
    try {
      await addToCart(productId, 1);
      toast({ title: "Added!", description: `${productName} added to cart` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const isSearching = searchQuery.length >= 2;

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-20">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Pet Vault</h1>
            <p className="text-sm text-muted-foreground">Your local pet marketplace</p>
          </div>
          <div className="flex items-center gap-2">
            {canManageStore && (
              <button
                onClick={() => setShowDashboard(true)}
                className="flex items-center gap-1.5 rounded-xl petkeep-gradient text-primary-foreground px-3 py-2 text-xs font-bold"
              >
                {hasStore ? (
                  <><Store className="h-3.5 w-3.5" /> Manage Store</>
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> Add Store</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products, stores, brands..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          <button
            onClick={() => setProductCategory("all")}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              productCategory === "all" ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            🐾 All
          </button>
          {PRODUCT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setProductCategory(c.value)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                productCategory === c.value ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Search results label */}
        {isSearching && (
          <div className="px-4 pb-2">
            <p className="text-xs font-bold text-muted-foreground">
              Search results for "{searchQuery}" — {rankedProducts.length} products, {rankedBusinesses.length} stores
            </p>
          </div>
        )}

        <div className="space-y-5">
          {/* Featured Stores */}
          {!isSearching && featured.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 mb-2">
                <h3 className="font-display text-base font-bold">⭐ Featured Stores</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {featured.map((b) => {
                  const catInfo = BUSINESS_CATEGORIES.find((c) => c.value === b.category);
                  return (
                    <div
                      key={b.id}
                      onClick={() => navigate(`/store/${b.id}`)}
                      className="min-w-[160px] rounded-2xl bg-card border border-border overflow-hidden shrink-0 petkeep-card-hover cursor-pointer"
                    >
                      <div className="h-16 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt="" loading="lazy" className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <span className="text-2xl">{catInfo?.icon || "🏪"}</span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold truncate">{b.business_name}</p>
                          {b.is_verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                            {Number(b.avg_rating).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{b.category.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="px-4 pb-4">
            {prodLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : rankedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-2">📦</span>
                <p className="text-sm font-semibold">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {canManageStore ? "Create your store to start selling" : "Products will appear here soon"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rankedProducts.map((p) => {
                  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0;
                  return (
                    <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden petkeep-card-hover">
                      <div className="relative cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>
                        <ProductImage src={p.image_url} alt={p.name} category={p.category} size="lg" aspectRatio="square" className="rounded-none" />
                        {outOfStock && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <span className="text-xs font-bold text-destructive">Out of stock</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-bold truncate cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>{p.name}</h4>
                        {p.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-sm font-extrabold text-primary">{p.price} MKD</p>
                          {!outOfStock && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleQuickAdd(p.id, p.name); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full petkeep-gradient text-primary-foreground"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

      {showDashboard && <BusinessDashboard onClose={() => setShowDashboard(false)} />}
    </AppLayout>
  );
};

export default MarketplacePage;

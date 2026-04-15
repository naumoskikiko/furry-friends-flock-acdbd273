import { useState, useCallback } from "react";
import { useTabRefresh } from "@/hooks/useTabRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Search, ChevronRight, Star, MapPin, Store, Package, Plus, BadgeCheck, ShoppingCart, Heart } from "lucide-react";
import InfiniteScrollSentinel from "@/components/InfiniteScrollSentinel";
import { useAuth } from "@/contexts/AuthContext";
import { useAllBusinesses, useAllProducts, useMyBusiness, BUSINESS_CATEGORIES, PRODUCT_CATEGORIES } from "@/hooks/useBusiness";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import BusinessDashboard from "@/components/business/BusinessDashboard";
import { useWishlist } from "@/hooks/useWishlist";
import ProductImage from "@/components/marketplace/ProductImage";
import { useRankedBusinesses, useRankedProducts } from "@/hooks/useRankedBusinesses";

const StoreRow = ({ b, navigate }: { b: any; navigate: (path: string) => void }) => {
  const catInfo = BUSINESS_CATEGORIES.find((c) => c.value === b.category);
  return (
    <div
      onClick={() => navigate(`/store/${b.id}`)}
      className="flex items-center gap-3 rounded-2xl bg-card p-3 border border-border petkeep-card-hover cursor-pointer"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl shrink-0 overflow-hidden">
        {b.logo_url ? (
          <img src={b.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          catInfo?.icon || "🏪"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h4 className="text-sm font-bold truncate">{b.business_name}</h4>
          {b.is_verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span className="capitalize">{b.category.replace("_", " ")}</span>
          {b.avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-primary text-primary" />
              {Number(b.avg_rating).toFixed(1)} ({b.total_reviews})
            </span>
          )}
          {b.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {b.location}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
};

const MarketplacePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "products" | "stores">("discover");
  const [productCategory, setProductCategory] = useState("all");
  const [businessCategory, setBusinessCategory] = useState("all");
  const [showDashboard, setShowDashboard] = useState(false);

  const { businesses, loading: bizLoading, hasMore: hasMoreBusinesses, loadMore: loadMoreBusinesses } = useAllBusinesses(
    activeTab === "stores" ? businessCategory : undefined,
    searchQuery || undefined
  );
  const { products, loading: prodLoading, hasMore: hasMoreProducts, loadMore: loadMoreProducts } = useAllProducts(
    activeTab === "products" ? productCategory : undefined,
    searchQuery || undefined
  );

  const handleSearch = (q: string) => {
    setSearchInput(q);
    if (q.length >= 2 || q.length === 0) setSearchQuery(q);
  };

  const refreshMarketplace = useCallback(async () => {
    setSearchQuery("");
    setSearchInput("");
    setActiveTab("discover");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useTabRefresh("/marketplace", refreshMarketplace);

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: refreshMarketplace });

  const isBusiness = profile?.role === "business";
  const { isAdmin } = useIsAdmin();
  const { itemCount, totalPrice, addToCart, businessConflict, resolveConflict } = useCart();
  const { business: myBusiness, loading: myBizLoading } = useMyBusiness();
  const hasStore = !!myBusiness;
  const canManageStore = isBusiness || isAdmin;
  const { count: wishlistCount } = useWishlist();

  // Apply ranking algorithm (boost affects order, not visual)
  const { all: rankedBusinesses } = useRankedBusinesses(businesses);
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
        {/* Header — outside pull-to-refresh */}
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Pet Vault</h1>
            <p className="text-sm text-muted-foreground">Your local pet marketplace</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/liked-products")}
              className="flex items-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-xs font-bold"
            >
              <Heart className={`h-3.5 w-3.5 ${wishlistCount > 0 ? "fill-destructive text-destructive" : ""}`} /> Liked
            </button>
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

        {/* Pull-to-refresh content area — below header, search, and tabs */}
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <PullToRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />

        {/* Tab toggle */}
        <div className="flex mx-4 mb-3 rounded-xl bg-secondary p-1">
          {[
            { key: "discover" as const, label: "Discover", icon: "✨" },
            { key: "stores" as const, label: "Stores", icon: null, Icon: Store, count: isSearching ? businesses.length : 0 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                activeTab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.icon ? <span className="text-sm">{t.icon}</span> : t.Icon && <t.Icon className="h-3.5 w-3.5" />}
              {t.label}
              {t.count > 0 && (
                <span className="bg-primary text-primary-foreground text-[9px] rounded-full px-1.5 ml-0.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ========== DISCOVER TAB ========== */}
        {activeTab === "discover" && !isSearching && (
          <div className="space-y-5">
            {/* Categories */}
            <div className="px-4">
              <div className="grid grid-cols-3 gap-2">
                {PRODUCT_CATEGORIES.slice(0, 6).map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setProductCategory(c.value); setActiveTab("products"); }}
                    className="rounded-2xl bg-card border border-border p-3 text-center petkeep-card-hover"
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <p className="text-[10px] font-bold mt-1">{c.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Stores */}
            {featured.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 mb-2">
                  <h3 className="font-display text-base font-bold">⭐ Featured Stores</h3>
                  <button onClick={() => setActiveTab("stores")} className="text-xs font-bold text-primary">See all</button>
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

            {/* Popular Products */}
            {popularProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 mb-2">
                  <h3 className="font-display text-base font-bold">🔥 Popular Products</h3>
                  <button onClick={() => setActiveTab("products")} className="text-xs font-bold text-primary">See all</button>
                </div>
                <div className="px-4 grid grid-cols-2 gap-3">
                  {popularProducts.map((p) => {
                    const outOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0;
                    const lowStock = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5;
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
                          {lowStock && <p className="text-[10px] font-bold text-amber-600 mt-0.5">Only {p.stock} left</p>}
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
              </div>
            )}


            {!bizLoading && !prodLoading && businesses.length === 0 && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <span className="text-4xl mb-2">🏪</span>
                <p className="text-sm font-semibold">No stores or products yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {canManageStore ? "Create your store to start selling" : "Stores will appear here soon"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========== PRODUCTS TAB ========== */}
        {(activeTab === "products" || (activeTab === "discover" && isSearching)) && (
          <>
            {activeTab === "products" && (
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
            )}

            {isSearching && activeTab === "discover" && (
              <div className="px-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground">
                  Search results for "{searchQuery}" — {products.length} products, {businesses.length} stores
                </p>
              </div>
            )}

            <div className="px-4 pb-4">
              {prodLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-4xl mb-2">📦</span>
                  <p className="text-sm font-semibold">No products found</p>
                </div>
              ) : (
                <>
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
                  <InfiniteScrollSentinel loading={prodLoading} hasMore={hasMoreProducts} onLoadMore={loadMoreProducts} itemCount={products.length} endMessage="No more products" />
                </>
              )}
            </div>
          </>
        )}

        {/* ========== STORES TAB ========== */}
        {activeTab === "stores" && (
          <>
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
              <button
                onClick={() => setBusinessCategory("all")}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  businessCategory === "all" ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                🐾 All
              </button>
              {BUSINESS_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setBusinessCategory(c.value)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    businessCategory === c.value ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              {bizLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : businesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-4xl mb-2">🏪</span>
                  <p className="text-sm font-semibold">No stores found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rankedBusinesses.map((b) => <StoreRow key={b.id} b={b} navigate={navigate} />)}
                </div>
              )}
              <InfiniteScrollSentinel loading={bizLoading} hasMore={hasMoreBusinesses} onLoadMore={loadMoreBusinesses} itemCount={businesses.length} endMessage="No more stores" />
            </div>
          </>
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

      {showDashboard && <BusinessDashboard onClose={() => setShowDashboard(false)} />}
      <BusinessConflictModal conflict={businessConflict} onResolve={resolveConflict} />
    </AppLayout>
  );
};

export default MarketplacePage;

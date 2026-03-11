import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Search, ChevronRight, Star, MapPin, Store, Package, Plus, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAllBusinesses, useAllProducts, BUSINESS_CATEGORIES, PRODUCT_CATEGORIES } from "@/hooks/useBusiness";
import BusinessDashboard from "@/components/business/BusinessDashboard";

const MarketplacePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "businesses">("products");
  const [productCategory, setProductCategory] = useState("all");
  const [businessCategory, setBusinessCategory] = useState("all");
  const [showDashboard, setShowDashboard] = useState(false);

  const { businesses, loading: bizLoading } = useAllBusinesses(
    activeTab === "businesses" ? businessCategory : undefined,
    activeTab === "businesses" ? searchQuery : undefined
  );
  const { products, loading: prodLoading } = useAllProducts(
    activeTab === "products" ? productCategory : undefined,
    activeTab === "products" ? searchQuery : undefined
  );

  const handleSearch = (q: string) => {
    setSearchInput(q);
    if (q.length >= 2 || q.length === 0) setSearchQuery(q);
  };

  const featured = businesses.filter((b) => b.avg_rating >= 4.0).slice(0, 5);
  const isBusiness = profile?.role === "business";

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Pet Vault</h1>
            <p className="text-sm text-muted-foreground">Your local pet marketplace</p>
          </div>
          {isBusiness && (
            <button
              onClick={() => setShowDashboard(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors"
            >
              <Store className="h-3.5 w-3.5" /> Dashboard
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products, stores..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex mx-4 mb-3 rounded-xl bg-secondary p-1">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "products" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Products
          </button>
          <button
            onClick={() => setActiveTab("businesses")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "businesses" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Store className="h-3.5 w-3.5" /> Stores
          </button>
        </div>

        {activeTab === "products" && (
          <>
            {/* Product categories */}
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

            {/* Products grid */}
            <div className="px-4 pb-4">
              {prodLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-4xl mb-2">📦</span>
                  <p className="text-sm font-semibold">No products yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isBusiness ? "Add products from your dashboard" : "Products from businesses will appear here"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {products.map((p) => {
                    const catInfo = PRODUCT_CATEGORIES.find((c) => c.value === p.category);
                    return (
                      <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden petkeep-card-hover">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-32 w-full object-cover" />
                        ) : (
                          <div className="h-32 w-full bg-secondary flex items-center justify-center text-3xl">
                            {catInfo?.icon || "📦"}
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="text-xs font-bold truncate">{p.name}</h4>
                          {p.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                          <p className="text-sm font-bold text-primary mt-1">{p.price} MKD</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "businesses" && (
          <>
            {/* Business categories */}
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

            {/* Featured partners */}
            {featured.length > 0 && !searchQuery && businessCategory === "all" && (
              <div className="px-4 pb-4">
                <h3 className="font-display text-base font-bold mb-2">⭐ Featured Partners</h3>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {featured.map((b) => {
                    const catInfo = BUSINESS_CATEGORIES.find((c) => c.value === b.category);
                    return (
                      <div key={b.id} className="min-w-[180px] rounded-2xl bg-card border border-border p-3 shrink-0 petkeep-card-hover">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl">
                            {catInfo?.icon || "🏪"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{b.business_name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              {Number(b.avg_rating).toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All businesses */}
            <div className="px-4 pb-4">
              <h3 className="font-display text-base font-bold mb-2">All Stores</h3>
              {bizLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : businesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-4xl mb-2">🏪</span>
                  <p className="text-sm font-semibold">No stores yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Business accounts will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {businesses.map((b) => {
                    const catInfo = BUSINESS_CATEGORIES.find((c) => c.value === b.category);
                    return (
                      <div
                        key={b.id}
                        onClick={() => navigate(`/store/${b.id}`)}
                        className="flex items-center gap-3 rounded-2xl bg-card p-4 border border-border petkeep-card-hover cursor-pointer"
                      >
                         <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl">
                           {catInfo?.icon || "🏪"}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1">
                             <h4 className="text-sm font-bold truncate">{b.business_name}</h4>
                             {b.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                           </div>
                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <span className="capitalize">{b.category.replace("_", " ")}</span>
                             {b.avg_rating > 0 && (
                               <span className="flex items-center gap-0.5">
                                 <Star className="h-3 w-3 fill-primary text-primary" />
                                 {Number(b.avg_rating).toFixed(1)}
                               </span>
                             )}
                             {b.location && (
                               <span className="flex items-center gap-0.5">
                                 <MapPin className="h-3 w-3" /> {b.location}
                               </span>
                             )}
                           </div>
                         </div>
                         <ChevronRight className="h-4 w-4 text-muted-foreground" />
                       </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Business dashboard */}
      {showDashboard && <BusinessDashboard onClose={() => setShowDashboard(false)} />}
    </AppLayout>
  );
};

export default MarketplacePage;

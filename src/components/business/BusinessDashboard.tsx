import { useState, useMemo } from "react";
import {
  ChevronLeft, Plus, Package, Store, Trash2, Edit2, ShoppingBag, Truck,
  CheckCircle, BarChart3, Users, Bell, AlertTriangle, Copy, Save, X,
  TrendingUp, DollarSign, Star, Clock, Image as ImageIcon, Zap, Eye, EyeOff,
  Boxes, MessageSquareText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMyBusiness, useBusinessProducts, BUSINESS_CATEGORIES, PRODUCT_CATEGORIES } from "@/hooks/useBusiness";
import { useStoreOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import ProductImage from "@/components/marketplace/ProductImage";
import BoostModal from "@/components/marketplace/BoostModal";
import BoostBadge from "@/components/marketplace/BoostBadge";
import { useBoostedIds } from "@/hooks/useBoosts";
import DashboardOverviewTab from "./tabs/DashboardOverviewTab";
import DashboardCustomersTab from "./tabs/DashboardCustomersTab";
import DashboardReviewsTab from "./tabs/DashboardReviewsTab";
import DashboardInventoryTab from "./tabs/DashboardInventoryTab";
import DashboardCouponsTab from "./tabs/DashboardCouponsTab";
import DashboardDeliveryTab from "./tabs/DashboardDeliveryTab";

interface BusinessDashboardProps {
  onClose: () => void;
}

const STATUS_FLOW = ["paid", "processing", "shipped", "delivered"] as const;
const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-primary/10 text-primary",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-destructive/10 text-destructive",
};

type TabKey = "overview" | "products" | "orders" | "inventory" | "coupons" | "delivery" | "store" | "customers" | "reviews" | "analytics";

const BusinessDashboard = ({ onClose }: BusinessDashboardProps) => {
  const { business, createBusiness, updateBusiness, refresh } = useMyBusiness();
  const { products, addProduct, updateProduct, deleteProduct } = useBusinessProducts(business?.id || null);
  const { orders: storeOrders, loading: ordersLoading, updateOrderStatus } = useStoreOrders(business?.id || null);
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>("overview");
  const [boostModal, setBoostModal] = useState<{ type: "product" | "store" | "provider"; id: string; name: string } | null>(null);
  const boostedProductIds = useBoostedIds("product");
  const boostedStoreIds = useBoostedIds("store");

  // Setup form
  const [setupName, setSetupName] = useState("");
  const [setupCategory, setSetupCategory] = useState("pet_shop");
  const [setupDesc, setSetupDesc] = useState("");
  const [setupLocation, setSetupLocation] = useState("");
  const [setupWebsite, setSetupWebsite] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Product form
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCategory, setProdCategory] = useState("general");
  const [prodStock, setProdStock] = useState("");
  const [prodSaving, setProdSaving] = useState(false);
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodExtraImages, setProdExtraImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Store edit form
  const [editingStore, setEditingStore] = useState(false);
  const [storeForm, setStoreForm] = useState({
    business_name: "",
    description: "",
    location: "",
    website: "",
    phone: "",
    category: "",
  });

  // Analytics
  const analytics = useMemo(() => {
    const totalRevenue = storeOrders.reduce((s, i) => s + Number(i.store_earnings || 0), 0);
    const totalOrders = new Set(storeOrders.map((i) => i.order_id)).size;
    const productsSold = storeOrders.reduce((s, i) => s + i.quantity, 0);
    const pendingOrders = storeOrders.filter((i) => {
      const st = (i as any).order?.status;
      return st === "paid" || st === "processing";
    }).length;
    const lowStockProducts = products.filter((p) => p.stock !== null && p.stock !== undefined && p.stock <= 5 && p.stock > 0);
    const outOfStockProducts = products.filter((p) => p.stock !== null && p.stock !== undefined && p.stock <= 0);

    const prodSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    storeOrders.forEach((item) => {
      const pid = item.product_id;
      if (!prodSales[pid]) prodSales[pid] = { name: (item as any).product?.name || "Product", qty: 0, revenue: 0 };
      prodSales[pid].qty += item.quantity;
      prodSales[pid].revenue += Number(item.store_earnings || 0);
    });
    const topProducts = Object.values(prodSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const dayMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    storeOrders.forEach((item) => {
      const day = item.created_at?.slice(0, 10);
      if (day && dayMap[day] !== undefined) dayMap[day]++;
    });
    const ordersPerDay = Object.entries(dayMap).map(([date, count]) => ({
      label: new Date(date).toLocaleDateString("en-GB", { weekday: "short" }),
      count,
    }));

    return { totalRevenue, totalOrders, productsSold, pendingOrders, lowStockProducts, outOfStockProducts, topProducts, ordersPerDay };
  }, [storeOrders, products]);

  const handleSetup = async () => {
    if (!setupName.trim()) return;
    setCreating(true);
    try {
      await createBusiness({
        business_name: setupName, category: setupCategory, description: setupDesc,
        location: setupLocation, website: setupWebsite, phone: setupPhone,
      });
      toast({ title: "Business profile created!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const resetProductForm = () => {
    setProdName(""); setProdDesc(""); setProdPrice(""); setProdCategory("general"); setProdStock(""); setProdImageUrl(""); setProdExtraImages([]);
    setAddingProduct(false); setEditingProduct(null);
  };

  const startEditProduct = async (p: any) => {
    setProdName(p.name); setProdDesc(p.description || ""); setProdPrice(String(p.price));
    setProdCategory(p.category); setProdStock(p.stock !== null && p.stock !== undefined ? String(p.stock) : "");
    setProdImageUrl(p.image_url || ""); setEditingProduct(p.id); setAddingProduct(true);
    const { data } = await (supabase as any).from("product_images").select("image_url").eq("product_id", p.id).order("display_order");
    setProdExtraImages((data || []).map((d: any) => d.image_url));
  };

  const handleDuplicateProduct = async (p: any) => {
    try {
      await addProduct({ name: `${p.name} (Copy)`, description: p.description, price: p.price, category: p.category, image_url: p.image_url, stock: p.stock });
      toast({ title: "Product duplicated!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleVisibility = async (p: any) => {
    try {
      await updateProduct(p.id, { is_active: !p.is_active } as any);
      toast({ title: p.is_active ? "Product hidden" : "Product visible" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveProduct = async () => {
    if (!prodName.trim() || !prodPrice) return;
    setProdSaving(true);
    try {
      const fields: any = {
        name: prodName, description: prodDesc, price: parseFloat(prodPrice),
        category: prodCategory, image_url: prodImageUrl || null,
        stock: prodStock ? parseInt(prodStock) : null,
      };
      let productId = editingProduct;
      if (editingProduct) {
        await updateProduct(editingProduct, fields);
        await (supabase as any).from("product_images").delete().eq("product_id", editingProduct);
        toast({ title: "Product updated!" });
      } else {
        await addProduct(fields);
        const { data: newProds } = await (supabase as any).from("products").select("id").eq("business_id", business?.id).order("created_at", { ascending: false }).limit(1);
        productId = newProds?.[0]?.id;
        toast({ title: "Product added!" });
      }
      if (productId && prodExtraImages.length > 0) {
        const rows = prodExtraImages.map((url, i) => ({ product_id: productId, image_url: url, display_order: i }));
        await (supabase as any).from("product_images").insert(rows);
      }
      resetProductForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setProdSaving(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const filePath = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return publicUrl;
  };

  const handleProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImage(true);
    const url = await uploadImage(file); if (url) setProdImageUrl(url);
    setUploadingImage(false);
  };

  const handleExtraImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    setUploadingImage(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) { const url = await uploadImage(file); if (url) newUrls.push(url); }
    setProdExtraImages((prev) => [...prev, ...newUrls]);
    setUploadingImage(false);
  };

  const handleSaveStore = async () => {
    try {
      await updateBusiness(storeForm as any);
      toast({ title: "Store updated!" }); setEditingStore(false); await refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const filePath = `logos/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
    await updateBusiness({ logo_url: publicUrl } as any);
    toast({ title: "Logo updated!" }); await refresh();
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const filePath = `banners/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
    await updateBusiness({ banner_url: publicUrl } as any);
    toast({ title: "Banner updated!" }); await refresh();
  };

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "products" as const, label: "Products", icon: Package },
    { key: "orders" as const, label: "Orders", icon: ShoppingBag },
    { key: "inventory" as const, label: "Inventory", icon: Boxes },
    { key: "customers" as const, label: "Customers", icon: Users },
    { key: "reviews" as const, label: "Reviews", icon: MessageSquareText },
    { key: "store" as const, label: "Store", icon: Store },
    { key: "analytics" as const, label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold flex-1">
            {business ? "Store Dashboard" : "Create Store"}
          </h1>
        </div>

        {!business ? (
          /* Setup form */
          <div className="px-4 py-6 pb-24 space-y-4">
            <div className="text-center mb-4">
              <span className="text-4xl">🏪</span>
              <h2 className="font-display text-xl font-bold mt-2">Set up your store</h2>
              <p className="text-sm text-muted-foreground">Start selling pet products on PetKeep</p>
            </div>
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="Happy Paws Pet Shop" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setSetupCategory(c.value)}
                    className={`rounded-xl border-2 p-2.5 text-left transition-all ${setupCategory === c.value ? "border-primary bg-primary/5" : "border-border"}`}>
                    <span className="text-lg">{c.icon}</span>
                    <p className="text-xs font-bold mt-0.5">{c.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={setupDesc} onChange={(e) => setSetupDesc(e.target.value)} placeholder="Tell customers about your business..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={setupLocation} onChange={(e) => setSetupLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={setupWebsite} onChange={(e) => setSetupWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={setupPhone} onChange={(e) => setSetupPhone(e.target.value)} placeholder="+1 234..." />
              </div>
            </div>
            <Button onClick={handleSetup} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={creating || !setupName.trim()}>
              {creating ? "Creating..." : "Create Store"}
            </Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-border scrollbar-hide">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-shrink-0 py-3 px-3 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${
                    tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}>
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="px-4 py-4">
              {/* OVERVIEW */}
              {tab === "overview" && (
                <DashboardOverviewTab business={business} analytics={analytics} onTabChange={(t) => setTab(t as TabKey)} />
              )}

              {/* PRODUCTS */}
              {tab === "products" && (
                <div className="space-y-3">
                  {!addingProduct ? (
                    <button onClick={() => { resetProductForm(); setAddingProduct(true); }}
                      className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm font-bold text-primary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" /> Add Product
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold">{editingProduct ? "Edit Product" : "New Product"}</h3>
                        <button onClick={resetProductForm} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Product Name *</Label>
                        <Input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Premium Dog Food" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Product description..." rows={2} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Price (MKD) *</Label>
                          <Input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="0" min="0" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Stock</Label>
                          <Input type="number" value={prodStock} onChange={(e) => setProdStock(e.target.value)} placeholder="∞" min="0" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Category</Label>
                          <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}
                            className="w-full rounded-xl bg-secondary px-2 py-2 text-xs outline-none">
                            {PRODUCT_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.icon} {c.label}</option>))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Product Images</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          {prodImageUrl && (
                            <div className="relative">
                              <img src={prodImageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                              <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[8px] px-1 rounded-tl-lg rounded-br-lg font-bold">Main</span>
                              <button onClick={() => setProdImageUrl("")} className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground h-4 w-4 flex items-center justify-center">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                          {prodExtraImages.map((url, i) => (
                            <div key={i} className="relative">
                              <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                              <button onClick={() => setProdExtraImages((imgs) => imgs.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground h-4 w-4 flex items-center justify-center">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                          <div className="flex flex-col gap-1">
                            {!prodImageUrl && (
                              <label className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold cursor-pointer hover:bg-secondary/80">
                                <ImageIcon className="h-3.5 w-3.5" /> Main Image
                                <input type="file" accept="image/*" onChange={handleProductImage} className="hidden" />
                              </label>
                            )}
                            <label className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-bold cursor-pointer hover:bg-secondary/80">
                              <Plus className="h-3.5 w-3.5" /> Add More
                              <input type="file" accept="image/*" multiple onChange={handleExtraImages} className="hidden" />
                            </label>
                          </div>
                          {uploadingImage && <span className="text-xs text-muted-foreground">Uploading...</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProduct} className="flex-1 petkeep-gradient text-primary-foreground font-bold" disabled={prodSaving || !prodName.trim() || !prodPrice}>
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          {prodSaving ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                        </Button>
                        <Button variant="outline" onClick={resetProductForm}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Product list */}
                  {products.map((p) => {
                    const isLowStock = p.stock !== null && p.stock !== undefined && p.stock <= 5 && p.stock > 0;
                    const isOutOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0;
                    return (
                      <div key={p.id} className={`rounded-2xl bg-card border border-border p-3 ${!p.is_active ? "opacity-60" : ""}`}>
                        <div className="flex items-start gap-3">
                          <ProductImage src={p.image_url} alt={p.name} category={p.category} size="md" className="rounded-xl shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold truncate">{p.name}</h4>
                              {!p.is_active && (
                                <span className="text-[8px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">Hidden</span>
                              )}
                            </div>
                            {p.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm font-bold text-primary">{p.price} MKD</p>
                              {p.stock !== null && p.stock !== undefined && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  isOutOfStock ? "bg-destructive/10 text-destructive" :
                                  isLowStock ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                  "bg-secondary text-muted-foreground"
                                }`}>
                                  {isOutOfStock ? "Out of stock" : `${p.stock} in stock`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-2 pt-2 border-t border-border flex-wrap">
                          <button onClick={() => startEditProduct(p)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-secondary hover:bg-secondary/80">
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button onClick={() => handleDuplicateProduct(p)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-secondary hover:bg-secondary/80">
                            <Copy className="h-3 w-3" /> Duplicate
                          </button>
                          <button onClick={() => handleToggleVisibility(p)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-secondary hover:bg-secondary/80">
                            {p.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                          </button>
                          <button
                            onClick={() => setBoostModal({ type: "product", id: p.id, name: p.name })}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                              boostedProductIds.has(p.id) ? "bg-amber-500/10 text-amber-600" : "bg-secondary hover:bg-secondary/80"
                            }`}>
                            <Zap className="h-3 w-3" /> {boostedProductIds.has(p.id) ? "Boosted" : "Boost"}
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-auto">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {products.length === 0 && !addingProduct && (
                    <div className="text-center py-8">
                      <span className="text-3xl">📦</span>
                      <p className="text-sm font-semibold mt-2">No products yet</p>
                      <p className="text-xs text-muted-foreground">Add your first product to start selling</p>
                    </div>
                  )}
                </div>
              )}

              {/* ORDERS */}
              {tab === "orders" && (
                <div className="space-y-3">
                  {ordersLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : storeOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-3xl">📋</span>
                      <p className="text-sm font-semibold mt-2">No orders yet</p>
                      <p className="text-xs text-muted-foreground">Orders from customers will appear here</p>
                    </div>
                  ) : (
                    storeOrders.map((item) => {
                      const order = (item as any).order;
                      const status = order?.status || "pending";
                      return (
                        <div key={item.id} className="rounded-2xl bg-card border border-border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ProductImage src={(item as any).product?.image_url} alt="" category="" size="sm" className="rounded-lg" />
                              <div>
                                <p className="text-xs font-bold">{(item as any).product?.name || "Product"}</p>
                                <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} · {(item.price * item.quantity).toLocaleString()} MKD</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[status] || "bg-secondary"}`}>
                              {status}
                            </span>
                          </div>

                          {order && (
                            <div className="rounded-xl bg-secondary/50 p-2.5 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <p className="text-[10px] font-bold">{order.shipping_name}</p>
                                <span className="text-[10px] text-muted-foreground ml-auto">{order.shipping_phone}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {order.shipping_address}, {order.shipping_city} {order.shipping_postal_code}, {order.shipping_country}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-[10px]">
                            <span className="text-muted-foreground">Earnings: <span className="font-bold text-foreground">{Number(item.store_earnings).toLocaleString()} MKD</span></span>
                            <span className="text-muted-foreground">Fee: {Number(item.platform_fee).toLocaleString()} MKD</span>
                          </div>

                          {["paid", "processing", "shipped"].includes(status) && (
                            <div className="flex gap-2 flex-wrap">
                              {status === "paid" && (
                                <button onClick={() => updateOrderStatus(item.order_id, "processing")} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Package className="h-3 w-3" /> Processing
                                </button>
                              )}
                              {(status === "paid" || status === "processing") && (
                                <button onClick={() => updateOrderStatus(item.order_id, "shipped")} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  <Truck className="h-3 w-3" /> Shipped
                                </button>
                              )}
                              {status === "shipped" && (
                                <button onClick={() => updateOrderStatus(item.order_id, "delivered")} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3" /> Delivered
                                </button>
                              )}
                              {status !== "cancelled" && (
                                <button onClick={() => updateOrderStatus(item.order_id, "cancelled")} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                  <X className="h-3 w-3" /> Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* INVENTORY */}
              {tab === "inventory" && (
                <DashboardInventoryTab products={products} onUpdateProduct={updateProduct} />
              )}

              {/* CUSTOMERS */}
              {tab === "customers" && business && (
                <DashboardCustomersTab businessId={business.id} />
              )}

              {/* REVIEWS */}
              {tab === "reviews" && business && (
                <DashboardReviewsTab businessId={business.id} products={products} />
              )}

              {/* STORE */}
              {tab === "store" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-card border border-border overflow-hidden">
                    <div className="relative h-28 bg-gradient-to-br from-primary/20 to-accent/20">
                      {(business as any).banner_url && (
                        <img src={(business as any).banner_url} alt="" className="h-full w-full object-cover" />
                      )}
                      <label className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-background/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold cursor-pointer">
                        <ImageIcon className="h-3 w-3" /> Banner
                        <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                      </label>
                    </div>
                    <div className="px-4 -mt-6 pb-4">
                      <div className="relative inline-block">
                        <div className="h-14 w-14 rounded-xl bg-card border-4 border-background overflow-hidden flex items-center justify-center text-2xl">
                          {business.logo_url ? (
                            <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.icon || "🏪"
                          )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground cursor-pointer">
                          <Edit2 className="h-2.5 w-2.5" />
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {editingStore ? (
                    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                      <h3 className="text-sm font-bold">Edit Store Details</h3>
                      <div className="space-y-2"><Label className="text-xs">Store Name</Label><Input value={storeForm.business_name} onChange={(e) => setStoreForm((f) => ({ ...f, business_name: e.target.value }))} /></div>
                      <div className="space-y-2"><Label className="text-xs">Description</Label><Textarea value={storeForm.description} onChange={(e) => setStoreForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
                      <div className="space-y-2"><Label className="text-xs">Location</Label><Input value={storeForm.location} onChange={(e) => setStoreForm((f) => ({ ...f, location: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><Label className="text-xs">Website</Label><Input value={storeForm.website} onChange={(e) => setStoreForm((f) => ({ ...f, website: e.target.value }))} /></div>
                        <div className="space-y-2"><Label className="text-xs">Phone</Label><Input value={storeForm.phone} onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))} /></div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveStore} className="flex-1 petkeep-gradient text-primary-foreground font-bold"><Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes</Button>
                        <Button variant="outline" onClick={() => setEditingStore(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold">Store Details</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBoostModal({ type: "store", id: business.id, name: business.business_name })}
                            className={`flex items-center gap-1 text-[10px] font-bold ${boostedStoreIds.has(business.id) ? "text-amber-600" : "text-muted-foreground hover:text-amber-600"}`}>
                            <Zap className="h-3 w-3" /> {boostedStoreIds.has(business.id) ? "Boosted" : "Boost"}
                          </button>
                          <button onClick={() => {
                            setStoreForm({ business_name: business.business_name, description: business.description || "", location: business.location || "", website: business.website || "", phone: business.phone || "", category: business.category });
                            setEditingStore(true);
                          }} className="flex items-center gap-1 text-[10px] font-bold text-primary">
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Name", value: business.business_name },
                          { label: "Category", value: business.category.replace("_", " ") },
                          { label: "Description", value: business.description || "—" },
                          { label: "Location", value: business.location || "—" },
                          { label: "Website", value: business.website || "—" },
                          { label: "Phone", value: business.phone || "—" },
                        ].map((f) => (
                          <div key={f.label} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{f.label}</span>
                            <span className="font-semibold capitalize truncate max-w-[60%] text-right">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ANALYTICS */}
              {tab === "analytics" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <h4 className="text-xs font-bold mb-3">🏆 Top Selling Products</h4>
                    {analytics.topProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No sales data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topProducts.map((tp, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{tp.name}</p>
                              <p className="text-[10px] text-muted-foreground">{tp.qty} sold</p>
                            </div>
                            <span className="text-xs font-bold text-primary">{tp.revenue.toLocaleString()} MKD</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-card border border-border p-4">
                    <h4 className="text-xs font-bold mb-3">📊 Orders Per Day</h4>
                    <div className="flex items-end gap-1 h-24">
                      {analytics.ordersPerDay.map((d, i) => {
                        const max = Math.max(...analytics.ordersPerDay.map((x) => x.count), 1);
                        const h = Math.max(4, (d.count / max) * 100);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[8px] font-bold">{d.count > 0 ? d.count : ""}</span>
                            <div className="w-full rounded-t-md petkeep-gradient transition-all" style={{ height: `${h}%` }} />
                            <span className="text-[8px] text-muted-foreground">{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-card border border-border p-4">
                    <h4 className="text-xs font-bold mb-3">📦 Inventory Overview</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="font-display text-lg font-extrabold">{products.length}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-lg font-extrabold text-amber-600">{analytics.lowStockProducts.length}</p>
                        <p className="text-[10px] text-muted-foreground">Low Stock</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-lg font-extrabold text-destructive">{analytics.outOfStockProducts.length}</p>
                        <p className="text-[10px] text-muted-foreground">Out of Stock</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {boostModal && (
        <BoostModal type={boostModal.type} targetId={boostModal.id} targetName={boostModal.name} onClose={() => setBoostModal(null)} />
      )}
    </div>
  );
};

export default BusinessDashboard;

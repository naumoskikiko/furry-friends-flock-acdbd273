import { useState } from "react";
import { ChevronLeft, Plus, Package, Store, Trash2, Edit2, ShoppingBag, Truck, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMyBusiness, useBusinessProducts, BUSINESS_CATEGORIES, PRODUCT_CATEGORIES } from "@/hooks/useBusiness";
import { useStoreOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";

interface BusinessDashboardProps {
  onClose: () => void;
}

const BusinessDashboard = ({ onClose }: BusinessDashboardProps) => {
  const { business, createBusiness, updateBusiness, refresh } = useMyBusiness();
  const { products, addProduct, deleteProduct } = useBusinessProducts(business?.id || null);
  const { orders: storeOrders, loading: ordersLoading, updateOrderStatus } = useStoreOrders(business?.id || null);
  const { toast } = useToast();

  const [tab, setTab] = useState<"profile" | "products">("profile");

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
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCategory, setProdCategory] = useState("general");
  const [prodSaving, setProdSaving] = useState(false);
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSetup = async () => {
    if (!setupName.trim()) return;
    setCreating(true);
    try {
      await createBusiness({
        business_name: setupName,
        category: setupCategory,
        description: setupDesc,
        location: setupLocation,
        website: setupWebsite,
        phone: setupPhone,
      });
      toast({ title: "Business profile created!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleAddProduct = async () => {
    if (!prodName.trim() || !prodPrice) return;
    setProdSaving(true);
    try {
      await addProduct({
        name: prodName,
        description: prodDesc,
        price: parseFloat(prodPrice),
        category: prodCategory,
        image_url: prodImageUrl || undefined,
      });
      toast({ title: "Product added!" });
      setProdName("");
      setProdDesc("");
      setProdPrice("");
      setProdCategory("general");
      setProdImageUrl("");
      setAddingProduct(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setProdSaving(false);
  };

  const handleProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const filePath = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingImage(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setProdImageUrl(publicUrl);
    setUploadingImage(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold flex-1">
            {business ? "Business Dashboard" : "Create Business"}
          </h1>
        </div>

        {!business ? (
          /* Setup form */
          <div className="px-4 py-6 pb-24 space-y-4">
            <div className="text-center mb-4">
              <span className="text-4xl">🏪</span>
              <h2 className="font-display text-xl font-bold mt-2">Set up your business</h2>
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
                  <button
                    key={c.value}
                    onClick={() => setSetupCategory(c.value)}
                    className={`rounded-xl border-2 p-2.5 text-left transition-all ${
                      setupCategory === c.value ? "border-primary bg-petkeep-cream dark:bg-primary/10" : "border-border"
                    }`}
                  >
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
              {creating ? "Creating..." : "Create Business Profile"}
            </Button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { key: "profile" as const, label: "Profile", icon: Store },
                { key: "products" as const, label: "Products", icon: Package },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 ${
                    tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="px-4 py-4">
              {tab === "profile" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-card border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-2xl text-primary-foreground font-bold">
                        {BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.icon || "🏪"}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold">{business.business_name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{business.category.replace("_", " ")}</p>
                      </div>
                    </div>
                    {business.description && <p className="mt-3 text-sm text-muted-foreground">{business.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-petkeep-cream dark:bg-primary/10 p-3">
                      <p className="text-xs font-bold text-primary">Products</p>
                      <p className="font-display text-2xl font-extrabold">{products.length}</p>
                    </div>
                    <div className="rounded-2xl bg-petkeep-mint-light dark:bg-accent/10 p-3">
                      <p className="text-xs font-bold text-accent">Rating</p>
                      <p className="font-display text-2xl font-extrabold">
                        {business.avg_rating > 0 ? Number(business.avg_rating).toFixed(1) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "products" && (
                <div className="space-y-3">
                  {!addingProduct ? (
                    <button
                      onClick={() => setAddingProduct(true)}
                      className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm font-bold text-primary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add Product
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                      <h3 className="text-sm font-bold">New Product</h3>
                      <div className="space-y-2">
                        <Label>Product Name *</Label>
                        <Input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Premium Dog Food" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Product description..." rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Price (MKD) *</Label>
                          <Input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="0" min="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <select
                            value={prodCategory}
                            onChange={(e) => setProdCategory(e.target.value)}
                            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none"
                          >
                            {PRODUCT_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Product Image</Label>
                        <input type="file" accept="image/*" onChange={handleProductImage} className="text-xs" />
                        {uploadingImage && <p className="text-xs text-muted-foreground">Uploading...</p>}
                        {prodImageUrl && <img src={prodImageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddProduct} className="flex-1 petkeep-gradient text-primary-foreground font-bold" disabled={prodSaving || !prodName.trim() || !prodPrice}>
                          {prodSaving ? "Saving..." : "Add Product"}
                        </Button>
                        <Button variant="outline" onClick={() => setAddingProduct(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {products.map((p) => (
                    <div key={p.id} className="rounded-2xl bg-card border border-border p-4">
                      <div className="flex items-start gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-xl">
                            {PRODUCT_CATEGORIES.find((c) => c.value === p.category)?.icon || "📦"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold truncate">{p.name}</h4>
                          {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                          <p className="text-sm font-bold text-primary mt-1">{p.price} MKD</p>
                        </div>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {products.length === 0 && !addingProduct && (
                    <div className="text-center py-8">
                      <span className="text-3xl">📦</span>
                      <p className="text-sm font-semibold mt-2">No products yet</p>
                      <p className="text-xs text-muted-foreground">Add your first product to start selling</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;

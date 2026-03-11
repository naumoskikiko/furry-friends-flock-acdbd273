import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Minus, Plus, ShoppingCart, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { PRODUCT_CATEGORIES } from "@/hooks/useBusiness";

const fromTable = (table: string) => (supabase as any).from(table);

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data: prod } = await fromTable("products").select("*").eq("id", id).single();
      setProduct(prod);
      if (prod) {
        const { data: biz } = await fromTable("business_profiles")
          .select("id, business_name, category, is_verified, logo_url")
          .eq("id", (prod as any).business_id)
          .single();
        setBusiness(biz);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      toast({ title: "Added to cart!", description: `${quantity}x ${product.name}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setAdding(false);
  };

  const catInfo = product ? PRODUCT_CATEGORIES.find((c) => c.value === product.category) : null;
  const inStock = product?.stock === null || product?.stock === undefined || product?.stock > 0;
  const maxQty = product?.stock ?? 99;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <span className="text-4xl mb-2">📦</span>
          <p className="text-sm font-semibold">Product not found</p>
          <button onClick={() => navigate("/marketplace")} className="text-xs text-primary mt-2 font-bold">
            Back to Pet Vault
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-32">
        {/* Header */}
        <div className="relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-72 w-full object-cover" />
          ) : (
            <div className="h-72 w-full bg-secondary flex items-center justify-center text-6xl">
              {catInfo?.icon || "📦"}
            </div>
          )}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 rounded-full bg-background/80 backdrop-blur-sm p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Price & name */}
          <div>
            <p className="text-2xl font-extrabold text-primary">{product.price} MKD</p>
            <h1 className="font-display text-xl font-extrabold mt-1">{product.name}</h1>
            {product.stock !== null && product.stock !== undefined && (
              <p className={`text-xs mt-1 ${inStock ? "text-muted-foreground" : "text-destructive font-bold"}`}>
                {inStock ? `${product.stock} in stock` : "Out of stock"}
              </p>
            )}
          </div>

          {/* Store info */}
          {business && (
            <button
              onClick={() => navigate(`/store/${business.id}`)}
              className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 w-full text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{business.business_name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{business.category?.replace("_", " ")}</p>
              </div>
            </button>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-bold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
          )}

          {/* Quantity selector */}
          {inStock && (
            <div>
              <h3 className="text-sm font-bold mb-2">Quantity</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-display text-lg font-bold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground ml-2">
                  Total: <span className="font-bold text-foreground">{(product.price * quantity).toLocaleString()} MKD</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom add to cart */}
        {inStock && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40">
            <div className="mx-auto max-w-lg">
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="w-full flex items-center justify-center gap-2 rounded-2xl petkeep-gradient text-primary-foreground py-4 text-sm font-bold disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {adding ? "Adding..." : `Add to Cart · ${(product.price * quantity).toLocaleString()} MKD`}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProductDetailPage;

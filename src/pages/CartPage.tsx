import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import ProductImage from "@/components/marketplace/ProductImage";

const CartPage = () => {
  const navigate = useNavigate();
  const { items, loading, updateQuantity, removeItem, totalPrice, itemCount } = useCart();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-44">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold flex-1">Cart ({itemCount})</h1>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <span className="text-5xl mb-3">🛒</span>
            <p className="text-sm font-semibold">Your cart is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Browse Pet Vault to find products</p>
            <button
              onClick={() => navigate("/marketplace")}
              className="mt-4 rounded-xl petkeep-gradient text-primary-foreground px-6 py-2.5 text-xs font-bold"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl bg-card border border-border p-3 flex gap-3">
                <ProductImage
                  src={item.product?.image_url}
                  alt={item.product?.name || "Product"}
                  category={(item.product as any)?.category}
                  size="md"
                  aspectRatio="square"
                  className="rounded-xl shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{item.product?.name || "Product"}</h4>
                  <p className="text-[10px] text-muted-foreground">{item.product?.business?.business_name}</p>
                  <p className="text-sm font-bold text-primary mt-1">{item.product?.price} MKD</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {((item.product?.price || 0) * item.quantity).toLocaleString()} MKD
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fixed bottom checkout */}
        {items.length > 0 && (
          <div className="fixed left-0 right-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-sm border-t border-border p-4 z-[60]">
            <div className="mx-auto max-w-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total ({itemCount} items)</span>
                <span className="font-display text-lg font-extrabold">{totalPrice.toLocaleString()} MKD</span>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl petkeep-gradient text-primary-foreground py-4 text-sm font-bold"
              >
                <ShoppingBag className="h-4 w-4" /> Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CartPage;

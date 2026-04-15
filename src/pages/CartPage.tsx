import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Store } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import ProductImage from "@/components/marketplace/ProductImage";
import BusinessConflictModal from "@/components/marketplace/BusinessConflictModal";

const CartPage = () => {
  const navigate = useNavigate();
  const {
    items, loading, updateQuantity, removeItem, clearCart,
    totalPrice, itemCount, cartBusinessName,
    businessConflict, resolveConflict,
  } = useCart();

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
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-destructive font-semibold hover:underline">
              Clear All
            </button>
          )}
        </div>

        {/* Business indicator */}
        {cartBusinessName && items.length > 0 && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
            <Store className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Ordering from</span>
            <span className="text-xs font-bold truncate">{cartBusinessName}</span>
          </div>
        )}

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
            {items.map((item) => {
              const stock = item.product?.stock;
              const isOutOfStock = stock !== null && stock !== undefined && stock <= 0;
              const isLowStock = stock !== null && stock !== undefined && stock > 0 && stock <= 5;
              const maxQty = stock ?? 99;

              return (
                <div key={item.id} className={`rounded-2xl bg-card border border-border p-3 flex gap-3 ${isOutOfStock ? "opacity-60" : ""}`}>
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
                    {isOutOfStock && (
                      <p className="text-[10px] font-bold text-destructive mt-0.5">Out of stock — remove to checkout</p>
                    )}
                    {isLowStock && (
                      <p className="text-[10px] font-bold text-amber-600 mt-0.5">Only {stock} left</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, Math.min(item.quantity + 1, maxQty))}
                        disabled={isOutOfStock || item.quantity >= maxQty}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary disabled:opacity-40"
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
              );
            })}
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
              {(() => {
                const hasOutOfStock = items.some((i) => i.product?.stock !== null && i.product?.stock !== undefined && (i.product?.stock ?? 0) <= 0);
                const hasMultipleBusinesses = new Set(items.map((i) => i.product?.business_id).filter(Boolean)).size > 1;
                const blocked = hasOutOfStock || hasMultipleBusinesses;
                return (
                  <button
                    onClick={() => navigate("/checkout")}
                    disabled={blocked}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl petkeep-gradient text-primary-foreground py-4 text-sm font-bold disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {hasOutOfStock ? "Remove out-of-stock items first" : hasMultipleBusinesses ? "Cart has items from multiple stores" : "Proceed to Checkout"}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <BusinessConflictModal conflict={businessConflict} onResolve={resolveConflict} />
    </AppLayout>
  );
};

export default CartPage;

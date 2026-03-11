import { useState } from "react";
import { Package, AlertTriangle, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductImage from "@/components/marketplace/ProductImage";
import type { Product } from "@/hooks/useBusiness";

interface Props {
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
}

const DashboardInventoryTab = ({ products, onUpdateProduct }: Props) => {
  const [restockAmounts, setRestockAmounts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleRestock = async (productId: string, currentStock: number | null) => {
    const amount = parseInt(restockAmounts[productId] || "0");
    if (amount <= 0) return;
    setSavingId(productId);
    await onUpdateProduct(productId, { stock: (currentStock || 0) + amount } as any);
    setRestockAmounts((prev) => ({ ...prev, [productId]: "" }));
    setSavingId(null);
  };

  const sorted = [...products].sort((a, b) => {
    const sa = a.stock ?? 999;
    const sb = b.stock ?? 999;
    return sa - sb;
  });

  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const lowStock = products.filter((p) => p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5);
  const outOfStock = products.filter((p) => p.stock !== null && p.stock !== undefined && p.stock <= 0);
  const tracked = products.filter((p) => p.stock !== null && p.stock !== undefined);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="font-display text-xl font-extrabold">{totalStock}</p>
          <p className="text-[10px] text-muted-foreground">Total Units</p>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
          <p className="font-display text-xl font-extrabold text-amber-600">{lowStock.length}</p>
          <p className="text-[10px] text-muted-foreground">Low Stock</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-3 text-center">
          <p className="font-display text-xl font-extrabold text-destructive">{outOfStock.length}</p>
          <p className="text-[10px] text-muted-foreground">Out of Stock</p>
        </div>
      </div>

      {/* Product inventory list */}
      {sorted.map((p) => {
        const isLow = p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5;
        const isOut = p.stock !== null && p.stock !== undefined && p.stock <= 0;
        const untracked = p.stock === null || p.stock === undefined;

        return (
          <div key={p.id} className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-center gap-3">
              <ProductImage src={p.image_url} alt={p.name} category={p.category} size="sm" className="rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.price} MKD</p>
              </div>
              <div className="text-right shrink-0">
                {untracked ? (
                  <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">∞ Unlimited</span>
                ) : isOut ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-2.5 w-2.5" /> Out of stock
                  </span>
                ) : isLow ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-2.5 w-2.5" /> {p.stock} left
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {p.stock} in stock
                  </span>
                )}
              </div>
            </div>

            {/* Restock controls */}
            {!untracked && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={restockAmounts[p.id] || ""}
                  onChange={(e) => setRestockAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="h-7 text-xs w-20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] font-bold"
                  disabled={savingId === p.id || !restockAmounts[p.id]}
                  onClick={() => handleRestock(p.id, p.stock)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {savingId === p.id ? "..." : "Restock"}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {products.length === 0 && (
        <div className="text-center py-8">
          <span className="text-3xl">📦</span>
          <p className="text-sm font-semibold mt-2">No products</p>
          <p className="text-xs text-muted-foreground">Add products to track inventory</p>
        </div>
      )}
    </div>
  );
};

export default DashboardInventoryTab;

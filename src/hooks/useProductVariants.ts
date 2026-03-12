import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const fromTable = (table: string) => (supabase as any).from(table);

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_label: string;
  variant_value: string;
  price_modifier: number;
  stock: number | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
}

export function useProductVariants(productId: string | null) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!productId) { setVariants([]); setLoading(false); return; }
    const { data } = await fromTable("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("display_order");
    setVariants((data || []) as ProductVariant[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveVariants = async (productId: string, variantsList: Array<{
    variant_label: string; variant_value: string; price_modifier: number;
    stock?: number | null; image_url?: string | null;
  }>) => {
    // Delete old, insert new
    await fromTable("product_variants").delete().eq("product_id", productId);
    if (variantsList.length > 0) {
      const rows = variantsList.map((v, i) => ({
        product_id: productId,
        variant_label: v.variant_label,
        variant_value: v.variant_value,
        price_modifier: v.price_modifier,
        stock: v.stock ?? null,
        image_url: v.image_url ?? null,
        display_order: i,
      }));
      const { error } = await fromTable("product_variants").insert(rows);
      if (error) throw error;
    }
    await refresh();
  };

  return { variants, loading, saveVariants, refresh };
}

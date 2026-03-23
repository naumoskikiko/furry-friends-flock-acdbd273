import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock: number | null;
    business_id: string;
    business?: { id: string; business_name: string };
  };
}

export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await fromTable("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const cartItems = (data || []) as CartItem[];

    // Fetch product details
    if (cartItems.length > 0) {
      const productIds = cartItems.map((i) => i.product_id);
      const { data: products } = await fromTable("products")
        .select("id, name, price, image_url, stock, business_id")
        .in("id", productIds);

      if (products) {
        const bizIds = [...new Set((products as any[]).map((p) => p.business_id))];
        const { data: businesses } = await fromTable("business_profiles")
          .select("id, business_name")
          .in("id", bizIds);

        const bizMap = Object.fromEntries((businesses || []).map((b: any) => [b.id, b]));
        const prodMap = Object.fromEntries(
          (products as any[]).map((p) => [p.id, { ...p, business: bizMap[p.business_id] }])
        );

        cartItems.forEach((item) => {
          item.product = prodMap[item.product_id];
        });
      }
    }

    setItems(cartItems);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    if (!user) return;

    // Check stock before adding
    const { data: prod } = await fromTable("products").select("stock").eq("id", productId).single();
    if (prod) {
      const stock = (prod as any).stock;
      if (stock !== null && stock !== undefined) {
        const existing = items.find((i) => i.product_id === productId);
        const currentInCart = existing ? existing.quantity : 0;
        if (currentInCart + quantity > stock) {
          throw new Error(stock <= 0 ? "This product is out of stock" : `Only ${stock} available (${currentInCart} already in cart)`);
        }
      }
    }

    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      await fromTable("cart_items")
        .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await fromTable("cart_items")
        .insert({ user_id: user.id, product_id: productId, quantity });
    }
    await refresh();
  }, [user, items, refresh]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await fromTable("cart_items").delete().eq("id", itemId);
    } else {
      await fromTable("cart_items")
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq("id", itemId);
    }
    await refresh();
  }, [refresh]);

  const removeItem = useCallback(async (itemId: string) => {
    await fromTable("cart_items").delete().eq("id", itemId);
    await refresh();
  }, [refresh]);

  const clearCart = useCallback(async () => {
    if (!user) return;
    await fromTable("cart_items").delete().eq("user_id", user.id);
    await refresh();
  }, [user, refresh]);

  const totalPrice = items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, loading, addToCart, updateQuantity, removeItem, clearCart, totalPrice, itemCount, refresh };
}

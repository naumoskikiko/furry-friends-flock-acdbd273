import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

const PLATFORM_FEE_RATE = 0.10;

export interface Order {
  id: string;
  buyer_id: string;
  total_price: number;
  platform_fee: number;
  status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  price: number;
  platform_fee: number;
  store_earnings: number;
  created_at: string;
  product?: { name: string; image_url: string | null };
  store?: { business_name: string };
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function useCreateOrder() {
  const { user } = useAuth();

  const createOrder = useCallback(async (
    cartItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      business_id: string;
    }>,
    shipping: ShippingInfo
  ) => {
    if (!user) throw new Error("Not authenticated");

    const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const platformFee = Math.round(totalPrice * PLATFORM_FEE_RATE * 100) / 100;

    // Create order
    const { data: order, error: orderError } = await fromTable("orders")
      .insert({
        buyer_id: user.id,
        total_price: totalPrice,
        platform_fee: platformFee,
        status: "paid",
        shipping_name: shipping.name,
        shipping_phone: shipping.phone,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
        shipping_postal_code: shipping.postalCode,
        shipping_country: shipping.country,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = cartItems.map((item) => {
      const itemTotal = item.price * item.quantity;
      const itemFee = Math.round(itemTotal * PLATFORM_FEE_RATE * 100) / 100;
      return {
        order_id: (order as any).id,
        product_id: item.product_id,
        store_id: item.business_id,
        quantity: item.quantity,
        price: item.price,
        platform_fee: itemFee,
        store_earnings: itemTotal - itemFee,
      };
    });

    const { error: itemsError } = await fromTable("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    // Reduce stock for each product atomically
    for (const item of cartItems) {
      const { data: success, error: stockErr } = await supabase.rpc("reduce_product_stock" as any, {
        _product_id: item.product_id,
        _quantity: item.quantity,
      });
      if (stockErr) throw new Error(`Stock update failed for product: ${stockErr.message}`);
      if (success === false) throw new Error(`Insufficient stock for one of your items. Please review your cart.`);
    }

    // Clear cart
    await fromTable("cart_items").delete().eq("user_id", user.id);

    return (order as any).id as string;
  }, [user]);

  return { createOrder };
}

export function useMyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await fromTable("orders")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    const orderList = (data || []) as Order[];

    // Fetch items for each order
    if (orderList.length > 0) {
      const orderIds = orderList.map((o) => o.id);
      const { data: items } = await fromTable("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (items) {
        const productIds = [...new Set((items as any[]).map((i) => i.product_id))];
        const storeIds = [...new Set((items as any[]).map((i) => i.store_id))];

        const [prodRes, storeRes] = await Promise.all([
          fromTable("products").select("id, name, image_url").in("id", productIds),
          fromTable("business_profiles").select("id, business_name").in("id", storeIds),
        ]);

        const prodMap = Object.fromEntries((prodRes.data || []).map((p: any) => [p.id, p]));
        const storeMap = Object.fromEntries((storeRes.data || []).map((s: any) => [s.id, s]));

        (items as any[]).forEach((item) => {
          item.product = prodMap[item.product_id];
          item.store = storeMap[item.store_id];
        });

        orderList.forEach((order) => {
          order.items = (items as OrderItem[]).filter((i) => i.order_id === order.id);
        });
      }
    }

    setOrders(orderList);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { orders, loading, refresh };
}

export function useStoreOrders(businessId: string | null) {
  const [orders, setOrders] = useState<(OrderItem & { order?: Order })[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) { setOrders([]); setLoading(false); return; }

    const { data: items } = await fromTable("order_items")
      .select("*")
      .eq("store_id", businessId)
      .order("created_at", { ascending: false });

    if (!items || (items as any[]).length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = [...new Set((items as any[]).map((i: any) => i.order_id))];
    const productIds = [...new Set((items as any[]).map((i: any) => i.product_id))];

    const [orderRes, prodRes] = await Promise.all([
      fromTable("orders").select("*").in("id", orderIds),
      fromTable("products").select("id, name, image_url").in("id", productIds),
    ]);

    const orderMap = Object.fromEntries((orderRes.data || []).map((o: any) => [o.id, o]));
    const prodMap = Object.fromEntries((prodRes.data || []).map((p: any) => [p.id, p]));

    const enriched = (items as any[]).map((item: any) => ({
      ...item,
      order: orderMap[item.order_id],
      product: prodMap[item.product_id],
    }));

    setOrders(enriched);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    await fromTable("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    await refresh();
  }, [refresh]);

  return { orders, loading, refresh, updateOrderStatus };
}

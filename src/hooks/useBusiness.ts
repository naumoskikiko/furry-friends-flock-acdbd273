import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  logo_url: string | null;
  description: string;
  location: string;
  website: string;
  phone: string;
  category: string;
  avg_rating: number;
  total_reviews: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string; avatar_url: string | null; username: string | null };
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
  is_active: boolean;
  stock: number | null;
  created_at: string;
  updated_at: string;
  business?: BusinessProfile;
}

export const BUSINESS_CATEGORIES = [
  { value: "pet_shop", label: "Pet Shop", icon: "🏪" },
  { value: "vet_clinic", label: "Vet Clinic", icon: "🏥" },
  { value: "grooming_salon", label: "Grooming Salon", icon: "✂️" },
  { value: "pet_brand", label: "Pet Brand", icon: "🏷️" },
  { value: "pet_food", label: "Pet Food", icon: "🍖" },
  { value: "pet_pharmacy", label: "Pet Pharmacy", icon: "💊" },
];

export const PRODUCT_CATEGORIES = [
  { value: "food", label: "Food", icon: "🍖" },
  { value: "accessories", label: "Accessories", icon: "🎀" },
  { value: "toys", label: "Toys", icon: "🧸" },
  { value: "health", label: "Health", icon: "💊" },
  { value: "grooming", label: "Grooming", icon: "🧴" },
  { value: "clothing", label: "Clothing", icon: "👕" },
  { value: "general", label: "General", icon: "📦" },
];

// Helper to query tables not yet in generated types
const fromTable = (table: string) => supabase.from(table as any);

export function useMyBusiness() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBusiness(null); setLoading(false); return; }
    const { data } = await fromTable("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setBusiness(data as unknown as BusinessProfile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const createBusiness = async (fields: { business_name: string; category: string; description?: string; location?: string; website?: string; phone?: string }) => {
    if (!user) return null;
    const { data, error } = await fromTable("business_profiles")
      .insert({ user_id: user.id, ...fields } as any)
      .select()
      .single();
    if (error) throw error;
    const biz = data as unknown as BusinessProfile;
    setBusiness(biz);
    return biz;
  };

  const updateBusiness = async (updates: Partial<BusinessProfile>) => {
    if (!business) return;
    const { error } = await fromTable("business_profiles")
      .update(updates as any)
      .eq("id", business.id);
    if (error) throw error;
    await refresh();
  };

  return { business, loading, createBusiness, updateBusiness, refresh };
}

export function useBusinessProducts(businessId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) { setProducts([]); setLoading(false); return; }
    const { data } = await fromTable("products")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setProducts((data as unknown as Product[]) || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addProduct = async (fields: { name: string; description?: string; price: number; category: string; image_url?: string }) => {
    if (!businessId) return;
    const { error } = await fromTable("products")
      .insert({ business_id: businessId, ...fields } as any);
    if (error) throw error;
    await refresh();
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await fromTable("products")
      .update(updates as any)
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await fromTable("products")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { products, loading, addProduct, updateProduct, deleteProduct, refresh };
}

export function useAllBusinesses(category?: string, search?: string) {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = fromTable("business_profiles").select("*").eq("is_suspended", false).order("avg_rating", { ascending: false });
      if (category && category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("business_name", `%${search}%`);
      const { data } = await query;
      setBusinesses((data as unknown as BusinessProfile[]) || []);
      setLoading(false);
    };
    fetch();
  }, [category, search]);

  return { businesses, loading };
}

export function useAllProducts(category?: string, search?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = fromTable("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (category && category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("name", `%${search}%`);
      const { data } = await query;
      setProducts((data as unknown as Product[]) || []);
      setLoading(false);
    };
    fetch();
  }, [category, search]);

  return { products, loading };
}

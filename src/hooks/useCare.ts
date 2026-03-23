import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateConversation } from "@/hooks/useMessages";

const fromTable = (table: string) => (supabase as any).from(table);

export interface CareProvider {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  category: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  website: string;
  photo_url: string | null;
  is_verified: boolean;
  avg_rating: number;
  total_reviews: number;
  total_bookings: number;
  opening_hours: any;
  created_at: string;
  emergency_available: boolean;
  cancellation_hours: number;
  cancellation_policy: string;
  response_time_minutes: number | null;
  profile?: { full_name: string; username: string | null; avatar_url: string | null };
}

export interface CareService {
  id: string;
  provider_id: string;
  service_name: string;
  description: string;
  price: number;
  duration: number;
  is_active: boolean;
}

export interface CareBooking {
  id: string;
  user_id: string;
  provider_id: string;
  service_id: string;
  pet_id: string | null;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string;
  conversation_id: string | null;
  created_at: string;
  service?: CareService;
  provider?: CareProvider;
  pet?: { id: string; name: string; animal_type: string; breed: string | null; photo_url: string | null };
  user_profile?: { full_name: string; username: string | null; avatar_url: string | null };
}

export interface CareReview {
  id: string;
  user_id: string;
  provider_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profile?: { full_name: string; username: string | null; avatar_url: string | null };
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface GalleryImage {
  id: string;
  provider_id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "sitter", label: "Pet Sitters", icon: "🐾" },
  { value: "walker", label: "Pet Walker", icon: "🚶" },
  { value: "vet-clinic", label: "Vet Clinic", icon: "🏥" },
  { value: "grooming-salon", label: "Grooming Salon", icon: "✂️" },
  { value: "trainer", label: "Trainer", icon: "🎓" },
  { value: "shelter", label: "Shelter", icon: "🏠" },
];

export { CATEGORIES };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export { DAY_NAMES };

// Helper: check if provider is currently open based on availability
export function isProviderOpen(availability: ProviderAvailability[]): "open" | "closed" {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dayAvail = availability.find((a) => a.day_of_week === dayOfWeek && a.is_available);
  if (!dayAvail) return "closed";
  if (currentTime >= dayAvail.start_time.slice(0, 5) && currentTime <= dayAvail.end_time.slice(0, 5)) return "open";
  return "closed";
}

// --- Browse providers ---
export function useCareProviders(category?: string, searchQuery?: string, emergencyOnly?: boolean) {
  const [providers, setProviders] = useState<CareProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    let query = fromTable("care_providers")
      .select("*")
      .eq("is_suspended", false)
      .eq("is_banned", false)
      .order("avg_rating", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (searchQuery && searchQuery.trim()) {
      query = query.ilike("business_name", `%${searchQuery.trim()}%`);
    }
    if (emergencyOnly) {
      query = query.eq("emergency_available", true);
    }

    const { data } = await query;
    const providerList = (data || []) as CareProvider[];

    // Fetch profiles for providers
    if (providerList.length > 0) {
      const userIds = [...new Set(providerList.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      providerList.forEach((p) => {
        p.profile = profileMap.get(p.user_id) as any;
      });
    }

    setProviders(providerList);
    setLoading(false);
  }, [category, searchQuery, emergencyOnly]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, refresh: fetchProviders };
}

// --- Provider services ---
export function useProviderServices(providerId: string | null) {
  const [services, setServices] = useState<CareService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) { setServices([]); setLoading(false); return; }
    const fetch = async () => {
      const { data } = await fromTable("care_services")
        .select("*")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("price", { ascending: true });
      setServices((data || []) as CareService[]);
      setLoading(false);
    };
    fetch();
  }, [providerId]);

  return { services, loading };
}

// --- Provider reviews ---
export function useProviderReviews(providerId: string | null) {
  const [reviews, setReviews] = useState<CareReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    if (!providerId) { setReviews([]); setLoading(false); return; }
    const { data } = await fromTable("care_reviews")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    const reviewList = (data || []) as CareReview[];
    if (reviewList.length > 0) {
      const userIds = [...new Set(reviewList.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      reviewList.forEach((r) => { r.profile = profileMap.get(r.user_id) as any; });
    }

    setReviews(reviewList);
    setLoading(false);
  }, [providerId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  return { reviews, loading, refresh: fetchReviews };
}

// --- Provider availability ---
export function useProviderAvailability(providerId: string | null) {
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);

  useEffect(() => {
    if (!providerId) return;
    const fetch = async () => {
      const { data } = await fromTable("provider_availability")
        .select("*")
        .eq("provider_id", providerId)
        .order("day_of_week", { ascending: true });
      setAvailability((data || []) as ProviderAvailability[]);
    };
    fetch();
  }, [providerId]);

  return availability;
}

// --- Provider gallery ---
export function useProviderGallery(providerId: string | null) {
  const [images, setImages] = useState<GalleryImage[]>([]);

  const fetchGallery = useCallback(async () => {
    if (!providerId) { setImages([]); return; }
    const { data } = await fromTable("provider_gallery")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    setImages((data || []) as GalleryImage[]);
  }, [providerId]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const addImage = useCallback(async (imageUrl: string, caption?: string) => {
    if (!providerId) return;
    await fromTable("provider_gallery").insert({ provider_id: providerId, image_url: imageUrl, caption: caption || "" });
    fetchGallery();
  }, [providerId, fetchGallery]);

  const removeImage = useCallback(async (imageId: string) => {
    await fromTable("provider_gallery").delete().eq("id", imageId);
    fetchGallery();
  }, [fetchGallery]);

  return { images, addImage, removeImage, refresh: fetchGallery };
}

// --- Create booking ---
export function useBooking() {
  const { user } = useAuth();

  const createBooking = useCallback(
    async (providerId: string, serviceId: string, date: string, time: string, notes?: string, petId?: string) => {
      if (!user) return null;

      // Check for double booking
      const { data: existing } = await fromTable("care_bookings")
        .select("id")
        .eq("provider_id", providerId)
        .eq("booking_date", date)
        .eq("booking_time", time)
        .in("status", ["pending", "confirmed"])
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("This time slot is already booked");
      }

      // Get provider user_id for conversation
      const { data: provider } = await fromTable("care_providers")
        .select("user_id, business_name")
        .eq("id", providerId)
        .single();

      let conversationId: string | null = null;
      if (provider) {
        try {
          conversationId = await getOrCreateConversation(provider.user_id);
        } catch (e) {
          console.error("Failed to create conversation", e);
        }
      }

      // Create booking
      const { data: booking, error } = await fromTable("care_bookings").insert({
        user_id: user.id,
        provider_id: providerId,
        service_id: serviceId,
        booking_date: date,
        booking_time: time,
        notes: notes || "",
        pet_id: petId || null,
        conversation_id: conversationId,
      }).select("*").single();

      if (error) throw error;

      // Send appointment message in conversation
      if (conversationId) {
        const { data: service } = await fromTable("care_services")
          .select("service_name")
          .eq("id", serviceId)
          .single();

        // Get pet info if provided
        let petInfo = null;
        if (petId) {
          const { data: pet } = await supabase.from("pets").select("name, animal_type, breed").eq("id", petId).single();
          petInfo = pet;
        }

        await fromTable("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_text: `Appointment booked: ${service?.service_name || "Service"}${petInfo ? ` for ${petInfo.name}` : ""}`,
          message_type: "appointment",
          metadata: {
            provider: provider?.business_name,
            date,
            time,
            service: service?.service_name,
            booking_id: booking?.id,
            pet: petInfo,
          },
        });
      }

      // Increment total_bookings
      await fromTable("care_providers")
        .update({ total_bookings: (provider as any)?.total_bookings + 1 || 1 })
        .eq("id", providerId);

      return booking;
    },
    [user]
  );

  return { createBooking };
}

// --- User's bookings ---
export function useMyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CareBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    const { data } = await fromTable("care_bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const bookingList = (data || []) as CareBooking[];

    // Enrich with provider + service + pet data
    if (bookingList.length > 0) {
      const providerIds = [...new Set(bookingList.map((b) => b.provider_id))];
      const serviceIds = [...new Set(bookingList.map((b) => b.service_id))];
      const petIds = [...new Set(bookingList.map((b) => b.pet_id).filter(Boolean))] as string[];

      const promises: Promise<any>[] = [
        fromTable("care_providers").select("id, business_name, category, photo_url, user_id").in("id", providerIds),
        fromTable("care_services").select("id, service_name, price, duration").in("id", serviceIds),
      ];
      if (petIds.length > 0) {
        promises.push(fromTable("pets").select("id, name, animal_type, breed, photo_url").in("id", petIds));
      }

      const results = await Promise.all(promises);
      const provMap = new Map((results[0].data || []).map((p: any) => [p.id, p]));
      const svcMap = new Map((results[1].data || []).map((s: any) => [s.id, s]));
      const petMap = petIds.length > 0 ? new Map((results[2]?.data || []).map((p: any) => [p.id, p])) : new Map();

      bookingList.forEach((b) => {
        b.provider = provMap.get(b.provider_id) as any;
        b.service = svcMap.get(b.service_id) as any;
        if (b.pet_id) b.pet = petMap.get(b.pet_id) as any;
      });
    }

    setBookings(bookingList);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    await fromTable("care_bookings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", bookingId);
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, refresh: fetchBookings, cancelBooking };
}

// --- Provider's bookings (for dashboard) ---
export function useProviderBookings(providerId: string | null) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CareBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!providerId || !user) return;
    const { data } = await fromTable("care_bookings")
      .select("*")
      .eq("provider_id", providerId)
      .order("booking_date", { ascending: true });

    const bookingList = (data || []) as CareBooking[];

    // Enrich with user profiles + services + pets
    if (bookingList.length > 0) {
      const userIds = [...new Set(bookingList.map((b) => b.user_id))];
      const serviceIds = [...new Set(bookingList.map((b) => b.service_id))];
      const petIds = [...new Set(bookingList.map((b) => b.pet_id).filter(Boolean))] as string[];

      const promises: Promise<any>[] = [
        supabase.from("profiles").select("user_id, full_name, username, avatar_url").in("user_id", userIds),
        fromTable("care_services").select("id, service_name, price, duration").in("id", serviceIds),
      ];
      if (petIds.length > 0) {
        promises.push(fromTable("pets").select("id, name, animal_type, breed, photo_url").in("id", petIds));
      }

      const results = await Promise.all(promises);
      const profMap = new Map((results[0].data || []).map((p: any) => [p.user_id, p]));
      const svcMap = new Map((results[1].data || []).map((s: any) => [s.id, s]));
      const petMap = petIds.length > 0 ? new Map((results[2]?.data || []).map((p: any) => [p.id, p])) : new Map();

      bookingList.forEach((b) => {
        b.user_profile = profMap.get(b.user_id) as any;
        b.service = svcMap.get(b.service_id) as any;
        if (b.pet_id) b.pet = petMap.get(b.pet_id) as any;
      });
    }

    setBookings(bookingList);
    setLoading(false);
  }, [providerId, user]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateBookingStatus = useCallback(async (bookingId: string, status: string) => {
    await fromTable("care_bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", bookingId);
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, refresh: fetchBookings, updateBookingStatus };
}

// --- My provider profile ---
export function useMyProvider() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<CareProvider | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProvider = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await fromTable("care_providers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProvider(data as CareProvider | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProvider(); }, [fetchProvider]);

  const createProvider = useCallback(async (providerData: Partial<CareProvider>) => {
    if (!user) return null;
    const { data, error } = await fromTable("care_providers").insert({
      ...providerData,
      user_id: user.id,
    }).select("*").single();
    if (error) throw error;
    setProvider(data as CareProvider);
    return data;
  }, [user]);

  const updateProvider = useCallback(async (updates: Partial<CareProvider>) => {
    if (!user || !provider) return;
    const { data } = await fromTable("care_providers")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", provider.id)
      .select("*")
      .single();
    setProvider(data as CareProvider);
  }, [user, provider]);

  // Services management
  const addService = useCallback(async (service: Partial<CareService>) => {
    if (!provider) return;
    await fromTable("care_services").insert({ ...service, provider_id: provider.id });
  }, [provider]);

  const updateService = useCallback(async (serviceId: string, updates: Partial<CareService>) => {
    await fromTable("care_services").update(updates).eq("id", serviceId);
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    await fromTable("care_services").delete().eq("id", serviceId);
  }, []);

  // Availability management
  const setAvailability = useCallback(async (dayOfWeek: number, startTime: string, endTime: string, isAvailable: boolean) => {
    if (!provider) return;
    await fromTable("provider_availability").upsert({
      provider_id: provider.id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
    }, { onConflict: "provider_id,day_of_week" });
  }, [provider]);

  return {
    provider, loading, refresh: fetchProvider,
    createProvider, updateProvider,
    addService, updateService, deleteService,
    setAvailability,
  };
}

// --- Submit review ---
export function useSubmitReview() {
  const { user } = useAuth();

  const submitReview = useCallback(async (providerId: string, rating: number, comment: string, bookingId?: string) => {
    if (!user) return false;
    const { error } = await fromTable("care_reviews").insert({
      user_id: user.id,
      provider_id: providerId,
      booking_id: bookingId || null,
      rating,
      comment,
    });
    return !error;
  }, [user]);

  return { submitReview };
}

// --- Generate time slots ---
export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += durationMinutes;
  }

  return slots;
}

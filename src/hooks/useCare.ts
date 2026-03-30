import { useState, useEffect, useCallback, useRef } from "react";
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

export interface BlockedSlot {
  id: string;
  provider_id: string;
  blocked_date: string;
  blocked_time: string | null;
  block_type: string;
  reason: string;
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

// Booking type determined by service category
export type BookingType = "date_range" | "time_slot" | "appointment" | "date_range_with_time";

export const CATEGORY_BOOKING_TYPE: Record<string, BookingType> = {
  sitter: "date_range",
  walker: "time_slot",
  "grooming-salon": "appointment",
  "vet-clinic": "appointment",
  trainer: "appointment",
  shelter: "date_range_with_time",
};

export function getBookingTypeForCategory(category: string): BookingType {
  return CATEGORY_BOOKING_TYPE[category] || "appointment";
}

export function getBookingTypeLabel(bookingType: BookingType): string {
  switch (bookingType) {
    case "date_range": return "Date Range (Start → End)";
    case "time_slot": return "Time Slot Picker";
    case "appointment": return "Appointment Slots";
    case "date_range_with_time": return "Date Range + Time";
    default: return "Appointment";
  }
}

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
      .eq("is_verified", true)
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
    const category = providerData.category || "vet-clinic";
    const bookingMode = getBookingTypeForCategory(category);
    const { data, error } = await fromTable("care_providers").insert({
      ...providerData,
      user_id: user.id,
      booking_mode: bookingMode,
    }).select("*").single();
    if (error) throw error;
    setProvider(data as CareProvider);
    return data;
  }, [user]);

  const updateProvider = useCallback(async (updates: Partial<CareProvider>) => {
    if (!user || !provider) return;
    // Auto-update booking_mode when category changes
    const finalUpdates: any = { ...updates, updated_at: new Date().toISOString() };
    if (updates.category) {
      finalUpdates.booking_mode = getBookingTypeForCategory(updates.category);
    }
    const { data } = await fromTable("care_providers")
      .update(finalUpdates)
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

// --- Blocked slots management ---
export function useProviderBlockedSlots(providerId: string | null) {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const fetchBlocked = useCallback(async () => {
    if (!providerId) { setBlockedSlots([]); return; }
    const { data } = await fromTable("provider_blocked_slots")
      .select("*")
      .eq("provider_id", providerId)
      .order("blocked_date", { ascending: true });
    setBlockedSlots((data || []) as BlockedSlot[]);
  }, [providerId]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const addBlock = useCallback(async (date: string, time?: string, reason?: string) => {
    if (!providerId) return;
    await fromTable("provider_blocked_slots").insert({
      provider_id: providerId,
      blocked_date: date,
      blocked_time: time || null,
      block_type: time ? "time_slot" : "full_day",
      reason: reason || "",
    });
    fetchBlocked();
  }, [providerId, fetchBlocked]);

  const removeBlock = useCallback(async (blockId: string) => {
    await fromTable("provider_blocked_slots").delete().eq("id", blockId);
    fetchBlocked();
  }, [fetchBlocked]);

  return { blockedSlots, addBlock, removeBlock, refresh: fetchBlocked };
}

// --- Fetch existing bookings for a provider (for availability checking) ---
export function useProviderBookedSlots(providerId: string | null) {
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [bookedTimeSlots, setBookedTimeSlots] = useState<Map<string, Set<string>>>(new Map());

  const fetchBooked = useCallback(async () => {
    if (!providerId) return;
    const { data } = await fromTable("care_bookings")
      .select("booking_date, booking_time, notes, status")
      .eq("provider_id", providerId)
      .in("status", ["pending", "confirmed"]);

    const dates = new Set<string>();
    const timeMap = new Map<string, Set<string>>();

    (data || []).forEach((b: any) => {
      const dateStr = b.booking_date;
      // For date_range bookings, block entire date
      dates.add(dateStr);
      
      // Also track booked time slots per date
      if (!timeMap.has(dateStr)) timeMap.set(dateStr, new Set());
      timeMap.get(dateStr)!.add(b.booking_time?.slice(0, 5) || "");

      // If notes contain checkout date, block the range
      if (b.notes && b.notes.includes("Check-out:")) {
        const match = b.notes.match(/Check-out:\s*(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const checkOut = new Date(match[1]);
          const checkIn = new Date(dateStr);
          let current = new Date(checkIn);
          while (current <= checkOut) {
            dates.add(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      }
    });

    setBookedDates(dates);
    setBookedTimeSlots(timeMap);
  }, [providerId]);

  useEffect(() => { fetchBooked(); }, [fetchBooked]);

  return { bookedDates, bookedTimeSlots, refresh: fetchBooked };
}

// --- Calculate nights between two dates ---
export function calculateNights(startDate: Date, endDate: Date): number {
  return Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
}

// --- Training packages ---
export interface TrainingPackage {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  total_sessions: number;
  price: number;
  session_duration: number;
  is_active: boolean;
  created_at: string;
}

export interface UserTrainingPackage {
  id: string;
  user_id: string;
  package_id: string;
  provider_id: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  purchased_at: string;
  expires_at: string | null;
  package?: TrainingPackage;
}

export function useTrainingPackages(providerId: string | null) {
  const [packages, setPackages] = useState<TrainingPackage[]>([]);

  const fetchPackages = useCallback(async () => {
    if (!providerId) { setPackages([]); return; }
    const { data } = await fromTable("training_packages")
      .select("*")
      .eq("provider_id", providerId)
      .eq("is_active", true)
      .order("price", { ascending: true });
    setPackages((data || []) as TrainingPackage[]);
  }, [providerId]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const addPackage = useCallback(async (pkg: Partial<TrainingPackage>) => {
    if (!providerId) return;
    await fromTable("training_packages").insert({ ...pkg, provider_id: providerId });
    fetchPackages();
  }, [providerId, fetchPackages]);

  const deletePackage = useCallback(async (pkgId: string) => {
    await fromTable("training_packages").update({ is_active: false }).eq("id", pkgId);
    fetchPackages();
  }, [fetchPackages]);

  return { packages, addPackage, deletePackage, refresh: fetchPackages };
}

export function useUserTrainingPackages(providerId: string | null) {
  const { user } = useAuth();
  const [userPackages, setUserPackages] = useState<UserTrainingPackage[]>([]);

  const fetchUserPackages = useCallback(async () => {
    if (!user || !providerId) { setUserPackages([]); return; }
    const { data } = await fromTable("user_training_packages")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider_id", providerId)
      .eq("status", "active");

    const pkgList = (data || []) as UserTrainingPackage[];
    
    // Enrich with package info
    if (pkgList.length > 0) {
      const pkgIds = [...new Set(pkgList.map(p => p.package_id))];
      const { data: pkgs } = await fromTable("training_packages").select("*").in("id", pkgIds);
      const pkgMap = new Map((pkgs || []).map((p: any) => [p.id, p]));
      pkgList.forEach(up => { up.package = pkgMap.get(up.package_id) as any; });
    }

    setUserPackages(pkgList);
  }, [user, providerId]);

  useEffect(() => { fetchUserPackages(); }, [fetchUserPackages]);

  const purchasePackage = useCallback(async (pkg: TrainingPackage) => {
    if (!user || !providerId) return null;
    const { data, error } = await fromTable("user_training_packages").insert({
      user_id: user.id,
      package_id: pkg.id,
      provider_id: providerId,
      total_sessions: pkg.total_sessions,
    }).select("*").single();
    if (error) throw error;
    fetchUserPackages();
    return data;
  }, [user, providerId, fetchUserPackages]);

  const useSession = useCallback(async (userPkgId: string) => {
    const pkg = userPackages.find(p => p.id === userPkgId);
    if (!pkg) return;
    const newUsed = pkg.used_sessions + 1;
    const updates: any = { used_sessions: newUsed };
    if (newUsed >= pkg.total_sessions) updates.status = "completed";
    await fromTable("user_training_packages").update(updates).eq("id", userPkgId);
    fetchUserPackages();
  }, [userPackages, fetchUserPackages]);

  return { userPackages, purchasePackage, useSession, refresh: fetchUserPackages };
}

// --- Adoption listings (shelters) ---
export interface AdoptionListing {
  id: string;
  provider_id: string;
  user_id: string;
  name: string;
  animal_type: string;
  breed: string;
  age: string;
  gender: string;
  description: string;
  location: string;
  status: string;
  created_at: string;
  updated_at: string;
  images?: AdoptionImage[];
  provider?: { business_name: string; photo_url: string | null; location: string; is_verified: boolean; user_id: string; phone: string | null; description: string | null };
}

export interface AdoptionImage {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
}

export function useAdoptionListings(filters?: { animal_type?: string; search?: string }) {
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let query = fromTable("adoption_listings")
      .select("*, provider:care_providers(business_name, photo_url, location, is_verified, user_id, phone, description)")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (filters?.animal_type && filters.animal_type !== "all") {
      query = query.eq("animal_type", filters.animal_type);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,breed.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data } = await query;
    const items = (data || []) as AdoptionListing[];

    // Only show listings from verified shelters
    const verified = items.filter(i => i.provider?.is_verified);

    // Fetch images
    if (verified.length > 0) {
      const ids = verified.map(l => l.id);
      const { data: imgs } = await fromTable("adoption_images").select("*").in("listing_id", ids).order("display_order");
      const imgMap = new Map<string, AdoptionImage[]>();
      (imgs || []).forEach((img: AdoptionImage) => {
        if (!imgMap.has(img.listing_id)) imgMap.set(img.listing_id, []);
        imgMap.get(img.listing_id)!.push(img);
      });
      verified.forEach(l => { l.images = imgMap.get(l.id) || []; });
    }

    setListings(verified);
    setLoading(false);
  }, [filters?.animal_type, filters?.search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  return { listings, loading, refresh: fetchListings };
}

export function useShelterListings(providerId: string | null) {
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const { user } = useAuth();

  const fetchListings = useCallback(async () => {
    if (!providerId) { setListings([]); return; }
    const { data } = await fromTable("adoption_listings")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    const items = (data || []) as AdoptionListing[];

    if (items.length > 0) {
      const ids = items.map(l => l.id);
      const { data: imgs } = await fromTable("adoption_images").select("*").in("listing_id", ids).order("display_order");
      const imgMap = new Map<string, AdoptionImage[]>();
      (imgs || []).forEach((img: AdoptionImage) => {
        if (!imgMap.has(img.listing_id)) imgMap.set(img.listing_id, []);
        imgMap.get(img.listing_id)!.push(img);
      });
      items.forEach(l => { l.images = imgMap.get(l.id) || []; });
    }

    setListings(items);
  }, [providerId]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const addListing = useCallback(async (listing: Partial<AdoptionListing>, imageUrls: string[]) => {
    if (!providerId || !user) return;
    const { data, error } = await fromTable("adoption_listings")
      .insert({ ...listing, provider_id: providerId, user_id: user.id })
      .select("*")
      .single();
    if (error) throw error;
    if (data && imageUrls.length > 0) {
      await fromTable("adoption_images").insert(
        imageUrls.map((url, i) => ({ listing_id: (data as any).id, image_url: url, display_order: i }))
      );
    }
    fetchListings();
    return data;
  }, [providerId, user, fetchListings]);

  const updateListing = useCallback(async (id: string, updates: Partial<AdoptionListing>) => {
    await fromTable("adoption_listings").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    fetchListings();
  }, [fetchListings]);

  const deleteListing = useCallback(async (id: string) => {
    await fromTable("adoption_listings").delete().eq("id", id);
    fetchListings();
  }, [fetchListings]);

  const addImage = useCallback(async (listingId: string, imageUrl: string, order: number = 0) => {
    await fromTable("adoption_images").insert({ listing_id: listingId, image_url: imageUrl, display_order: order });
    fetchListings();
  }, [fetchListings]);

  return { listings, addListing, updateListing, deleteListing, addImage, refresh: fetchListings };
}

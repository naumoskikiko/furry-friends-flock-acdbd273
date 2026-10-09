// Creates/refreshes fixed demo accounts for presentations. Idempotent.
// Only ever touches @demo.petkeepapp.com accounts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PASSWORD = "PetKeepDemo2026!";

type Demo = {
  key: string; name: string; username: string;
  profileRole: "user" | "provider" | "business";
  appRole?: "admin" | "moderator";
  care?: { category: string; business: string; desc: string };
  business?: { name: string; category: string; desc: string };
};

const DEMOS: Demo[] = [
  { key: "guest", name: "Demo Guest", username: "demo_guest", profileRole: "user" },
  { key: "user", name: "Ana Petrovska", username: "demo_user", profileRole: "user" },
  { key: "admin", name: "Demo Admin", username: "demo_admin", profileRole: "user", appRole: "admin" },
  { key: "sitter", name: "Marko Sitter", username: "demo_sitter", profileRole: "provider", care: { category: "sitter", business: "Marko's Pet Sitting", desc: "Overnight pet sitting in Skopje." } },
  { key: "walker", name: "Elena Walker", username: "demo_walker", profileRole: "provider", care: { category: "walker", business: "Elena Dog Walks", desc: "Daily dog walks around Vodno." } },
  { key: "vet", name: "Dr. Stojanov", username: "demo_vet", profileRole: "provider", care: { category: "vet-clinic", business: "VetCare Skopje", desc: "Full-service veterinary clinic." } },
  { key: "groomer", name: "Groom Studio", username: "demo_groomer", profileRole: "provider", care: { category: "grooming-salon", business: "Groom Studio", desc: "Grooming, bathing and styling." } },
  { key: "trainer", name: "Ivan Trainer", username: "demo_trainer", profileRole: "provider", care: { category: "trainer", business: "Good Dog Training", desc: "Obedience and puppy training packages." } },
  { key: "shelter", name: "Happy Paws Shelter", username: "demo_shelter", profileRole: "provider", care: { category: "shelter", business: "Happy Paws Shelter", desc: "Adopt a friend for life." } },
  { key: "business", name: "Pet Shop Demo", username: "demo_business", profileRole: "business", business: { name: "PetKeep Demo Store", category: "pet_shop", desc: "Food, toys and accessories." } },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: unknown[] = [];

  // map existing users by email
  const existing = new Map<string, string>();
  for (let page = 1; page < 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    data?.users.forEach((u) => u.email && existing.set(u.email, u.id));
    if (!data || data.users.length < 1000) break;
  }

  for (const d of DEMOS) {
    const email = `${d.key}@demo.petkeepapp.com`;
    try {
      let id = existing.get(email);
      if (!id) {
        const { data, error } = await admin.auth.admin.createUser({
          email, password: PASSWORD, email_confirm: true,
          user_metadata: { full_name: d.name, role: d.profileRole },
        });
        if (error) throw error;
        id = data.user!.id;
      } else {
        await admin.auth.admin.updateUserById(id, { password: PASSWORD, email_confirm: true });
      }

      await admin.from("profiles").update({
        full_name: d.name, username: d.username, role: d.profileRole, location: "Skopje",
        bio: "Demo account for PetKeep presentations.",
      }).eq("user_id", id);

      const { data: terms } = await admin.from("terms_acceptance").select("id").eq("user_id", id).eq("terms_version", "v1.0").limit(1);
      if (!terms?.length) await admin.from("terms_acceptance").insert({ user_id: id, terms_version: "v1.0" });

      if (d.appRole) await admin.from("user_roles").upsert({ user_id: id, role: d.appRole }, { onConflict: "user_id,role" });

      if (d.care) {
        const { data: cp } = await admin.from("care_providers").select("id").eq("user_id", id).limit(1);
        const row = { user_id: id, business_name: d.care.business, description: d.care.desc, category: d.care.category, location: "Skopje", latitude: 41.9981, longitude: 21.4254, phone: "+389 70 000 000", is_verified: true, is_suspended: false, is_banned: false };
        if (cp?.length) await admin.from("care_providers").update(row).eq("id", cp[0].id);
        else await admin.from("care_providers").insert(row);
      }
      if (d.business) {
        const { data: bp } = await admin.from("business_profiles").select("id").eq("user_id", id).limit(1);
        const row = { user_id: id, business_name: d.business.name, description: d.business.desc, category: d.business.category, location: "Skopje", phone: "+389 70 000 001", is_verified: true, is_suspended: false, pickup_available: true, delivery_available: true, delivery_fee: 100 };
        if (bp?.length) await admin.from("business_profiles").update(row).eq("id", bp[0].id);
        else await admin.from("business_profiles").insert(row);
      }
      results.push({ email, ok: true });
    } catch (e) {
      results.push({ email, ok: false, error: String((e as Error).message ?? e) });
    }
  }
  return new Response(JSON.stringify({ results }), { headers: { ...cors, "Content-Type": "application/json" } });
});

import { useState, useEffect, useCallback } from "react";
import {
  Heart, Plus, PawPrint, Shield, Upload, Trash2, Search, BadgeCheck,
  Star, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Flame,
  Eye, Flag, X, Syringe, Calendar, Dog, Pencil, CheckCircle2, Camera, FileText, MapPin, Loader2, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { calculateCompatibility, getBreederTrustScore, isSafeForBreeding } from "@/lib/petMatchAlgorithm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import AddPetFlow from "@/components/profile/AddPetFlow";
import PetProfileModal from "@/components/profile/PetProfileModal";

const fromTable = (table: string) => (supabase as any).from(table);

interface Pet {
  id: string;
  name: string;
  animal_type: string;
  breed: string | null;
  gender: string | null;
  age: string | null;
  photo_url: string | null;
  neutered: boolean | null;
  vaccinated: boolean | null;
  weight: string | null;
  temperament?: string | null;
  medical_notes?: string | null;
  special_care?: string | null;
  emergency_contact?: string | null;
  vet_info?: string | null;
  owner_id?: string;
  vaccination_verified?: boolean;
  neutered_verified?: boolean;
  is_verified?: boolean;
}

interface PetMatchListing {
  id: string;
  user_id: string;
  pet_id: string;
  status: string;
  looking_for: string;
  description: string;
  is_active: boolean;
  breed_document_url: string | null;
  breed_document_name: string | null;
  created_at: string;
  pet?: Pet;
  profile?: { full_name: string; avatar_url: string | null; username: string | null };
}

// ─── Compatibility Badge ────────────────────────────────────────────────────
const CompatibilityBadge = ({ score, label, color }: { score: number; label: string; color: string }) => {
  const bgColor = score >= 85 ? "bg-green-500" : score >= 70 ? "bg-green-400" : score >= 55 ? "bg-amber-400" : score >= 40 ? "bg-orange-400" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-9 w-9">
        <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted/30" />
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className={`${bgColor.replace("bg-", "stroke-")}`}
            strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">{score}%</span>
      </div>
      <span className={`text-[10px] font-bold ${color}`}>{label}</span>
    </div>
  );
};

// ─── Trust Score ─────────────────────────────────────────────────────────────
const TrustScoreBadge = ({ listing }: { listing: PetMatchListing }) => {
  const { score, badges } = getBreederTrustScore(listing);
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold">{score.toFixed(1)}</span>
      {badges.includes("Verified Breed") && <BadgeCheck className="h-3 w-3 text-accent" />}
      {badges.includes("Verified Owner") && <Shield className="h-3 w-3 text-primary" />}
    </div>
  );
};

// ─── Safety Indicators ──────────────────────────────────────────────────────
const SafetyIndicators = ({ pet }: { pet: Pet }) => {
  const safety = isSafeForBreeding({
    animal_type: pet.animal_type,
    breed: pet.breed,
    gender: pet.gender,
    age: pet.age,
    neutered: pet.neutered,
    vaccinated: pet.vaccinated,
    weight: pet.weight,
  });

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {pet.vaccinated === true && (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
          pet.vaccination_verified
            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
            : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
        }`}>
          <Syringe className="h-2.5 w-2.5" /> {pet.vaccination_verified ? "✅ Vaccinated" : "⏳ Vaccinated (Pending)"}
        </span>
      )}
      {pet.neutered === false && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-400">
          ✓ Fertile
        </span>
      )}
      {pet.neutered === true && pet.neutered_verified && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 dark:text-green-400">
          ✅ Neutered/Spayed
        </span>
      )}
      {!safety.safe && safety.warnings.map((w, i) => (
        <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-2.5 w-2.5" /> {w}
        </span>
      ))}
    </div>
  );
};

// ─── Full Pet Profile Modal ─────────────────────────────────────────────────
const PetProfileDetailModal = ({
  listing,
  open,
  onOpenChange,
  myPet,
  onMessageOwner,
}: {
  listing: PetMatchListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myPet: Pet | null;
  onMessageOwner?: (userId: string) => void;
}) => {
  if (!listing?.pet) return null;
  const pet = listing.pet;
  const compatibility = myPet
    ? calculateCompatibility(myPet as any, pet as any)
    : null;
  const { score: trustScore, badges } = getBreederTrustScore(listing);

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-border last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Image */}
        <div className="relative aspect-square bg-secondary">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PawPrint className="h-20 w-20 text-muted-foreground/20" />
            </div>
          )}
          {/* Verification badges overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {listing.breed_document_url && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-accent-foreground">
                <BadgeCheck className="h-3 w-3" /> Verified Breed
              </span>
            )}
            {badges.includes("Approved Listing") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white">
                <Shield className="h-3 w-3" /> Approved
              </span>
            )}
          </div>
          {/* Compatibility in corner */}
          {compatibility && (
            <div className="absolute bottom-3 right-3">
              <CompatibilityBadge score={compatibility.score} label={compatibility.label} color={compatibility.color} />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Name & basic info */}
          <div>
            <h2 className="font-display text-xl font-extrabold">{pet.name}</h2>
            <p className="text-sm text-muted-foreground">{pet.breed || pet.animal_type} · {pet.gender} · {pet.age || "Age unknown"}</p>
          </div>

          {/* Safety indicators */}
          <SafetyIndicators pet={pet} />

          {/* Trust score */}
          <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold">Trust Score: {trustScore.toFixed(1)}/5</span>
            <div className="flex gap-1 ml-auto">
              {badges.map((b, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">{b}</span>
              ))}
            </div>
          </div>

          {/* Compatibility breakdown */}
          {compatibility && (
            <div className="space-y-1.5 rounded-xl bg-secondary/40 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Compatibility Breakdown</p>
              {compatibility.factors.map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <span className="text-xs">{f.icon}</span>
                  <span className="text-[10px] font-semibold flex-1">{f.name}</span>
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${f.score >= 70 ? "bg-green-500" : f.score >= 50 ? "bg-amber-400" : "bg-orange-400"}`}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold w-6 text-right">{f.score}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm">{listing.description}</p>
            </div>
          )}

          {/* Looking for */}
          {listing.looking_for && (
            <div className="rounded-xl bg-secondary/60 px-3 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Looking for</p>
              <p className="text-sm font-medium mt-0.5">{listing.looking_for}</p>
            </div>
          )}

          {/* Detailed info */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Details</p>
            <InfoRow label="Animal Type" value={pet.animal_type} />
            <InfoRow label="Breed" value={pet.breed} />
            <InfoRow label="Age" value={pet.age} />
            <InfoRow label="Gender" value={pet.gender} />
            <InfoRow label="Weight" value={pet.weight ? `${pet.weight} kg` : null} />
            <InfoRow label="Temperament" value={pet.temperament} />
            <InfoRow label="Medical Notes" value={pet.medical_notes} />
            <InfoRow label="Special Care" value={pet.special_care} />
          </div>

          {/* Vaccination info */}
          <div className="flex flex-wrap gap-1.5">
            {pet.vaccinated === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/20 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                <Syringe className="h-3 w-3" /> Vaccinated ✓
              </span>
            )}
            {pet.vaccinated === false && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/20 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Syringe className="h-3 w-3" /> Not Vaccinated
              </span>
            )}
            {pet.neutered === true && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">Neutered/Spayed</span>
            )}
            {pet.neutered === false && (
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">Fertile ✓</span>
            )}
          </div>

          {/* Owner info + Message button */}
          {listing.profile && (
            <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={listing.profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 font-bold">{listing.profile.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-bold">{listing.profile.full_name}</p>
                {listing.profile.username && <p className="text-xs text-muted-foreground">@{listing.profile.username}</p>}
              </div>
              {badges.includes("Verified Owner") && <Shield className="h-4 w-4 text-primary" />}
            </div>
          )}

          {/* Message Owner button */}
          {onMessageOwner && listing.user_id && (
            <button
              onClick={() => onMessageOwner(listing.user_id)}
              className="w-full flex items-center justify-center gap-2 rounded-xl petkeep-gradient py-3 text-sm font-bold text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" /> Message Owner
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Premium Pet Card ───────────────────────────────────────────────────────
const PetMatchCard = ({
  listing,
  myPet,
  onContact,
  onReport,
  onViewProfile,
  onLike,
  onSkip,
}: {
  listing: PetMatchListing;
  myPet: Pet | null;
  onContact: () => void;
  onReport: () => void;
  onViewProfile: () => void;
  onLike: () => void;
  onSkip: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const pet = listing.pet;
  if (!pet) return null;

  const compatibility = myPet
    ? calculateCompatibility(
        { animal_type: myPet.animal_type, breed: myPet.breed, gender: myPet.gender, age: myPet.age, neutered: myPet.neutered, vaccinated: myPet.vaccinated, weight: myPet.weight },
        { animal_type: pet.animal_type, breed: pet.breed, gender: pet.gender, age: pet.age, neutered: pet.neutered, vaccinated: pet.vaccinated, weight: pet.weight }
      )
    : null;

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden petkeep-card-hover transition-all">
      {/* Photo header - clickable */}
      <button onClick={onViewProfile} className="relative aspect-[4/3] bg-gradient-to-br from-primary/10 to-accent/10 w-full">
        {pet.photo_url ? (
          <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PawPrint className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {listing.breed_document_url && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              <BadgeCheck className="h-3 w-3" /> Verified Breed
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <TrustScoreBadge listing={listing} />
        </div>
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div className="text-left">
            <h3 className="font-display text-lg font-extrabold text-white drop-shadow-md">{pet.name}</h3>
            <p className="text-[11px] text-white/80 font-medium drop-shadow-sm">
              {pet.breed || pet.animal_type} · {pet.gender} · {pet.age || "Age unknown"}
            </p>
          </div>
          {compatibility && <CompatibilityBadge score={compatibility.score} label={compatibility.label} color={compatibility.color} />}
        </div>
      </button>

      {/* Content */}
      <div className="p-3.5">
        {/* Safety indicators */}
        <SafetyIndicators pet={pet} />

        {/* Looking for */}
        {listing.looking_for && (
          <div className="mt-2 rounded-xl bg-secondary/60 px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Looking for</p>
            <p className="text-xs font-medium mt-0.5">{listing.looking_for}</p>
          </div>
        )}

        {/* Compatibility breakdown (expandable) */}
        {compatibility && (
          <button onClick={() => setExpanded(!expanded)} className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-primary">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "View"} compatibility breakdown
          </button>
        )}
        {expanded && compatibility && (
          <div className="mt-2 space-y-1.5 rounded-xl bg-secondary/40 p-2.5">
            {compatibility.factors.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <span className="text-xs">{f.icon}</span>
                <span className="text-[10px] font-semibold flex-1">{f.name}</span>
                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${f.score >= 70 ? "bg-green-500" : f.score >= 50 ? "bg-amber-400" : "bg-orange-400"}`}
                    style={{ width: `${f.score}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold w-6 text-right">{f.score}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
        )}

        {/* Like / Skip buttons */}
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            onClick={onSkip}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={onViewProfile}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onLike}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-green-500/30 text-green-500 hover:bg-green-500/10 transition-colors"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {/* Owner & actions */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => listing.profile?.username ? navigate(`/user/${listing.profile.username}`) : null}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={listing.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[9px] bg-primary/10 font-bold">{listing.profile?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-semibold">{listing.profile?.full_name}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={onReport} className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Flag className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onContact}
              className="flex items-center gap-1 rounded-xl petkeep-gradient px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
            >
              <MessageCircle className="h-3 w-3" /> Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main PetMatch Tab ──────────────────────────────────────────────────────
const PetMatchTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [myListings, setMyListings] = useState<PetMatchListing[]>([]);
  const [allListings, setAllListings] = useState<PetMatchListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"browse" | "my" | "matches">("browse");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPet, setSelectedPet] = useState("");
  const [activePetFilter, setActivePetFilter] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState<"compatibility" | "recent" | "trust">("compatibility");
  const [profileListing, setProfileListing] = useState<PetMatchListing | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [editPetData, setEditPetData] = useState<any>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [petVerifications, setPetVerifications] = useState<Record<string, { vaccination: string; neutered: string }>>({});
  const [verificationUploading, setVerificationUploading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [petsRes, myRes, allRes] = await Promise.all([
      supabase.from("pets").select("id, name, animal_type, breed, gender, age, photo_url, neutered, vaccinated, weight, temperament, medical_notes, special_care, emergency_contact, vet_info, is_verified").eq("owner_id", user.id),
      fromTable("petmatch_listings").select("*").eq("user_id", user.id),
      fromTable("petmatch_listings").select("*").eq("is_active", true).neq("user_id", user.id),
    ]);

    const myPets = (petsRes.data || []) as Pet[];
    setPets(myPets);
    setMyListings((myRes.data || []) as PetMatchListing[]);
    if (!activePetFilter && myPets.length > 0) setActivePetFilter(myPets[0].id);

    const listings = (allRes.data || []) as PetMatchListing[];
    if (listings.length > 0) {
      const petIds = listings.map((l) => l.pet_id);
      const userIds = [...new Set(listings.map((l) => l.user_id))];
      const [petsData, profilesData, verificationsData] = await Promise.all([
        supabase.from("pets").select("id, name, animal_type, breed, gender, age, photo_url, neutered, vaccinated, weight, temperament, medical_notes, special_care, emergency_contact, vet_info, is_verified, owner_id").in("id", petIds),
        supabase.from("profiles").select("user_id, full_name, avatar_url, username").in("user_id", userIds),
        fromTable("pet_verifications").select("pet_id, verification_type, status").in("pet_id", petIds).eq("status", "verified"),
      ]);
      const petsMap = Object.fromEntries((petsData.data || []).map((p: any) => [p.id, p]));
      const profilesMap = Object.fromEntries((profilesData.data || []).map((p: any) => [p.user_id, p]));
      // Build verification lookup
      const verMap: Record<string, { vaccination_verified: boolean; neutered_verified: boolean }> = {};
      (verificationsData.data || []).forEach((v: any) => {
        if (!verMap[v.pet_id]) verMap[v.pet_id] = { vaccination_verified: false, neutered_verified: false };
        if (v.verification_type === "vaccination") verMap[v.pet_id].vaccination_verified = true;
        if (v.verification_type === "neutered") verMap[v.pet_id].neutered_verified = true;
      });
      listings.forEach((l) => {
        const pet = petsMap[l.pet_id];
        if (pet && verMap[l.pet_id]) {
          pet.vaccination_verified = verMap[l.pet_id].vaccination_verified;
          pet.neutered_verified = verMap[l.pet_id].neutered_verified;
        }
        l.pet = pet;
        l.profile = profilesMap[l.user_id];
      });
    }
    setAllListings(listings.filter((l) => l.status === "approved"));

    // Fetch verification statuses for own pets
    if (myPets.length > 0) {
      const myPetIds = myPets.map(p => p.id);
      const { data: myVerData } = await fromTable("pet_verifications")
        .select("pet_id, verification_type, status")
        .in("pet_id", myPetIds);
      const verLookup: Record<string, { vaccination: string; neutered: string }> = {};
      myPets.forEach(p => { verLookup[p.id] = { vaccination: "not_submitted", neutered: "not_submitted" }; });
      (myVerData || []).forEach((v: any) => {
        if (!verLookup[v.pet_id]) verLookup[v.pet_id] = { vaccination: "not_submitted", neutered: "not_submitted" };
        if (v.verification_type === "vaccination") verLookup[v.pet_id].vaccination = v.status;
        if (v.verification_type === "neutered") verLookup[v.pet_id].neutered = v.status;
      });
      setPetVerifications(verLookup);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!selectedPet || !user) return;
    // Gate: pet must have at least one verified document
    const pet = pets.find(p => p.id === selectedPet);
    if (!pet?.is_verified) {
      toast({
        title: "Verification required",
        description: "Upload a pet document (vaccination, passport, ownership proof, etc.) and wait for admin verification before listing.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await fromTable("petmatch_listings").insert({
      user_id: user.id,
      pet_id: selectedPet,
      looking_for: lookingFor,
      description,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Listing created!", description: "It will be reviewed before going live." });
    setShowCreate(false);
    setSelectedPet("");
    setLookingFor("");
    setDescription("");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fromTable("petmatch_listings").delete().eq("id", id);
    toast({ title: "Listing removed" });
    fetchData();
  };

  const handleUploadDoc = async (listingId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/petmatch/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("verification-docs").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = await supabase.storage.from("verification-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
    await fromTable("petmatch_listings").update({
      breed_document_url: urlData?.signedUrl || path,
      breed_document_name: file.name,
    }).eq("id", listingId);
    toast({ title: "Breed document uploaded!" });
    setUploading(false);
    fetchData();
  };

  const handleContact = (listing: PetMatchListing) => {
    if (listing.profile?.username) navigate(`/user/${listing.profile.username}`);
    else toast({ title: "Cannot contact this user" });
  };

  const handleReport = async (listing: PetMatchListing) => {
    if (!user) return;
    const { error } = await fromTable("petmatch_reports").insert({
      listing_id: listing.id,
      reporter_id: user.id,
      reported_user_id: listing.user_id,
      reason: "Reported by user",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Report submitted", description: "Our team will review this listing shortly." });
  };

  const handleVerificationUpload = async (petId: string, type: string, file: File) => {
    if (!user) return;
    setVerificationUploading(`${petId}_${type}`);
    const filePath = `${user.id}/${petId}/${type}_${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("pet-verification-docs")
      .upload(filePath, file, { upsert: true });
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setVerificationUploading(null);
      return;
    }
    const { data: urlData } = await supabase.storage
      .from("pet-verification-docs")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
    const { data: existing } = await fromTable("pet_verifications")
      .select("id, status")
      .eq("pet_id", petId)
      .eq("verification_type", type);
    for (const ex of (existing || [])) {
      if (ex.status !== "verified") {
        await fromTable("pet_verifications").delete().eq("id", ex.id);
      }
    }
    const { error: insertErr } = await fromTable("pet_verifications").insert({
      pet_id: petId,
      owner_id: user.id,
      verification_type: type,
      document_url: urlData?.signedUrl || filePath,
      document_name: file.name,
      status: "pending",
    });
    if (insertErr) {
      toast({ title: "Error", description: insertErr.message, variant: "destructive" });
    } else {
      toast({ title: "Proof submitted for review! ⏳" });
    }
    setVerificationUploading(null);
    fetchData();
  };

  const handleLike = (listing: PetMatchListing) => {
    setLikedIds(prev => new Set(prev).add(listing.id));
    toast({ title: `❤️ You liked ${listing.pet?.name}!`, description: "They'll be notified if it's a mutual match." });
  };

  const handleSkip = (listing: PetMatchListing) => {
    setSkippedIds(prev => new Set(prev).add(listing.id));
  };

  const listedPetIds = myListings.map((l) => l.pet_id);
  const availablePets = pets.filter((p) => !listedPetIds.includes(p.id));
  const activePet = pets.find((p) => p.id === activePetFilter) || pets[0] || null;

  // Filter & sort listings
  let filteredListings = filterType === "all" ? allListings : allListings.filter((l) => l.pet?.animal_type === filterType);

  // Remove skipped listings
  filteredListings = filteredListings.filter(l => !skippedIds.has(l.id));

  // Best Match = same breed filter
  let noExactBreedMatch = false;
  if (sortBy === "compatibility" && activePet) {
    const sameBreedListings = filteredListings.filter(l =>
      l.pet?.breed && activePet.breed &&
      l.pet.breed.toLowerCase() === activePet.breed.toLowerCase()
    );

    if (sameBreedListings.length > 0) {
      filteredListings = sameBreedListings.sort((a, b) => {
        const scoreA = a.pet ? calculateCompatibility(activePet as any, a.pet as any).score : 0;
        const scoreB = b.pet ? calculateCompatibility(activePet as any, b.pet as any).score : 0;
        return scoreB - scoreA;
      });
    } else {
      noExactBreedMatch = true;
      // Fallback: show all same animal_type sorted by compatibility
      filteredListings = [...filteredListings]
        .filter(l => l.pet?.animal_type === activePet.animal_type)
        .sort((a, b) => {
          const scoreA = a.pet ? calculateCompatibility(activePet as any, a.pet as any).score : 0;
          const scoreB = b.pet ? calculateCompatibility(activePet as any, b.pet as any).score : 0;
          return scoreB - scoreA;
        });
    }
  } else if (sortBy === "recent") {
    filteredListings = [...filteredListings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "trust") {
    filteredListings = [...filteredListings].sort((a, b) => getBreederTrustScore(b).score - getBreederTrustScore(a).score);
  }

  // No pets
  if (!loading && pets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <PawPrint className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-lg font-bold">Add a Pet to Use PetMatch</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">You need at least one pet profile to find breeding partners.</p>
        <button onClick={() => navigate("/profile")} className="mt-4 petkeep-gradient rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4 inline mr-1" /> Add Pet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pet Profile Detail Modal */}
      <PetProfileDetailModal
        listing={profileListing}
        open={!!profileListing}
        onOpenChange={(open) => { if (!open) setProfileListing(null); }}
        myPet={activePet}
        onMessageOwner={(userId) => {
          setProfileListing(null);
          const username = profileListing?.profile?.username;
          if (username) navigate(`/user/${username}`);
        }}
      />

      {/* PetProfileModal for editing (same card-based edit as profile) */}
      <PetProfileModal
        pet={editPetData}
        open={!!editPetData}
        onOpenChange={(open) => { if (!open) setEditPetData(null); }}
        isOwner={true}
        onEdit={() => {}}
        onDelete={() => {}}
        onPetUpdated={() => { setEditPetData(null); fetchData(); }}
      />

      {/* AddPetFlow for adding new pets */}
      <AddPetFlow
        open={showAddPet}
        onOpenChange={(open) => { if (!open) setShowAddPet(false); }}
        onPetAdded={() => { setShowAddPet(false); fetchData(); }}
      />

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 via-primary/5 to-accent/10 border border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-primary">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-bold">PetMatch</h3>
            <p className="text-xs text-muted-foreground">Find verified breeding partners</p>
          </div>
          {myListings.length > 0 && (
            <div className="text-right">
              <p className="text-lg font-extrabold text-primary">{myListings.length}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Listings</p>
            </div>
          )}
        </div>
      </div>

      {/* View Toggle (3 tabs) */}
      <div className="flex gap-1.5 rounded-xl bg-secondary/50 p-1">
        {([
          { key: "browse", label: "Browse", icon: <Search className="h-3 w-3" /> },
          { key: "my", label: "My Pets", icon: <PawPrint className="h-3 w-3" /> },
          { key: "matches", label: "Activity", icon: <Heart className="h-3 w-3" /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-all ${
              view === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BROWSE VIEW ────────────────────────────────────────────────────── */}
      {view === "browse" && (
        <div className="space-y-3">
          {/* Pet selector for comparison */}
          {pets.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Matching for</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {pets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePetFilter(p.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      activePetFilter === p.id
                        ? "bg-gradient-to-r from-pink-500 to-primary text-white shadow-sm"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {p.photo_url ? (
                      <img src={p.photo_url} className="h-4 w-4 rounded-full object-cover" />
                    ) : (
                      <PawPrint className="h-3 w-3" />
                    )}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters row */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
              {["all", "dog", "cat", "bird", "rabbit", "other"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    filterType === t ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {t === "all" ? "🐾 All" : t === "dog" ? "🐕 Dogs" : t === "cat" ? "🐈 Cats" : t === "bird" ? "🐦 Birds" : t === "rabbit" ? "🐇 Rabbits" : "🐾 Other"}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-semibold outline-none"
            >
              <option value="compatibility">Best Match</option>
              <option value="recent">Newest</option>
              <option value="trust">Trust Score</option>
            </select>
          </div>

          {/* No exact breed match message */}
          {noExactBreedMatch && sortBy === "compatibility" && activePet?.breed && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3 text-center">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                No exact {activePet.breed} matches found
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                Showing similar breeds instead
              </p>
            </div>
          )}

          {/* Cards */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No matches available</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later or list your pet!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredListings.map((listing) => (
                <PetMatchCard
                  key={listing.id}
                  listing={listing}
                  myPet={activePet}
                  onContact={() => handleContact(listing)}
                  onReport={() => handleReport(listing)}
                  onViewProfile={() => setProfileListing(listing)}
                  onLike={() => handleLike(listing)}
                  onSkip={() => handleSkip(listing)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MY LISTINGS VIEW ───────────────────────────────────────────────── */}
      {view === "my" && (
        <div className="space-y-3">
          {availablePets.length > 0 && !showCreate && (
            <button onClick={() => setShowCreate(true)} className="w-full rounded-2xl border-2 border-dashed border-primary/30 p-4 text-center hover:bg-primary/5 transition-colors">
              <Plus className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-primary">List a Pet for Matching</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Requires breed verification for approval</p>
            </button>
          )}

          {showCreate && (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> New PetMatch Listing
              </h4>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Select Pet</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availablePets.map((p) => {
                    const safety = isSafeForBreeding({ animal_type: p.animal_type, breed: p.breed, gender: p.gender, age: p.age, neutered: p.neutered, vaccinated: p.vaccinated, weight: p.weight });
                    return (
                      <button key={p.id} onClick={() => setSelectedPet(p.id)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${selectedPet === p.id ? "petkeep-gradient text-primary-foreground" : "bg-secondary"}`}>
                        {p.photo_url ? <img src={p.photo_url} className="h-6 w-6 rounded-full object-cover" /> : <PawPrint className="h-4 w-4" />}
                        {p.name}
                        {!safety.safe && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                      </button>
                    );
                  })}
                </div>
                {selectedPet && (() => {
                  const selPet = availablePets.find(p => p.id === selectedPet);
                  if (!selPet) return null;
                  const safety = isSafeForBreeding({ animal_type: selPet.animal_type, breed: selPet.breed, gender: selPet.gender, age: selPet.age, neutered: selPet.neutered, vaccinated: selPet.vaccinated, weight: selPet.weight });
                  if (safety.safe) return null;
                  return (
                    <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-900/10 p-2.5">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Safety Warnings
                      </p>
                      {safety.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">• {w}</p>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Looking For</label>
                <input value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} placeholder="e.g. Female Golden Retriever, 2-4 years" className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Tell others about your pet..." className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-bold">Cancel</button>
                <button onClick={handleCreate} disabled={!selectedPet} className="flex-1 petkeep-gradient rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">Create Listing</button>
              </div>
            </div>
          )}

          {myListings.length === 0 && !showCreate ? (
            <div className="text-center py-8">
              <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold">No listings yet</p>
              <p className="text-xs text-muted-foreground mt-1">List your pet to find breeding matches</p>
            </div>
          ) : (
            myListings.map((listing) => {
              const pet = pets.find((p) => p.id === listing.pet_id);
              const statusConfig: Record<string, { bg: string; label: string }> = {
                pending: { bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", label: "⏳ Pending Review" },
                approved: { bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "✅ Approved" },
                rejected: { bg: "bg-destructive/10 text-destructive", label: "❌ Rejected" },
              };
              const sc = statusConfig[listing.status] || { bg: "bg-secondary", label: listing.status };
              return (
                <div key={listing.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                  {/* Pet photo strip */}
                  {pet?.photo_url && (
                    <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10">
                      <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={pet?.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{pet?.name?.[0] || "P"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{pet?.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${sc.bg}`}>{sc.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{pet?.breed} · {pet?.gender} · {pet?.age}</p>
                        {listing.looking_for && <p className="text-xs mt-1"><span className="font-semibold">Looking for:</span> {listing.looking_for}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        {pet && (
                          <button onClick={() => setEditPetData(pet)} className="rounded-full p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(listing.id)} className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Safety check for own pet */}
                    {pet && <SafetyIndicators pet={pet as Pet} />}

                    {/* Verification docs */}
                    {!listing.breed_document_url && (
                      <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 p-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Upload breed documents</p>
                          <p className="text-[9px] text-amber-600/70">Required for listing approval</p>
                        </div>
                        <label className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white cursor-pointer">
                          <Upload className="h-3 w-3 inline mr-0.5" /> Upload
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDoc(listing.id, f); }} />
                        </label>
                      </div>
                    )}
                    {listing.breed_document_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                        <span className="text-muted-foreground">{listing.breed_document_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── ACTIVITY VIEW ──────────────────────────────────────────────────── */}
      {view === "matches" && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-primary/20">
              <Heart className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-base font-bold">Match Activity</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              When breeders contact you about your listings, their messages and match requests will appear here.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-extrabold text-primary">{myListings.filter(l => l.status === "approved").length}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Active</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-extrabold text-amber-500">{myListings.filter(l => l.status === "pending").length}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Pending</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-extrabold text-muted-foreground">{likedIds.size}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Liked</p>
            </div>
          </div>

          {/* ─── VERIFICATION WARNINGS (High Priority) ──────────────────────── */}
          {pets.length > 0 && (() => {
            const warnings: { petId: string; petName: string; petPhoto: string | null; type: string; label: string; desc: string; status: string }[] = [];
            pets.forEach(pet => {
              const ver = petVerifications[pet.id];
              if (!ver) {
                warnings.push({ petId: pet.id, petName: pet.name, petPhoto: pet.photo_url, type: "vaccination", label: "Vaccination Proof", desc: "Add vaccination proof to verify your pet", status: "not_submitted" });
                warnings.push({ petId: pet.id, petName: pet.name, petPhoto: pet.photo_url, type: "neutered", label: "Neutered/Spayed Proof", desc: "Add neutered/spayed proof to continue", status: "not_submitted" });
                return;
              }
              if (ver.vaccination !== "verified") {
                warnings.push({ petId: pet.id, petName: pet.name, petPhoto: pet.photo_url, type: "vaccination", label: "Vaccination Proof", desc: ver.vaccination === "pending" ? "Vaccination proof is pending review" : ver.vaccination === "rejected" ? "Vaccination proof was rejected — please re-upload" : "Add vaccination proof to verify your pet", status: ver.vaccination });
              }
              if (ver.neutered !== "verified") {
                warnings.push({ petId: pet.id, petName: pet.name, petPhoto: pet.photo_url, type: "neutered", label: "Neutered/Spayed Proof", desc: ver.neutered === "pending" ? "Neutered/spayed proof is pending review" : ver.neutered === "rejected" ? "Neutered/spayed proof was rejected — please re-upload" : "Add neutered/spayed proof to continue", status: ver.neutered });
              }
            });
            if (warnings.length === 0) return null;
            return (
              <div className="space-y-2">
                {warnings.map((w, i) => {
                  const isUploading = verificationUploading === `${w.petId}_${w.type}`;
                  const isPending = w.status === "pending";
                  const isRejected = w.status === "rejected";
                  return (
                    <div key={i} className={`rounded-2xl border p-3 ${
                      isPending ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30" :
                      isRejected ? "bg-destructive/5 border-destructive/20" :
                      "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30"
                    }`}>
                      <div className="flex items-start gap-3">
                        {w.petPhoto ? (
                          <img src={w.petPhoto} alt={w.petName} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary shrink-0">
                            <PawPrint className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isPending ? (
                              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            ) : isRejected ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            ) : (
                              <Shield className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                            )}
                            <p className="text-xs font-bold truncate">
                              {w.petName} — {w.label}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{w.desc}</p>
                          {!isPending && (
                            <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                              ⚠️ Verification required to appear in PetMatch
                            </p>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
                              <Clock className="h-2.5 w-2.5" /> Pending ⏳
                            </span>
                          )}
                        </div>
                        {!isPending && (
                          <label className={`shrink-0 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-colors ${
                            isUploading ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
                          }`}>
                            {isUploading ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="h-3 w-3" /> Upload Proof</>
                            )}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleVerificationUpload(w.petId, w.type, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Smart Safety Checklist */}
          {pets.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-6 text-center">
              <PawPrint className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <h4 className="text-sm font-bold">Add a pet to complete your safety checklist</h4>
              <p className="text-xs text-muted-foreground mt-1">Your checklist will auto-generate from your pet profiles.</p>
              <button
                onClick={() => setShowAddPet(true)}
                className="mt-3 petkeep-gradient rounded-xl px-5 py-2 text-xs font-bold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Pet
              </button>
            </div>
          ) : (
            pets.map((pet) => {
              const checks = [
                { label: "Profile photo added", done: !!pet.photo_url, icon: <Camera className="h-3.5 w-3.5" /> },
                { label: "Breed specified", done: !!pet.breed && pet.breed.trim() !== "", icon: <Dog className="h-3.5 w-3.5" /> },
                { label: "Age specified", done: !!pet.age && pet.age.trim() !== "", icon: <Calendar className="h-3.5 w-3.5" /> },
                { label: "Gender specified", done: !!pet.gender && pet.gender.trim() !== "", icon: <PawPrint className="h-3.5 w-3.5" /> },
                { label: "Vaccination info", done: pet.vaccinated === true, icon: <Syringe className="h-3.5 w-3.5" /> },
                { label: "Medical notes", done: !!pet.medical_notes && pet.medical_notes.trim() !== "", icon: <FileText className="h-3.5 w-3.5" /> },
                { label: "Weight recorded", done: !!pet.weight && pet.weight.trim() !== "", icon: <PawPrint className="h-3.5 w-3.5" /> },
                { label: "Breed documents uploaded", done: myListings.some(l => l.pet_id === pet.id && l.breed_document_url), icon: <BadgeCheck className="h-3.5 w-3.5" /> },
              ];
              const completedCount = checks.filter(c => c.done).length;
              const percentage = Math.round((completedCount / checks.length) * 100);
              const isComplete = percentage === 100;

              return (
                <div key={pet.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                  {/* Pet header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary ring-2 ring-primary/20">
                        <PawPrint className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{pet.name}</p>
                        {isComplete && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/20 px-2 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pet.breed || pet.animal_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-primary">{percentage}%</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="px-3 pt-2">
                    <Progress value={percentage} className="h-1.5" />
                  </div>

                  {/* Checklist items */}
                  <div className="p-3 space-y-1.5">
                    {checks.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${item.done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                          {item.done ? <CheckCircle2 className="h-3 w-3" /> : item.icon}
                        </div>
                        <span className={`text-xs flex-1 ${item.done ? "font-semibold line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</span>
                        {!item.done && (
                          <button
                            onClick={() => setEditPetData(pet)}
                            className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Pencil className="h-2.5 w-2.5 inline mr-0.5" /> Add
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default PetMatchTab;

import AppLayout from "@/components/AppLayout";
import { Settings, Grid3X3, Bookmark, Heart, Star, MapPin, BadgeCheck, CreditCard } from "lucide-react";

const ProfilePage = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="font-display text-xl font-extrabold">your_username</h1>
          <button className="rounded-full p-2 hover:bg-secondary">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Profile info */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-2xl font-bold text-primary-foreground">
              YU
            </div>
            <div className="flex flex-1 justify-around text-center">
              <div>
                <p className="font-display text-lg font-extrabold">12</p>
                <p className="text-[10px] text-muted-foreground">Posts</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">248</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">186</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-bold">Pet Lover 🐾</p>
            <p className="text-xs text-muted-foreground">Dog mom to Charlie & Luna 🐕</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> Skopje, North Macedonia
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <button className="petkeep-gradient flex-1 rounded-xl py-2 text-sm font-bold text-primary-foreground">
              Edit Profile
            </button>
            <button className="flex-1 rounded-xl bg-secondary py-2 text-sm font-bold text-secondary-foreground">
              Share Profile
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <div className="rounded-2xl bg-petkeep-mint-light p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-petkeep-mint" />
              <span className="text-xs font-bold text-petkeep-mint">Credits</span>
            </div>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">1,250</p>
            <p className="text-[10px] text-muted-foreground">💎 PetKeep Points</p>
          </div>
          <div className="rounded-2xl bg-petkeep-cream p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary">Rating</span>
            </div>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">4.9</p>
            <p className="text-[10px] text-muted-foreground">⭐ 23 reviews</p>
          </div>
        </div>

        {/* My Pets */}
        <div className="px-4 pb-4">
          <h3 className="font-display text-base font-bold">My Pets</h3>
          <div className="mt-2 flex gap-3">
            {[
              { name: "Charlie", breed: "Golden Retriever", emoji: "🐕" },
              { name: "Luna", breed: "Husky", emoji: "🐺" },
            ].map((pet) => (
              <div
                key={pet.name}
                className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 petkeep-card-shadow"
              >
                <span className="text-lg">{pet.emoji}</span>
                <div>
                  <p className="text-xs font-bold">{pet.name}</p>
                  <p className="text-[10px] text-muted-foreground">{pet.breed}</p>
                </div>
              </div>
            ))}
            <button className="flex items-center justify-center rounded-xl border-2 border-dashed border-border px-4 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              + Add
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border">
          <button className="flex-1 border-b-2 border-foreground py-3 flex items-center justify-center">
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
            <Bookmark className="h-5 w-5" />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {/* Grid placeholder */}
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary flex items-center justify-center text-2xl">
              {["🐕", "🐱", "🐶", "🌳", "🐾", "🦴", "🐕", "🐱", "🎀"][i]}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;

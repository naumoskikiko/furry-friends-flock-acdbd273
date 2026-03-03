import AppLayout from "@/components/AppLayout";
import { Search, ChevronRight, Star, MapPin } from "lucide-react";
import { storeCategories } from "@/data/mockData";

const featuredStores = [
  { name: "PetShop Plus", type: "Pet Store", rating: 4.8, reviews: 56, acceptsCredits: true, icon: "🏪" },
  { name: "Happy Paws Vet", type: "Vet Clinic", rating: 4.9, reviews: 124, acceptsCredits: true, icon: "🏥" },
  { name: "Groom & Bloom", type: "Grooming", rating: 4.6, reviews: 31, acceptsCredits: false, icon: "✂️" },
];

const MarketplacePage = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-display text-2xl font-extrabold">Pet Vault</h1>
          <p className="text-sm text-muted-foreground">Your local pet marketplace</p>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search stores, products..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-4">
          <h3 className="mb-3 font-display text-base font-bold">Categories</h3>
          <div className="grid grid-cols-3 gap-3">
            {storeCategories.map((cat) => (
              <button
                key={cat.id}
                className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 petkeep-card-shadow petkeep-card-hover"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-bold">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">{cat.count} places</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Featured Partners</h3>
            <button className="text-xs font-semibold text-primary">See all</button>
          </div>
          <div className="mt-3 space-y-3">
            {featuredStores.map((store) => (
              <div
                key={store.name}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 petkeep-card-shadow petkeep-card-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl">
                  {store.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold">{store.name}</h4>
                    {store.acceptsCredits && (
                      <span className="rounded-full bg-petkeep-mint-light px-2 py-0.5 text-[9px] font-bold text-petkeep-mint">
                        💎 Credits
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{store.type}</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {store.rating} ({store.reviews})
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MarketplacePage;

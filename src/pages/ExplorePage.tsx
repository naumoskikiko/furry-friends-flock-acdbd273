import AppLayout from "@/components/AppLayout";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";

const filters = ["All", "Sitters", "Walkers", "Vets", "Stores", "Parks"];

const ExplorePage = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Search */}
        <div className="sticky top-0 z-40 bg-card/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search places, sitters, stores..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button className="rounded-xl bg-secondary p-2.5">
              <SlidersHorizontal className="h-4 w-4 text-foreground" />
            </button>
          </div>
          {/* Filter chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {filters.map((f, i) => (
              <button
                key={f}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  i === 0
                    ? "petkeep-gradient text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Map placeholder */}
        <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl bg-petkeep-beige" style={{ height: "50vh" }}>
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <MapPin className="h-12 w-12 text-primary" />
            <p className="font-display text-lg font-bold text-foreground">Explore Your Area</p>
            <p className="text-sm">Interactive map coming soon</p>
            <p className="text-xs">Skopje, North Macedonia</p>
          </div>
          {/* Fake pins */}
          <div className="absolute left-[20%] top-[30%] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground shadow-lg">🐕</div>
          <div className="absolute left-[60%] top-[25%] flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground shadow-lg">🏥</div>
          <div className="absolute left-[45%] top-[55%] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground shadow-lg">🏪</div>
          <div className="absolute left-[75%] top-[60%] flex h-8 w-8 items-center justify-center rounded-full bg-petkeep-green text-xs shadow-lg">🌳</div>
        </div>

        {/* Nearby */}
        <div className="p-4">
          <h3 className="font-display text-lg font-bold">Nearby</h3>
          <div className="mt-3 space-y-3">
            {[
              { name: "Happy Paws Vet", type: "Vet Clinic", dist: "0.3 km", icon: "🏥" },
              { name: "PetShop Plus", type: "Pet Store", dist: "0.8 km", icon: "🏪" },
              { name: "City Dog Park", type: "Dog Park", dist: "1.1 km", icon: "🌳" },
            ].map((place) => (
              <div key={place.name} className="flex items-center gap-3 rounded-xl bg-card p-3 petkeep-card-shadow petkeep-card-hover">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-lg">
                  {place.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{place.name}</p>
                  <p className="text-xs text-muted-foreground">{place.type} • {place.dist}</p>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ExplorePage;

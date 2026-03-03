import AppLayout from "@/components/AppLayout";
import { Star, BadgeCheck, GraduationCap, MapPin, ChevronRight } from "lucide-react";
import { mockSitters } from "@/data/mockData";

const serviceFilters = ["All", "Sitting", "Walking", "Foster", "Drop-in", "Group"];

const CarePage = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="px-4 pt-4 pb-2">
          <h1 className="font-display text-2xl font-extrabold">Pet Care</h1>
          <p className="text-sm text-muted-foreground">Find trusted sitters & walkers near you</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {serviceFilters.map((f, i) => (
            <button
              key={f}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                i === 0
                  ? "petkeep-gradient text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sitter cards */}
        <div className="space-y-3 px-4 pb-4">
          {mockSitters.map((sitter) => (
            <div
              key={sitter.id}
              className="rounded-2xl bg-card p-4 petkeep-card-shadow petkeep-card-hover"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-lg font-bold text-primary-foreground">
                  {sitter.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-base font-bold">{sitter.name}</h3>
                    {sitter.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    {sitter.isStudent && <GraduationCap className="h-4 w-4 text-accent" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {sitter.rating}
                    </span>
                    <span>({sitter.reviews} reviews)</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {sitter.distance}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{sitter.bio}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {sitter.services.map((s) => (
                      <span key={s} className="rounded-full bg-petkeep-mint-light px-2 py-0.5 text-[10px] font-semibold text-petkeep-mint">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <span className="font-display text-lg font-extrabold text-primary">
                    {sitter.pricePerHour} MKD
                  </span>
                  <span className="text-xs text-muted-foreground"> /hour</span>
                </div>
                <button className="petkeep-gradient flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
                  Book Now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CarePage;

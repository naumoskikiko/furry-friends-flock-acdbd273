import { MapPin, Shield, Bell, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  onUpgrade: () => void;
}

const features = [
  { icon: Navigation, label: "Live location updates" },
  { icon: MapPin, label: "Real-time map tracking" },
  { icon: Shield, label: "Safe zone alerts" },
  { icon: Bell, label: "Lost pet emergency alerts" },
];

const FindMyPetUpgrade = ({ onUpgrade }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg p-4 flex flex-col items-center">
      <button onClick={() => navigate(-1)} className="self-start text-sm text-muted-foreground mb-4">
        ← Back
      </button>

      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 mb-6">
        <span className="text-4xl">🐾</span>
      </div>

      <h1 className="text-2xl font-bold font-display text-center">
        Track Your Pet in Real Time
      </h1>
      <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
        Connect your pet tracker device and monitor your pet's location directly on the map.
      </p>

      <div className="w-full mt-8 space-y-3">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-card p-4 petkeep-card-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm font-semibold">{label}</p>
          </div>
        ))}
      </div>

      <div className="w-full mt-8 rounded-2xl bg-card p-5 petkeep-card-shadow text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">FindMyPet Premium</p>
        <div className="mt-2 flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold font-display">$2</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        <Button onClick={onUpgrade} className="w-full mt-4 rounded-xl text-base h-12 petkeep-gradient">
          Upgrade for $2/month
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2">Cancel anytime • No commitment</p>
      </div>
    </div>
  );
};

export default FindMyPetUpgrade;

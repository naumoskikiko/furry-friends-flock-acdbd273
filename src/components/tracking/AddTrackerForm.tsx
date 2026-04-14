import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bluetooth } from "lucide-react";
import BLEScanner from "./BLEScanner";

interface Props {
  onSubmit: (data: {
    pet_name: string;
    pet_type: string;
    breed: string;
    tracker_device_id: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const PET_TYPES = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

const AddTrackerForm = ({ onSubmit, onCancel }: Props) => {
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showBLEScanner, setShowBLEScanner] = useState(false);
  const [bleBattery, setBleBattery] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!petName.trim() || !deviceId.trim()) {
      toast.error("Pet name and Tracker Device ID are required");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        pet_name: petName.trim(),
        pet_type: petType.toLowerCase(),
        breed: breed.trim(),
        tracker_device_id: deviceId.trim(),
      });
      toast.success("Tracker added!");
    } catch (err: any) {
      if (err?.message?.includes("unique")) {
        toast.error("This Tracker Device ID is already in use");
      } else {
        toast.error("Failed to add tracker");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (showBLEScanner) {
    return (
      <BLEScanner
        onDeviceBound={(trackerId, batteryLevel) => {
          setDeviceId(trackerId);
          setBleBattery(batteryLevel);
          setShowBLEScanner(false);
          toast.success(`Tracker ${trackerId} detected!`);
        }}
        onCancel={() => setShowBLEScanner(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <button onClick={onCancel} className="text-sm text-muted-foreground mb-4">← Back</button>

      <h1 className="text-xl font-bold font-display mb-1">Add Pet Tracker</h1>
      <p className="text-sm text-muted-foreground mb-6">Register your tracker device</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pet Name *</label>
          <Input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="Buddy" className="rounded-xl" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Breed</label>
          <Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Golden Retriever" className="rounded-xl" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tracker Device ID *</label>
          <div className="flex gap-2">
            <Input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="PK-XXXX-XXXX"
              className="rounded-xl font-mono flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowBLEScanner(true)}
              className="rounded-xl gap-1.5 shrink-0"
            >
              <Bluetooth className="h-4 w-4" />
              Scan
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Enter manually or scan via Bluetooth
          </p>
          {bleBattery !== null && (
            <p className="text-[10px] text-primary mt-1">🔋 Battery: {bleBattery}%</p>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-xl h-12 petkeep-gradient text-base mt-2">
          {submitting ? "Adding..." : "Add Tracker"}
        </Button>
      </div>
    </div>
  );
};

export default AddTrackerForm;

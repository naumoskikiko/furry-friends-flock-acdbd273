import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
          <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="PK-XXXX-XXXX" className="rounded-xl font-mono" />
          <p className="text-[10px] text-muted-foreground mt-1">Find this on the back of your tracker device</p>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-xl h-12 petkeep-gradient text-base mt-2">
          {submitting ? "Adding..." : "Add Tracker"}
        </Button>
      </div>
    </div>
  );
};

export default AddTrackerForm;

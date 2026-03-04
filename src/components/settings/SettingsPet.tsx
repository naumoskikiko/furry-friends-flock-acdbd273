import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Stethoscope } from "lucide-react";

const SettingsPet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [vetName, setVetName] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [medicalPrivacy, setMedicalPrivacy] = useState("private");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings")
      .select("emergency_contact_name, emergency_contact_phone, vet_name, vet_phone, medical_notes_privacy")
      .eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setEmergencyName(data.emergency_contact_name || "");
          setEmergencyPhone(data.emergency_contact_phone || "");
          setVetName(data.vet_name || "");
          setVetPhone(data.vet_phone || "");
          setMedicalPrivacy(data.medical_notes_privacy);
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("user_settings").update({
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      vet_name: vetName,
      vet_phone: vetPhone,
      medical_notes_privacy: medicalPrivacy,
    }).eq("user_id", user.id);
    setSaving(false);
    toast({ title: "Pet settings saved!" });
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Emergency Contact */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold flex items-center gap-2"><Phone className="h-4 w-4 text-destructive" /> Emergency Contact</p>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Emergency contact name" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>
      </div>

      {/* Vet Info */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-petkeep-mint" /> Veterinary Info</p>
        <div className="space-y-2">
          <Label>Vet Name / Clinic</Label>
          <Input value={vetName} onChange={e => setVetName(e.target.value)} placeholder="Your vet clinic name" />
        </div>
        <div className="space-y-2">
          <Label>Vet Phone</Label>
          <Input value={vetPhone} onChange={e => setVetPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>
      </div>

      {/* Medical Notes Privacy */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-2">Medical Notes Privacy</p>
        {[
          { id: "private", label: "Private", desc: "Only visible to you" },
          { id: "sitter_only", label: "Sitters Only", desc: "Visible to booked sitters" },
          { id: "public", label: "Public", desc: "Visible on pet profile" },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setMedicalPrivacy(opt.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors ${
              medicalPrivacy === opt.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary"
            }`}
          >
            <p className="text-sm">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.desc}</p>
          </button>
        ))}
      </div>

      <Button onClick={handleSave} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={saving}>
        {saving ? "Saving..." : "Save Pet Settings"}
      </Button>
    </div>
  );
};

export default SettingsPet;

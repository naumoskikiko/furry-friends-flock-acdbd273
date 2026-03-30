import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Plus, Trash2, Settings, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

interface Provider {
  id: string;
  business_name: string;
  category: string;
  is_verified: boolean;
  photo_url: string | null;
  user_id: string;
}

interface Service {
  id: string;
  provider_id: string;
  service_name: string;
  price: number;
  duration: number;
  description: string;
  is_active: boolean;
}

interface Availability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ServiceAvailabilityPanel = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"services" | "availability">("services");

  // Service form
  const [showForm, setShowForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcDuration, setSvcDuration] = useState("30");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await fromTable("care_providers").select("id, business_name, category, is_verified, photo_url, user_id").order("business_name");
      setProviders(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const selectProvider = async (p: Provider) => {
    setSelectedProvider(p);
    const [{ data: svc }, { data: avail }] = await Promise.all([
      fromTable("care_services").select("*").eq("provider_id", p.id).order("service_name"),
      fromTable("provider_availability").select("*").eq("provider_id", p.id).order("day_of_week"),
    ]);
    setServices(svc || []);
    setAvailability(avail || []);
  };

  const handleAddService = async () => {
    if (!svcName.trim() || !svcPrice || !selectedProvider) return;
    const { error } = await fromTable("care_services").insert({
      provider_id: selectedProvider.id,
      service_name: svcName.trim(),
      description: svcDesc.trim(),
      price: Number(svcPrice),
      duration: Number(svcDuration) || 30,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Service added" });
      selectProvider(selectedProvider);
      setSvcName(""); setSvcDesc(""); setSvcPrice(""); setSvcDuration("30");
      setShowForm(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!selectedProvider) return;
    await fromTable("care_services").delete().eq("id", id);
    toast({ title: "Service deleted" });
    selectProvider(selectedProvider);
  };

  const toggleAvailability = async (avail: Availability) => {
    await fromTable("provider_availability").update({ is_available: !avail.is_available }).eq("id", avail.id);
    if (selectedProvider) selectProvider(selectedProvider);
  };

  const updateTime = async (id: string, field: string, value: string) => {
    await fromTable("provider_availability").update({ [field]: value }).eq("id", id);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!selectedProvider) {
    return (
      <div className="px-4 py-4 space-y-3 pb-24">
        <h2 className="font-display text-lg font-bold">⚙️ Services & Availability</h2>
        <p className="text-xs text-muted-foreground">Select a provider to manage their services and schedule</p>
        <div className="space-y-2">
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => selectProvider(p)}
              className="w-full flex items-center gap-3 rounded-xl bg-card border border-border p-3 hover:bg-secondary/60 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={p.photo_url || undefined} />
                <AvatarFallback className="bg-secondary text-sm font-bold">{p.business_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-left flex-1">
                <p className="text-sm font-bold">{p.business_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.category.replace("_", " ")}</p>
              </div>
              {p.is_verified && <span className="text-xs text-primary font-bold">✔ Verified</span>}
            </button>
          ))}
          {providers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No providers registered</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <button onClick={() => setSelectedProvider(null)} className="text-xs text-muted-foreground hover:text-foreground">
        ← All Providers
      </button>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedProvider.photo_url || undefined} />
          <AvatarFallback className="bg-secondary font-bold">{selectedProvider.business_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-display text-lg font-bold">{selectedProvider.business_name}</h2>
          <p className="text-xs text-muted-foreground capitalize">{selectedProvider.category.replace("_", " ")}</p>
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1">
        <button onClick={() => setTab("services")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "services" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}>
          <Settings className="h-3.5 w-3.5 inline mr-1" /> Services ({services.length})
        </button>
        <button onClick={() => setTab("availability")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "availability" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}>
          <Calendar className="h-3.5 w-3.5 inline mr-1" /> Availability
        </button>
      </div>

      {tab === "services" && (
        <div className="space-y-3">
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>

          {showForm && (
            <div className="rounded-xl bg-card border border-border p-4 space-y-3">
              <Input placeholder="Service name" value={svcName} onChange={e => setSvcName(e.target.value)} />
              <Input placeholder="Description" value={svcDesc} onChange={e => setSvcDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Price (MKD)" value={svcPrice} onChange={e => setSvcPrice(e.target.value)} />
                <Input type="number" placeholder="Duration (min)" value={svcDuration} onChange={e => setSvcDuration(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddService} className="flex-1">Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {services.map(s => (
            <div key={s.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{s.service_name}</p>
                <p className="text-xs text-muted-foreground">{s.price} MKD • {s.duration} min</p>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteService(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {tab === "availability" && (
        <div className="space-y-2">
          {availability.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No availability configured</p>
          ) : (
            availability.map(a => (
              <div key={a.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{DAYS[a.day_of_week]}</span>
                  <Switch checked={a.is_available} onCheckedChange={() => toggleAvailability(a)} />
                </div>
                {a.is_available && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="time"
                      defaultValue={a.start_time}
                      onBlur={e => updateTime(a.id, "start_time", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      defaultValue={a.end_time}
                      onBlur={e => updateTime(a.id, "end_time", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceAvailabilityPanel;

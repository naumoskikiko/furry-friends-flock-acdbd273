import { useState } from "react";
import { Plus, Trash2, DollarSign, Clock, Edit2, X } from "lucide-react";
import type { CareService } from "@/hooks/useCare";

interface Props {
  services: CareService[];
  addService: (data: { service_name: string; description: string; price: number; duration: number }) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
}

const CareServicesTab = ({ services, addService, deleteService }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcDuration, setSvcDuration] = useState("30");

  const handleAdd = async () => {
    if (!svcName.trim() || !svcPrice) return;
    await addService({
      service_name: svcName.trim(),
      description: svcDesc.trim(),
      price: Number(svcPrice),
      duration: Number(svcDuration) || 30,
    });
    setSvcName(""); setSvcDesc(""); setSvcPrice(""); setSvcDuration("30");
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm font-bold text-primary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add Service
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">New Service</h3>
            <button onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="Service name *"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
          <input value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="Description"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
          <div className="flex gap-2">
            <input value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="Price (MKD)" type="number"
              className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
            <input value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} placeholder="Min" type="number"
              className="w-24 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold">Cancel</button>
            <button onClick={handleAdd} disabled={!svcName.trim() || !svcPrice}
              className="flex-1 petkeep-gradient rounded-xl py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">Add Service</button>
          </div>
        </div>
      )}

      {services.length === 0 && !showForm && (
        <div className="text-center py-8">
          <span className="text-3xl">🛠️</span>
          <p className="text-sm font-semibold mt-2">No services yet</p>
          <p className="text-xs text-muted-foreground">Add your first service to start receiving bookings</p>
        </div>
      )}

      {services.map((s) => (
        <div key={s.id} className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold">{s.service_name}</h3>
              {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-primary"><DollarSign className="h-3 w-3" /> {s.price} MKD</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration} min</span>
              </div>
            </div>
            <button onClick={() => deleteService(s.id)} className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CareServicesTab;

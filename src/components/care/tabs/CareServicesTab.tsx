import { useState } from "react";
import { Plus, Trash2, DollarSign, Clock, X, Package } from "lucide-react";
import type { CareService, TrainingPackage } from "@/hooks/useCare";

interface Props {
  services: CareService[];
  addService: (data: { service_name: string; description: string; price: number; duration: number }) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  isTrainer?: boolean;
  trainingPackages?: TrainingPackage[];
  addTrainingPackage?: (pkg: Partial<TrainingPackage>) => Promise<void>;
  deleteTrainingPackage?: (id: string) => Promise<void>;
}

const CareServicesTab = ({ services, addService, deleteService, isTrainer, trainingPackages = [], addTrainingPackage, deleteTrainingPackage }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcDuration, setSvcDuration] = useState("30");

  // Package form
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgSessions, setPkgSessions] = useState("5");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgDuration, setPkgDuration] = useState("60");

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

  const handleAddPackage = async () => {
    if (!pkgName.trim() || !pkgPrice || !addTrainingPackage) return;
    await addTrainingPackage({
      name: pkgName.trim(),
      description: pkgDesc.trim(),
      total_sessions: Number(pkgSessions) || 5,
      price: Number(pkgPrice),
      session_duration: Number(pkgDuration) || 60,
    });
    setPkgName(""); setPkgDesc(""); setPkgSessions("5"); setPkgPrice(""); setPkgDuration("60");
    setShowPkgForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Services section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {isTrainer ? "Training Sessions" : "Services"}
        </h3>

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm font-bold text-primary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Add {isTrainer ? "Session Type" : "Service"}
          </button>
        )}

        {showForm && (
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">New {isTrainer ? "Session Type" : "Service"}</h3>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder={isTrainer ? "e.g. Basic Obedience Session *" : "Service name *"}
              className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
            <input value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="Description"
              className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
            <div className="flex gap-2">
              <input value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="Price (MKD)" type="number"
                className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <select value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)}
                className="w-28 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none">
                <option value="30">30 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold">Cancel</button>
              <button onClick={handleAdd} disabled={!svcName.trim() || !svcPrice}
                className="flex-1 petkeep-gradient rounded-xl py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">Add</button>
            </div>
          </div>
        )}

        {services.length === 0 && !showForm && (
          <div className="text-center py-8">
            <span className="text-3xl">🛠️</span>
            <p className="text-sm font-semibold mt-2">No {isTrainer ? "session types" : "services"} yet</p>
            <p className="text-xs text-muted-foreground">Add your first to start receiving bookings</p>
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

      {/* Training packages section (trainers only) */}
      {isTrainer && (
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Training Packages
          </h3>

          {!showPkgForm && (
            <button onClick={() => setShowPkgForm(true)}
              className="w-full rounded-xl border-2 border-dashed border-primary/30 py-4 text-sm font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Create Package
            </button>
          )}

          {showPkgForm && (
            <div className="rounded-2xl bg-card border border-primary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">New Training Package</h3>
                <button onClick={() => setShowPkgForm(false)} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
              </div>
              <input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="e.g. Basic Obedience - 5 Sessions *"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="Description"
                className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-semibold">Sessions</label>
                  <select value={pkgSessions} onChange={(e) => setPkgSessions(e.target.value)}
                    className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none mt-1">
                    <option value="3">3 sessions</option>
                    <option value="5">5 sessions</option>
                    <option value="8">8 sessions</option>
                    <option value="10">10 sessions</option>
                    <option value="15">15 sessions</option>
                    <option value="20">20 sessions</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-semibold">Duration each</label>
                  <select value={pkgDuration} onChange={(e) => setPkgDuration(e.target.value)}
                    className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none mt-1">
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold">Total Package Price (MKD)</label>
                <input value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} placeholder="e.g. 3000" type="number"
                  className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none mt-1" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPkgForm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold">Cancel</button>
                <button onClick={handleAddPackage} disabled={!pkgName.trim() || !pkgPrice}
                  className="flex-1 petkeep-gradient rounded-xl py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">Create Package</button>
              </div>
            </div>
          )}

          {trainingPackages.length === 0 && !showPkgForm && (
            <div className="text-center py-6 rounded-xl bg-secondary/30">
              <span className="text-2xl">📦</span>
              <p className="text-xs font-semibold mt-1">No packages yet</p>
              <p className="text-[10px] text-muted-foreground">Create packages for recurring training clients</p>
            </div>
          )}

          {trainingPackages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" /> {pkg.name}
                  </h3>
                  {pkg.description && <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{pkg.price} MKD</span>
                    <span>{pkg.total_sessions} sessions</span>
                    <span>{pkg.session_duration} min each</span>
                  </div>
                </div>
                {deleteTrainingPackage && (
                  <button onClick={() => deleteTrainingPackage(pkg.id)} className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareServicesTab;

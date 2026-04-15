import { useState } from "react";
import { useMedications, MedicationInput, Medication } from "@/hooks/useMedications";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pill, Plus, Clock, Check, X, Trash2, AlertTriangle, ChevronDown, ChevronUp, History,
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  petId: string;
  petName: string;
}

const PetMedicationsSection = ({ petId, petName }: Props) => {
  const { medications, loading, addMedication, updateMedication, deleteMedication, markAsTaken, getTodaySchedule } = useMedications(petId);
  const { permissionStatus, enablePush, loading: pushLoading } = usePushNotifications();
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [form, setForm] = useState<MedicationInput>({
    pet_id: petId,
    medication_name: "",
    dosage: "",
    times: ["08:00"],
    start_date: new Date().toISOString().split("T")[0],
    end_date: null,
    repeat_type: "daily",
    repeat_days: [],
    notes: "",
  });

  const resetForm = () => {
    setForm({
      pet_id: petId, medication_name: "", dosage: "", times: ["08:00"],
      start_date: new Date().toISOString().split("T")[0], end_date: null,
      repeat_type: "daily", repeat_days: [], notes: "",
    });
    setShowAdd(false);
  };

  const handleAdd = async () => {
    if (!form.medication_name.trim()) return;
    await addMedication(form);
    resetForm();
  };

  const activeMeds = medications.filter(m => m.is_active);
  const inactiveMeds = medications.filter(m => !m.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Medications</p>
        </div>
        <div className="flex items-center gap-1">
          {permissionStatus !== "granted" ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={enablePush} disabled={pushLoading}>
              <BellOff className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> Enable Push
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-petkeep-green font-bold">
              <Bell className="h-3 w-3" /> Push On
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Medication Name</Label>
            <Input
              placeholder="e.g. Antibiotic"
              value={form.medication_name}
              onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dosage</Label>
            <Input
              placeholder="e.g. 1 pill, 5ml"
              value={form.dosage}
              onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          {/* Times */}
          <div className="space-y-1.5">
            <Label className="text-xs">Times</Label>
            <div className="flex flex-wrap gap-2">
              {form.times.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={t}
                    onChange={e => {
                      const newTimes = [...form.times];
                      newTimes[i] = e.target.value;
                      setForm(f => ({ ...f, times: newTimes }));
                    }}
                    className="h-8 text-xs w-28"
                  />
                  {form.times.length > 1 && (
                    <button onClick={() => setForm(f => ({ ...f, times: f.times.filter((_, j) => j !== i) }))} className="text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, times: [...f.times, "20:00"] }))}
                className="h-8 rounded-lg border border-dashed border-border px-2 text-[10px] text-muted-foreground hover:border-primary"
              >
                + Time
              </button>
            </div>
          </div>

          {/* Repeat */}
          <div className="space-y-1.5">
            <Label className="text-xs">Repeat</Label>
            <div className="flex gap-1.5">
              {["daily", "specific_days"].map(rt => (
                <button
                  key={rt}
                  onClick={() => setForm(f => ({ ...f, repeat_type: rt }))}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                    form.repeat_type === rt ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {rt === "daily" ? "Daily" : "Specific Days"}
                </button>
              ))}
            </div>
            {form.repeat_type === "specific_days" && (
              <div className="flex gap-1 mt-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({
                      ...f,
                      repeat_days: f.repeat_days?.includes(i)
                        ? f.repeat_days.filter(x => x !== i)
                        : [...(f.repeat_days || []), i],
                    }))}
                    className={`h-7 w-7 rounded-full text-[10px] font-bold ${
                      form.repeat_days?.includes(i) ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End (optional)</Label>
              <Input type="date" value={form.end_date || ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value || null }))} className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Input
              placeholder="e.g. Give with food"
              value={form.notes || ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 petkeep-gradient text-primary-foreground font-bold h-8 text-xs" onClick={handleAdd}>
              Save Medication
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
      ) : activeMeds.length === 0 && !showAdd ? (
        <div className="text-center py-4">
          <Pill className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">No medications yet</p>
        </div>
      ) : (
        <>
          {activeMeds.map(med => (
            <MedCard
              key={med.id}
              med={med}
              petName={petName}
              expanded={expandedId === med.id}
              onToggle={() => setExpandedId(expandedId === med.id ? null : med.id)}
              showHistoryId={showHistory}
              onToggleHistory={(id) => setShowHistory(showHistory === id ? null : id)}
              getTodaySchedule={getTodaySchedule}
              onMarkTaken={markAsTaken}
              onStop={() => updateMedication(med.id, { is_active: false })}
              onDelete={() => deleteMedication(med.id)}
            />
          ))}

          {inactiveMeds.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Stopped</p>
              {inactiveMeds.map(med => (
                <div key={med.id} className="flex items-center justify-between py-1.5 opacity-50">
                  <div className="flex items-center gap-2">
                    <Pill className="h-3.5 w-3.5" />
                    <span className="text-xs line-through">{med.medication_name}</span>
                  </div>
                  <button onClick={() => deleteMedication(med.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ── Individual medication card ── */
interface MedCardProps {
  med: Medication;
  petName: string;
  expanded: boolean;
  onToggle: () => void;
  showHistoryId: string | null;
  onToggleHistory: (id: string) => void;
  getTodaySchedule: (med: Medication) => { time: string; scheduledAt: string; status: string }[];
  onMarkTaken: (medId: string, scheduledAt: string) => void;
  onStop: () => void;
  onDelete: () => void;
}

const MedCard = ({ med, petName, expanded, onToggle, getTodaySchedule, onMarkTaken, onStop, onDelete }: MedCardProps) => {
  const schedule = getTodaySchedule(med);
  const allTaken = schedule.length > 0 && schedule.every(s => s.status === "taken");
  const hasOverdue = schedule.some(s => s.status === "overdue");

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      hasOverdue ? "border-destructive/30 bg-destructive/5" : allTaken ? "border-petkeep-green/30 bg-petkeep-green/5" : "border-border"
    }`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
            allTaken ? "bg-petkeep-green/20" : hasOverdue ? "bg-destructive/20" : "bg-primary/10"
          }`}>
            {allTaken ? <Check className="h-4 w-4 text-petkeep-green" /> : hasOverdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Pill className="h-4 w-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{med.medication_name}</p>
            <p className="text-[10px] text-muted-foreground">{med.dosage} • {med.times.join(", ")}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {/* Today's schedule */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today's Schedule</p>
          {schedule.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not scheduled for today</p>
          ) : (
            schedule.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold">{s.time}</span>
                  {s.status === "taken" && <span className="text-[10px] text-petkeep-green font-bold">✅ Given</span>}
                  {s.status === "overdue" && <span className="text-[10px] text-destructive font-bold">⚠️ Overdue</span>}
                  {s.status === "pending" && <span className="text-[10px] text-muted-foreground">Pending</span>}
                </div>
                {s.status !== "taken" && (
                  <Button
                    size="sm"
                    className="h-6 text-[10px] petkeep-gradient text-primary-foreground font-bold"
                    onClick={(e) => { e.stopPropagation(); onMarkTaken(med.id, s.scheduledAt); }}
                  >
                    Mark Given
                  </Button>
                )}
              </div>
            ))
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div>Repeat: <span className="font-bold text-foreground">{med.repeat_type === "daily" ? "Daily" : `${med.repeat_days?.map(d => DAYS[d]).join(", ")}`}</span></div>
            <div>Start: <span className="font-bold text-foreground">{med.start_date}</span></div>
            {med.end_date && <div>End: <span className="font-bold text-foreground">{med.end_date}</span></div>}
            {med.notes && <div className="col-span-2">Notes: <span className="font-bold text-foreground">{med.notes}</span></div>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={onStop}>
              Stop Medication
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/30" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetMedicationsSection;

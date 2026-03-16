import { useState } from "react";
import { Calendar, Clock, CheckCircle2, XCircle, MessageSquare, Filter } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import type { CareBooking } from "@/hooks/useCare";

interface Props {
  bookings: CareBooking[];
  updateBookingStatus: (id: string, status: string) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const CareBookingsTab = ({ bookings, updateBookingStatus }: Props) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl">📋</span>
          <p className="text-sm font-semibold mt-2">No {filter !== "all" ? filter : ""} bookings</p>
          <p className="text-xs text-muted-foreground">Bookings will appear here</p>
        </div>
      ) : filtered.map((b) => (
        <div key={b.id} className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={b.user_profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {b.user_profile?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold">{b.user_profile?.full_name || "User"}</p>
                <p className="text-[10px] text-muted-foreground">{b.service?.service_name}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusColors[b.status] || "bg-secondary"}`}>
              {b.status}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
            {b.service?.price && <span className="font-semibold text-foreground">{b.service.price} MKD</span>}
          </div>

          {b.pet && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5">
              {b.pet.photo_url ? (
                <img src={b.pet.photo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="text-sm">🐾</span>
              )}
              <span className="text-[11px] font-medium">{b.pet.name}</span>
              <span className="text-[10px] text-muted-foreground">({b.pet.animal_type}{b.pet.breed ? ` · ${b.pet.breed}` : ""})</span>
            </div>
          )}

          {b.notes && (
            <p className="mt-2 text-[11px] text-muted-foreground italic rounded-lg bg-secondary/50 p-2">📝 {b.notes}</p>
          )}

          {b.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => updateBookingStatus(b.id, "confirmed")}
                className="flex-1 petkeep-gradient rounded-xl py-2.5 text-xs font-bold text-primary-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Accept
              </button>
              <button onClick={() => updateBookingStatus(b.id, "cancelled")}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-destructive flex items-center justify-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> Decline
              </button>
            </div>
          )}
          {b.status === "confirmed" && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => updateBookingStatus(b.id, "completed")}
                className="flex-1 petkeep-gradient rounded-xl py-2.5 text-xs font-bold text-primary-foreground">Mark Complete</button>
              {b.conversation_id && (
                <button onClick={() => navigate("/messages")}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Chat
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CareBookingsTab;

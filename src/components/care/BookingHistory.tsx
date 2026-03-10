import { useState } from "react";
import { X, Calendar, Clock, MapPin, Star, MessageSquare, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyBookings, CATEGORIES } from "@/hooks/useCare";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BookingHistoryProps {
  onClose: () => void;
}

const BookingHistory = ({ onClose }: BookingHistoryProps) => {
  const { bookings, loading, cancelBooking } = useMyBookings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  const now = new Date().toISOString().split("T")[0];
  const filtered = bookings.filter((b) => {
    if (filter === "upcoming") return b.booking_date >= now && b.status !== "cancelled" && b.status !== "completed";
    if (filter === "past") return b.booking_date < now || b.status === "completed" || b.status === "cancelled";
    return true;
  });

  const handleCancel = async (bookingId: string) => {
    await cancelBooking(bookingId);
    toast({ title: "Booking cancelled" });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold">Care History</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-border">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>

        <div className="px-4 py-4 pb-24 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-2">📋</span>
              <p className="text-sm font-semibold">No bookings</p>
              <p className="text-xs text-muted-foreground mt-1">Your care appointments will appear here</p>
            </div>
          ) : filtered.map((b) => {
            const catInfo = CATEGORIES.find((c) => c.value === b.provider?.category);
            return (
              <div key={b.id} className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={b.provider?.photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      {catInfo?.icon || "🐾"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold truncate">{b.provider?.business_name || "Provider"}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[b.status] || "bg-secondary"}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.service?.service_name}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                    </div>
                    {b.pet && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                          🐾 {b.pet.name} ({b.pet.animal_type}{b.pet.breed ? ` · ${b.pet.breed}` : ""})
                        </span>
                      </div>
                    )}
                    {b.notes && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground italic">"{b.notes}"</p>
                    )}
                  </div>
                </div>
                {(b.status === "pending" || b.status === "confirmed") && (
                  <div className="flex gap-2 mt-3">
                    {b.conversation_id && (
                      <button onClick={() => { onClose(); navigate("/messages"); }}
                        className="flex-1 rounded-xl border border-border py-2 text-xs font-bold flex items-center justify-center gap-1 hover:bg-secondary transition-colors">
                        <MessageSquare className="h-3 w-3" /> Message
                      </button>
                    )}
                    <button onClick={() => handleCancel(b.id)}
                      className="flex-1 rounded-xl border border-destructive/30 py-2 text-xs font-bold text-destructive flex items-center justify-center gap-1 hover:bg-destructive/10 transition-colors">
                      <XCircle className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;

import { useState } from "react";
import { X, Calendar, Clock, MapPin, Star, MessageSquare, XCircle, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyBookings, useProviderServices, CATEGORIES, type CareBooking } from "@/hooks/useCare";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import BookingModal from "@/components/care/BookingModal";
import { format, differenceInHours, parseISO } from "date-fns";

interface BookingHistoryProps {
  onClose: () => void;
}

const BookingHistory = ({ onClose }: BookingHistoryProps) => {
  const { bookings, loading, cancelBooking } = useMyBookings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [rescheduleBooking, setRescheduleBooking] = useState<CareBooking | null>(null);

  const now = new Date();
  const nowStr = format(now, "yyyy-MM-dd");

  const filtered = bookings.filter((b) => {
    if (filter === "upcoming") return b.booking_date >= nowStr && b.status !== "cancelled" && b.status !== "completed";
    if (filter === "past") return b.booking_date < nowStr || b.status === "completed" || b.status === "cancelled";
    return true;
  });

  const canCancel = (b: CareBooking) => {
    if (b.status !== "pending" && b.status !== "confirmed") return false;
    const bookingDateTime = parseISO(`${b.booking_date}T${b.booking_time}`);
    return differenceInHours(bookingDateTime, now) >= 24;
  };

  const canReschedule = (b: CareBooking) => {
    if (b.status !== "pending" && b.status !== "confirmed") return false;
    const bookingDateTime = parseISO(`${b.booking_date}T${b.booking_time}`);
    return differenceInHours(bookingDateTime, now) >= 24;
  };

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

  const statusIcons: Record<string, string> = {
    pending: "⏳",
    confirmed: "✅",
    completed: "🎉",
    cancelled: "❌",
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold">My Bookings</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-border">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-all ${
                filter === f ? "petkeep-gradient text-primary-foreground shadow-md" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}>
              {f === "upcoming" ? "📅 Upcoming" : f === "past" ? "📋 Past" : "🗂️ All"}
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
              <span className="text-5xl mb-3">📋</span>
              <p className="text-base font-bold">No bookings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your care appointments will appear here</p>
            </div>
          ) : filtered.map((b) => {
            const catInfo = CATEGORIES.find((c) => c.value === b.provider?.category);
            const showCancel = canCancel(b);
            const showReschedule = canReschedule(b);

            return (
              <div key={b.id} className="rounded-2xl bg-card border border-border p-4 transition-all hover:shadow-sm">
                {/* Status badge top right */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={b.provider?.photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      {catInfo?.icon || "🐾"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold truncate">{b.provider?.business_name || "Provider"}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 ${statusColors[b.status] || "bg-secondary"}`}>
                        {statusIcons[b.status]} {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{b.service?.service_name}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                        <Calendar className="h-3 w-3" /> {b.booking_date}
                      </span>
                      <span className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                        <Clock className="h-3 w-3" /> {b.booking_time}
                      </span>
                    </div>

                    {b.pet && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
                          🐾 {b.pet.name}
                          <span className="text-muted-foreground">({b.pet.animal_type}{b.pet.breed ? ` · ${b.pet.breed}` : ""})</span>
                        </span>
                      </div>
                    )}

                    {b.notes && (
                      <p className="mt-2 text-[11px] text-muted-foreground italic bg-secondary/50 rounded-lg p-2">📝 {b.notes}</p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {(showCancel || showReschedule || b.conversation_id) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    {b.conversation_id && (
                      <button onClick={() => { onClose(); navigate("/messages"); }}
                        className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-secondary transition-colors">
                        <MessageSquare className="h-3.5 w-3.5" /> Message
                      </button>
                    )}
                    {showReschedule && b.provider && (
                      <button onClick={() => setRescheduleBooking(b)}
                        className="flex-1 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-bold text-primary flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors">
                        <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                      </button>
                    )}
                    {showCancel && (
                      <button onClick={() => handleCancel(b.id)}
                        className="flex-1 rounded-xl border border-destructive/30 py-2.5 text-xs font-bold text-destructive flex items-center justify-center gap-1.5 hover:bg-destructive/10 transition-colors">
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                )}

                {/* Cannot cancel/reschedule notice */}
                {(b.status === "pending" || b.status === "confirmed") && !showCancel && (
                  <p className="mt-2 text-[10px] text-muted-foreground text-center">⚠️ Cannot modify — less than 24h before appointment</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reschedule uses BookingModal with pre-filled provider/service */}
      {rescheduleBooking && rescheduleBooking.provider && rescheduleBooking.service && (
        <RescheduleWrapper
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onCancel={cancelBooking}
        />
      )}
    </div>
  );
};

/** Wrapper to load services and show BookingModal for rescheduling */
const RescheduleWrapper = ({
  booking,
  onClose,
  onCancel,
}: {
  booking: CareBooking;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
}) => {
  const { services } = useProviderServices(booking.provider_id);
  const { toast } = useToast();

  if (!booking.provider || !booking.service) return null;

  return (
    <BookingModal
      provider={booking.provider as any}
      initialService={booking.service}
      services={services.length > 0 ? services : [booking.service]}
      onClose={onClose}
      onSuccess={async () => {
        // Cancel the old booking
        await onCancel(booking.id);
        toast({ title: "Booking rescheduled! 🔄", description: "Old booking cancelled, new one created." });
      }}
    />
  );
};

export default BookingHistory;

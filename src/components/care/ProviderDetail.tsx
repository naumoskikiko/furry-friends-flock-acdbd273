import { useState, useEffect } from "react";
import {
  Star, BadgeCheck, MapPin, ChevronRight, Search, Clock, DollarSign,
  Calendar, ChevronLeft, X, MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import {
  useCareProviders, useProviderServices, useProviderReviews,
  useProviderAvailability, useBooking, useSubmitReview,
  generateTimeSlots, CATEGORIES, DAY_NAMES,
  type CareProvider, type CareService,
} from "@/hooks/useCare";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProviderDetailProps {
  provider: CareProvider;
  onClose: () => void;
}

const ProviderDetail = ({ provider, onClose }: ProviderDetailProps) => {
  const { user } = useAuth();
  const { services } = useProviderServices(provider.id);
  const { reviews, refresh: refreshReviews } = useProviderReviews(provider.id);
  const availability = useProviderAvailability(provider.id);
  const { createBooking } = useBooking();
  const { submitReview } = useSubmitReview();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"services" | "reviews" | "hours">("services");
  const [selectedService, setSelectedService] = useState<CareService | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const catInfo = CATEGORIES.find((c) => c.value === provider.category);

  // Available time slots for selected date
  const selectedDayOfWeek = bookingDate ? new Date(bookingDate).getDay() : -1;
  const dayAvail = availability.find((a) => a.day_of_week === selectedDayOfWeek && a.is_available);
  const timeSlots = dayAvail && selectedService
    ? generateTimeSlots(dayAvail.start_time, dayAvail.end_time, selectedService.duration)
    : [];

  const handleBook = async () => {
    if (!selectedService || !bookingDate || !bookingTime) return;
    setBooking(true);
    try {
      await createBooking(provider.id, selectedService.id, bookingDate, bookingTime, bookingNotes);
      toast({ title: "Booking confirmed!", description: `${selectedService.service_name} on ${bookingDate} at ${bookingTime}` });
      setSelectedService(null);
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
    } catch (e: any) {
      toast({ title: "Booking failed", description: e.message, variant: "destructive" });
    }
    setBooking(false);
  };

  const handleReview = async () => {
    const ok = await submitReview(provider.id, reviewRating, reviewComment);
    if (ok) {
      toast({ title: "Review submitted!" });
      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      refreshReviews();
    }
  };

  const isOwnProfile = user?.id === provider.user_id;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold truncate flex-1">Provider Profile</h1>
          {!isOwnProfile && (
            <button
              onClick={() => navigate("/messages")}
              className="rounded-full p-1.5 hover:bg-secondary"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Provider info */}
        <div className="px-4 py-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={provider.photo_url || provider.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xl font-bold text-primary-foreground">
                {catInfo?.icon || "🐾"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-extrabold truncate">{provider.business_name}</h2>
                {provider.is_verified && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  {Number(provider.avg_rating).toFixed(1)}
                </span>
                <span>({provider.total_reviews} reviews)</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">
                  {catInfo?.icon} {catInfo?.label || provider.category}
                </span>
                {provider.location && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {provider.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          {provider.description && (
            <p className="mt-3 text-sm text-muted-foreground">{provider.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["services", "reviews", "hours"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize transition-colors ${
                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              {t === "hours" ? "Hours" : t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 py-4 pb-24">
          {/* Services */}
          {tab === "services" && (
            <div className="space-y-3">
              {services.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No services listed yet</p>
              ) : services.map((s) => (
                <div key={s.id} className="rounded-2xl bg-card p-4 border border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold">{s.service_name}</h3>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {s.price} MKD
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {s.duration} min
                        </span>
                      </div>
                    </div>
                    {!isOwnProfile && (
                      <button
                        onClick={() => setSelectedService(selectedService?.id === s.id ? null : s)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                          selectedService?.id === s.id
                            ? "bg-secondary text-secondary-foreground"
                            : "petkeep-gradient text-primary-foreground"
                        }`}
                      >
                        {selectedService?.id === s.id ? "Cancel" : "Book"}
                      </button>
                    )}
                  </div>

                  {/* Booking form inline */}
                  {selectedService?.id === s.id && (
                    <div className="mt-4 pt-3 border-t border-border space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Select Date</label>
                        <input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => { setBookingDate(e.target.value); setBookingTime(""); }}
                          min={new Date().toISOString().split("T")[0]}
                          className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none"
                        />
                      </div>

                      {bookingDate && timeSlots.length > 0 && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Available Times</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {timeSlots.map((t) => (
                              <button
                                key={t}
                                onClick={() => setBookingTime(t)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  bookingTime === t
                                    ? "petkeep-gradient text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {bookingDate && timeSlots.length === 0 && (
                        <p className="text-xs text-muted-foreground">No available slots on this day</p>
                      )}

                      {bookingTime && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
                            <input
                              value={bookingNotes}
                              onChange={(e) => setBookingNotes(e.target.value)}
                              placeholder="Any special requirements..."
                              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <button
                            onClick={handleBook}
                            disabled={booking}
                            className="w-full petkeep-gradient rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {booking ? "Booking..." : `Confirm Booking — ${s.price} MKD`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reviews */}
          {tab === "reviews" && (
            <div className="space-y-3">
              {!isOwnProfile && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="w-full rounded-xl border border-dashed border-border py-3 text-xs font-bold text-primary hover:bg-secondary/30 transition-colors"
                >
                  Write a Review
                </button>
              )}

              {showReviewForm && (
                <div className="rounded-2xl bg-card p-4 border border-border space-y-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setReviewRating(s)}>
                        <Star className={`h-6 w-6 transition-colors ${s <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <input
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReviewForm(false)} className="flex-1 rounded-xl border border-border py-2 text-xs font-bold">Cancel</button>
                    <button onClick={handleReview} disabled={!reviewComment.trim()} className="flex-1 petkeep-gradient rounded-xl py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">Submit</button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No reviews yet</p>
              ) : reviews.map((r) => (
                <div key={r.id} className="rounded-2xl bg-card p-4 border border-border">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={r.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-xs font-bold">
                        {r.profile?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{r.profile?.full_name || "User"}</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-xs text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Hours */}
          {tab === "hours" && (
            <div className="space-y-2">
              {availability.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No hours set yet</p>
              ) : (
                DAY_NAMES.map((day, i) => {
                  const avail = availability.find((a) => a.day_of_week === i);
                  return (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 border border-border">
                      <span className="text-sm font-semibold">{day}</span>
                      {avail && avail.is_available ? (
                        <span className="text-xs text-muted-foreground">
                          {avail.start_time.slice(0, 5)} – {avail.end_time.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Closed</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderDetail;

import { useState, useEffect, useMemo } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, Clock, Coins, CreditCard,
  Calendar as CalendarIcon, FileText, Star, DollarSign, Loader2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useBooking, useProviderAvailability, generateTimeSlots, CATEGORIES, getBookingTypeForCategory, type CareProvider, type CareService, type BookingType } from "@/hooks/useCare";
import { useProcessPayment, calculateFees } from "@/hooks/usePayments";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateConversation } from "@/hooks/useMessages";
import { format, isBefore, startOfDay, isToday, addDays } from "date-fns";

interface BookingModalProps {
  provider: CareProvider;
  initialService?: CareService;
  services: CareService[];
  onClose: () => void;
  onSuccess?: () => void;
}

// Dynamic steps based on booking type
function getStepsForBookingType(bookingType: BookingType) {
  switch (bookingType) {
    case "date_range":
      return [
        { key: "service", label: "Service", icon: "🏷️" },
        { key: "dates", label: "Dates", icon: "📅" },
        { key: "details", label: "Details", icon: "📝" },
        { key: "review", label: "Confirm", icon: "✅" },
      ];
    case "time_slot":
      return [
        { key: "service", label: "Service", icon: "🏷️" },
        { key: "date", label: "Date", icon: "📅" },
        { key: "time", label: "Time", icon: "🕐" },
        { key: "details", label: "Details", icon: "📝" },
        { key: "review", label: "Confirm", icon: "✅" },
      ];
    case "date_range_with_time":
      return [
        { key: "service", label: "Service", icon: "🏷️" },
        { key: "dates", label: "Dates", icon: "📅" },
        { key: "time", label: "Time", icon: "🕐" },
        { key: "details", label: "Details", icon: "📝" },
        { key: "review", label: "Confirm", icon: "✅" },
      ];
    case "appointment":
    default:
      return [
        { key: "service", label: "Service", icon: "🏷️" },
        { key: "date", label: "Date", icon: "📅" },
        { key: "time", label: "Time", icon: "🕐" },
        { key: "details", label: "Details", icon: "📝" },
        { key: "review", label: "Confirm", icon: "✅" },
      ];
  }
}

const BookingModal = ({ provider, initialService, services, onClose, onSuccess }: BookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createBooking } = useBooking();
  const { processPayment } = useProcessPayment();
  const { balance: creditBalance, applyCreditsToPayment } = useCredits();
  const availability = useProviderAvailability(provider.id);

  const bookingType = getBookingTypeForCategory(provider.category);
  const STEPS = useMemo(() => getStepsForBookingType(bookingType), [bookingType]);

  const [step, setStep] = useState<number>(initialService ? 1 : 0);
  const [selectedService, setSelectedService] = useState<CareService | null>(initialService || null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [useCareCredits, setUseCareCredits] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userPets, setUserPets] = useState<{ id: string; name: string; animal_type: string; breed: string | null; photo_url: string | null }[]>([]);

  const catInfo = CATEGORIES.find((c) => c.value === provider.category);

  useEffect(() => {
    if (!user) return;
    supabase.from("pets").select("id, name, animal_type, breed, photo_url").eq("owner_id", user.id).then(({ data }) => {
      setUserPets(data || []);
    });
  }, [user]);

  // Available days set from provider availability
  const availableDays = useMemo(() => {
    return new Set(availability.filter((a) => a.is_available).map((a) => a.day_of_week));
  }, [availability]);

  // Disable dates that are in the past or unavailable
  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    return !availableDays.has(date.getDay());
  };

  // Time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const dayOfWeek = selectedDate.getDay();
    const dayAvail = availability.find((a) => a.day_of_week === dayOfWeek && a.is_available);
    if (!dayAvail) return [];
    return generateTimeSlots(dayAvail.start_time, dayAvail.end_time, selectedService.duration);
  }, [selectedDate, selectedService, availability]);

  // Price calculation
  const creditsApplied = useMemo(() => {
    if (!selectedService || !useCareCredits) return 0;
    return Math.min(creditBalance, selectedService.price);
  }, [selectedService, useCareCredits, creditBalance]);

  const finalPrice = selectedService ? Math.max(0, selectedService.price - creditsApplied) : 0;

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedService;
      case 1: return !!selectedDate;
      case 2: return !!selectedTime;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onClose();
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !user) return;
    setProcessing(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const result = await createBooking(provider.id, selectedService.id, dateStr, selectedTime, notes, selectedPetId || undefined);

      if (result?.id) {
        // Apply credits
        if (creditsApplied > 0) {
          await applyCreditsToPayment(creditsApplied);
        }
        await processPayment(result.id, provider.id, selectedService.price);

        // Send booking message
        try {
          const convId = await getOrCreateConversation(provider.user_id);
          const { sendBookingMessage } = await import("@/hooks/useMessages");
          await sendBookingMessage(convId, {
            booking_id: result.id,
            service_name: selectedService.service_name,
            date: dateStr,
            time: selectedTime,
            price: selectedService.price,
            pet_name: userPets.find(p => p.id === selectedPetId)?.name || undefined,
            status: "pending",
          });
        } catch (e) {
          console.error("Failed to send booking message", e);
        }
      }

      toast({
        title: "Booking confirmed! 🎉",
        description: `${selectedService.service_name} on ${format(selectedDate, "PPP")} at ${selectedTime}`,
      });
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Booking failed", description: e.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background sm:bg-background/80 sm:backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-card sm:rounded-3xl border-t sm:border border-border shadow-2xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col sm:animate-in sm:slide-in-from-bottom-4 sm:duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <button onClick={handleBack} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
            {step === 0 ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <h2 className="font-display text-base font-bold">Book Appointment</h2>
          <div className="w-8" />
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-all duration-300 ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`hidden sm:block w-8 h-0.5 transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <span key={s.key} className={`text-[9px] font-semibold transition-colors ${
                i <= step ? "text-primary" : "text-muted-foreground"
              }`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Step 0: Service selection */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold">Select a Service</p>
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className={`w-full rounded-2xl p-4 border-2 text-left transition-all ${
                    selectedService?.id === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold">{s.service_name}</h4>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                          <DollarSign className="h-3 w-3" /> {s.price} MKD
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.duration} min
                        </span>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedService?.id === s.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {selectedService?.id === s.id && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </div>
                  {/* Provider info */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={provider.photo_url || provider.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-[8px] font-bold">{catInfo?.icon}</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground">{provider.business_name}</span>
                    {provider.avg_rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                        {Number(provider.avg_rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Date selection */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-bold">Choose a Date</p>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                  disabled={isDateDisabled}
                  className="p-3 pointer-events-auto rounded-2xl border border-border"
                  classNames={{
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl",
                    day_today: "bg-accent/20 text-accent-foreground font-bold rounded-xl",
                    day: "h-10 w-10 p-0 font-medium rounded-xl hover:bg-secondary transition-colors aria-selected:opacity-100",
                    head_cell: "text-muted-foreground rounded-md w-10 font-semibold text-[0.75rem]",
                    cell: "h-10 w-10 text-center text-sm p-0 relative",
                    nav_button: "h-8 w-8 bg-secondary hover:bg-secondary/80 rounded-xl p-0 opacity-70 hover:opacity-100 transition-all",
                    caption_label: "text-sm font-bold",
                  }}
                />
              </div>
              {selectedDate && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Time selection */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-bold">Choose a Time</p>
              {selectedDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" /> {format(selectedDate, "EEEE, MMM d")}
                </p>
              )}
              {timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl">😔</span>
                  <p className="text-sm font-semibold mt-2">No available slots</p>
                  <p className="text-xs text-muted-foreground">Try selecting a different date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                        selectedTime === t
                          ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:border-primary/30 border border-transparent"
                      }`}
                    >
                      <Clock className={`h-3.5 w-3.5 mx-auto mb-1 ${selectedTime === t ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold">Add Details</p>

              {/* Pet selection */}
              {userPets.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Select Pet</label>
                  <div className="grid grid-cols-2 gap-2">
                    {userPets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => setSelectedPetId(selectedPetId === pet.id ? null : pet.id)}
                        className={`rounded-xl p-3 border-2 text-left transition-all flex items-center gap-2 ${
                          selectedPetId === pet.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {pet.photo_url ? (
                          <img src={pet.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm">🐾</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{pet.name}</p>
                          <p className="text-[10px] text-muted-foreground">{pet.animal_type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Notes for Provider
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pet behavior, special needs, medical info..."
                  rows={4}
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none resize-none placeholder:text-muted-foreground border border-transparent focus:border-primary/30 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & confirm */}
          {step === 4 && selectedService && selectedDate && (
            <div className="space-y-4">
              <p className="text-sm font-bold">Review & Confirm</p>

              {/* Booking summary */}
              <div className="rounded-2xl border border-border p-4 space-y-3">
                {/* Provider */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={provider.photo_url || provider.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      {catInfo?.icon || "🐾"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold">{provider.business_name}</p>
                    <p className="text-[10px] text-muted-foreground">{catInfo?.label}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-semibold">{selectedService.service_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-semibold">{format(selectedDate, "EEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-semibold">{selectedService.duration} min</span>
                  </div>
                  {userPets.find(p => p.id === selectedPetId) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pet</span>
                      <span className="font-semibold">🐾 {userPets.find(p => p.id === selectedPetId)?.name}</span>
                    </div>
                  )}
                  {notes && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Notes</span>
                      <span className="font-semibold text-right max-w-[60%] truncate">{notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Credits toggle */}
              {creditBalance > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold">Use Credits</p>
                      <p className="text-[9px] text-muted-foreground">{creditBalance.toFixed(2)} MKD available</p>
                    </div>
                  </div>
                  <Switch checked={useCareCredits} onCheckedChange={setUseCareCredits} />
                </div>
              )}

              {/* Price breakdown */}
              <div className="rounded-2xl bg-secondary/50 border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Price</span>
                  <span className="font-semibold">{selectedService.price} MKD</span>
                </div>
                {creditsApplied > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-primary font-bold flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" /> Credits Used
                    </span>
                    <span className="font-bold text-primary">-{creditsApplied.toFixed(2)} MKD</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-lg text-primary">{finalPrice.toFixed(0)} MKD</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed petkeep-gradient text-primary-foreground flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all disabled:opacity-60 petkeep-gradient text-primary-foreground flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Confirm Booking — {finalPrice.toFixed(0)} MKD
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;

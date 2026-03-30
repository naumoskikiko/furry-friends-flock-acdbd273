import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, CheckCircle2, XCircle, User, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string;
  user_id: string;
  provider_id: string;
  service_id: string;
  created_at: string;
  user_profile?: { full_name: string; avatar_url: string | null };
  provider?: { business_name: string; category: string };
  service?: { service_name: string; price: number };
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const BookingManagementPanel = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await fromTable("care_bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .limit(200);

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set((data as any[]).map((b: any) => b.user_id))];
    const providerIds = [...new Set((data as any[]).map((b: any) => b.provider_id))];
    const serviceIds = [...new Set((data as any[]).map((b: any) => b.service_id))];

    const [{ data: profiles }, { data: providers }, { data: services }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
      fromTable("care_providers").select("id, business_name, category").in("id", providerIds),
      fromTable("care_services").select("id, service_name, price").in("id", serviceIds),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    const providerMap = Object.fromEntries((providers || []).map((p: any) => [p.id, p]));
    const serviceMap = Object.fromEntries((services || []).map((s: any) => [s.id, s]));

    setBookings((data as any[]).map((b: any) => ({
      ...b,
      user_profile: profileMap[b.user_id],
      provider: providerMap[b.provider_id],
      service: serviceMap[b.service_id],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await fromTable("care_bookings").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Booking ${status}` });
      fetchBookings();
    }
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  // Calendar view - group by date
  const bookingsByDate = filtered.reduce((acc, b) => {
    const date = b.booking_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {} as Record<string, Booking[]>);

  const sortedDates = Object.keys(bookingsByDate).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">📋 All Bookings</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1 text-xs font-bold rounded-l-lg border ${view === "list" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}
          >List</button>
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1 text-xs font-bold rounded-r-lg border ${view === "calendar" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"}`}
          >Calendar</button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f as keyof typeof counts] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">📋</span>
          <p className="text-sm font-semibold mt-2">No {filter !== "all" ? filter : ""} bookings</p>
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-4">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                📅 {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <div className="space-y-2 ml-2 border-l-2 border-primary/20 pl-3">
                {bookingsByDate[date].sort((a, b) => a.booking_time.localeCompare(b.booking_time)).map(b => (
                  <div key={b.id} className="rounded-xl bg-card border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-bold">{b.booking_time}</span>
                        <span className="text-xs text-muted-foreground">— {b.service?.service_name}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusColors[b.status] || "bg-secondary"}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs text-muted-foreground">
                        👤 {b.user_profile?.full_name || "User"} → 🏥 {b.provider?.business_name || "Provider"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                className="w-full p-4 text-left"
              >
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
                      <p className="text-[10px] text-muted-foreground">{b.service?.service_name} • {b.provider?.business_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusColors[b.status] || "bg-secondary"}`}>
                      {b.status}
                    </span>
                    {expandedId === b.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                  {b.service?.price && <span className="font-semibold text-foreground">{b.service.price} MKD</span>}
                </div>
              </button>

              {expandedId === b.id && (
                <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                  {b.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Notes</p>
                      <p className="text-xs mt-0.5">{b.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(b.id, "confirmed")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => updateStatus(b.id, "rejected")}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <>
                        <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(b.id, "completed")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus(b.id, "cancelled")}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingManagementPanel;

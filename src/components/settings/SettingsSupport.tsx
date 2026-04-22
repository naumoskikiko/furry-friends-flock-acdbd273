import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, MessageSquare, AlertCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { APP_VERSION, APP_BUILD_ID, APP_BUILD_MODE, formatAppVersion } from "@/lib/appVersion";

const faqs = [
  { q: "How do I book a pet sitter?", a: "Go to the Care tab, browse available sitters, and tap 'Book' to start the booking process." },
  { q: "How do PetKeep Credits work?", a: "Credits are earned through referrals and promotions. You can use them toward booking payments." },
  { q: "How do I become a verified sitter?", a: "Go to Settings → Trust & Verification and upload your ID and any certifications." },
  { q: "Can I cancel a booking?", a: "Yes, you can cancel from the booking details page. Cancellation policies vary by sitter." },
  { q: "How do I report a problem?", a: "Use the 'Report a Problem' form below or contact support directly." },
];

const SettingsSupport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [sending, setSending] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!user || !subject.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      category,
    });
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket submitted!", description: "We'll get back to you soon." });
      setSubject("");
      setMessage("");
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* FAQ */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-1">
        <p className="text-sm font-bold mb-2 flex items-center gap-2"><HelpCircle className="h-4 w-4" /> FAQ</p>
        {faqs.map((faq, i) => (
          <button
            key={i}
            onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
            className="w-full text-left py-2.5 border-b border-border last:border-0"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold pr-2">{faq.q}</p>
              {expandedFaq === i ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
            {expandedFaq === i && (
              <p className="text-xs text-muted-foreground mt-1.5">{faq.a}</p>
            )}
          </button>
        ))}
      </div>

      {/* Contact / Report Form */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Contact Support</p>
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex gap-2 flex-wrap">
            {["general", "report", "dispute", "bug"].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                  category === cat ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue..." rows={4} maxLength={1000} />
          <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
        </div>
        <Button onClick={handleSubmit} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={sending}>
          {sending ? "Sending..." : "Submit Ticket"}
        </Button>
      </div>

      {/* About — version + build, also copied into every support ticket */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-2">
        <p className="text-sm font-bold flex items-center gap-2">
          <Info aria-hidden="true" className="h-4 w-4" /> About
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(formatAppVersion());
            toast({ title: "Version copied", description: formatAppVersion() });
          }}
          className="w-full text-left rounded-lg bg-secondary px-3 py-2 text-xs font-mono text-muted-foreground hover:bg-secondary/80 transition-colors"
          aria-label={`App version ${APP_VERSION}, build ${APP_BUILD_ID}. Tap to copy.`}
        >
          v{APP_VERSION} · {APP_BUILD_ID}
          {APP_BUILD_MODE !== "production" && (
            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
              {APP_BUILD_MODE}
            </span>
          )}
        </button>
        <p className="text-[11px] text-muted-foreground">
          Include this when contacting support — it speeds up triage.
        </p>
      </div>
    </div>
  );
};

export default SettingsSupport;

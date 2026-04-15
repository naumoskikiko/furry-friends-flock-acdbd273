import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

const REASONS = [
  "Spam",
  "Inappropriate content",
  "Fake profile",
  "Harassment",
  "Scam",
  "Other",
];

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId?: string;
  contentId?: string;
  contentType: "user" | "article" | "question" | "meetup" | "post" | "message";
}

const ReportModal = ({ open, onOpenChange, reportedUserId, contentId, contentType }: ReportModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      const { error } = await fromTable("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        content_id: contentId || null,
        content_type: contentType,
        reason,
        description: description.trim() || null,
      });

      if (error) {
        if (error.message?.includes("duplicate") || error.code === "23505") {
          toast({ title: "Already reported", description: "You've already reported this." });
        } else if (error.message?.includes("rate limit")) {
          toast({ title: "Rate limit", description: "Too many reports today. Try again tomorrow.", variant: "destructive" });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Report submitted", description: "Our team will review this shortly." });
      }
      onOpenChange(false);
      setReason("");
      setDescription("");
    } catch {
      toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report {contentType === "user" ? "User" : "Content"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Select a reason for your report. Our team will review it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left text-sm rounded-xl px-3 py-2.5 border transition-colors ${
                reason === r
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Describe the issue (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="resize-none"
          rows={3}
        />

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            variant="destructive"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReportModal;

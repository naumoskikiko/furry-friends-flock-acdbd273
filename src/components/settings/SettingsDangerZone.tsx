import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, LogOut, Trash2, Pause } from "lucide-react";

const SettingsDangerZone = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeactivate = () => {
    toast({ title: "Account deactivated", description: "Your account has been temporarily deactivated. Log in again to reactivate." });
    signOut();
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    // In production, this would trigger a backend function to clean up data
    toast({ title: "Account deletion requested", description: "Your account and data will be removed within 30 days." });
    setDeleting(false);
    setDeleteOpen(false);
    await signOut();
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border-2 border-destructive/20 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-bold text-destructive">Danger Zone</p>
        </div>
        <p className="text-xs text-muted-foreground">These actions are irreversible. Please proceed with caution.</p>

        {/* Deactivate */}
        <div className="rounded-xl bg-destructive/5 p-3">
          <div className="flex items-center gap-3">
            <Pause className="h-4 w-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Deactivate Account</p>
              <p className="text-xs text-muted-foreground">Temporarily disable your account</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleDeactivate}>
            Deactivate
          </Button>
        </div>

        {/* Delete */}
        <div className="rounded-xl bg-destructive/5 p-3">
          <div className="flex items-center gap-3">
            <Trash2 className="h-4 w-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Delete Account Permanently</p>
              <p className="text-xs text-muted-foreground">Remove all data, cancel bookings, and delete account</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" className="w-full mt-3" onClick={() => setDeleteOpen(true)}>
            Delete Account
          </Button>
        </div>
      </div>

      {/* Logout */}
      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Logout
      </Button>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data, pets, bookings, and credits will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Type <span className="font-bold">DELETE</span> to confirm:</p>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type DELETE" />
            <Button
              variant="destructive"
              className="w-full"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Permanently Delete My Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsDangerZone;

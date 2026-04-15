import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, LogOut, Trash2, Pause } from "lucide-react";

const SettingsDangerZone = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    navigate("/auth", { replace: true });
  };

  const handleDeactivate = async () => {
    setDeactivateOpen(false);
    toast({
      title: "Account deactivated",
      description: "Your account has been temporarily deactivated. Log in again to reactivate.",
    });
    await signOut();
    navigate("/auth", { replace: true });
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    toast({
      title: "Account deletion requested",
      description: "Your account and data will be removed within 30 days.",
    });
    setDeleting(false);
    setDeleteOpen(false);
    setConfirmText("");
    await signOut();
    navigate("/auth", { replace: true });
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
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => setDeactivateOpen(true)}
          >
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
      <Button variant="outline" className="w-full" onClick={() => setLogoutOpen(true)}>
        <LogOut className="h-4 w-4 mr-2" /> Logout
      </Button>

      {/* Logout Confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be temporarily disabled. You can reactivate it by logging in again. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All your data, pets, bookings, and credits will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">Type <span className="font-bold">DELETE</span> to confirm:</p>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsDangerZone;

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Upload, BadgeCheck, FileCheck } from "lucide-react";

const SettingsTrust = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  return (
    <div className="px-4 py-4 space-y-4">

      {/* Student Verification */}
      {profile?.role === "sitter" && (
        <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-petkeep-mint-light">
              <FileCheck className="h-5 w-5 text-petkeep-mint" />
            </div>
            <div>
              <p className="text-sm font-bold">Student Verification</p>
              <p className="text-xs text-muted-foreground">Upload student ID for badge</p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-2 text-sm flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${profile.is_student ? "bg-petkeep-green" : "bg-muted-foreground"}`} />
            {profile.is_student ? "Verified" : "Not verified"}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3">
            <Upload className="h-4 w-4 mr-1" /> Upload Student ID
          </Button>
        </div>
      )}

      {/* Professional Certification */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-petkeep-cream">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Professional Certification</p>
            <p className="text-xs text-muted-foreground">Upload pet care certifications</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full">
          <Upload className="h-4 w-4 mr-1" /> Upload Certificate
        </Button>
      </div>

      {/* Verified Badge */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <div className="flex items-center gap-3">
          <BadgeCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-bold">Request Verified Badge</p>
            <p className="text-xs text-muted-foreground">Complete all verifications to qualify</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => toast({ title: "Badge request submitted!" })}>
          Request Badge
        </Button>
      </div>
    </div>
  );
};

export default SettingsTrust;

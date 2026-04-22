import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Mic, Bell, Camera, Bluetooth, ShieldCheck, LucideIcon } from "lucide-react";

export type PermissionKind = "location" | "microphone" | "notifications" | "camera" | "bluetooth";

interface CopyConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  primaryLabel: string;
  secondaryLabel: string;
}

const COPY: Record<PermissionKind, CopyConfig> = {
  location: {
    icon: MapPin,
    title: "Allow location access",
    description:
      "PetKeep uses your location to show nearby vets, parks, sitters, and lost-pet alerts. We never share your location with other users without your permission.",
    bullets: [
      "Find pet-friendly places around you",
      "Tag posts and stories with your location",
      "Alert nearby owners if a pet goes missing",
    ],
    primaryLabel: "Allow location",
    secondaryLabel: "Not now",
  },
  microphone: {
    icon: Mic,
    title: "Allow microphone access",
    description:
      "PetKeep uses your microphone only when you tap-and-hold to record a voice message. Recording stops the moment you release the button.",
    bullets: [
      "Send voice messages in chats",
      "Recording is fully under your control",
      "Audio is never captured in the background",
    ],
    primaryLabel: "Allow microphone",
    secondaryLabel: "Not now",
  },
  notifications: {
    icon: Bell,
    title: "Stay in the loop",
    description:
      "Get notified about messages, booking confirmations, medication reminders, and lost-pet alerts. You can change this anytime in Settings.",
    bullets: [
      "New messages and reactions",
      "Booking confirmations and reminders",
      "Medication and care alerts",
    ],
    primaryLabel: "Enable notifications",
    secondaryLabel: "Maybe later",
  },
  camera: {
    icon: Camera,
    title: "Allow camera access",
    description:
      "PetKeep uses your camera so you can capture photos and videos for posts, stories, and pet profiles. Camera turns off when you leave the screen.",
    bullets: [
      "Take photos and record stories",
      "Update pet profile pictures",
      "Scan tracker QR codes",
    ],
    primaryLabel: "Allow camera",
    secondaryLabel: "Not now",
  },
  bluetooth: {
    icon: Bluetooth,
    title: "Allow Bluetooth access",
    description:
      "PetKeep uses Bluetooth to connect to PetTags and trackers near you. Scanning only runs while the FindMyPet screen is open.",
    bullets: [
      "Connect to PetTag trackers",
      "Update tracker firmware safely",
      "Detect nearby lost-pet beacons",
    ],
    primaryLabel: "Allow Bluetooth",
    secondaryLabel: "Not now",
  },
};

interface Props {
  kind: PermissionKind;
  open: boolean;
  onAllow: () => void;
  onDeny: () => void;
  customDescription?: ReactNode;
}

export function PermissionPrompt({ kind, open, onAllow, onDeny, customDescription }: Props) {
  const cfg = COPY[kind];
  const Icon = cfg.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDeny()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">{cfg.title}</DialogTitle>
          <DialogDescription className="text-center text-sm">
            {customDescription ?? cfg.description}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2">
          {cfg.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAllow} className="w-full">{cfg.primaryLabel}</Button>
          <Button variant="ghost" onClick={onDeny} className="w-full">{cfg.secondaryLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

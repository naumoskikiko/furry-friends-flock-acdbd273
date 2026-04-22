import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useTrackers, useTrackerSubscriptions } from "@/hooks/useTracking";
import { useFindMyPetAccess } from "@/hooks/useFindMyPetAccess";
import AddTrackerForm from "@/components/tracking/AddTrackerForm";
import TrackerDashboard from "@/components/tracking/TrackerDashboard";
import TrackerSubscriptionModal from "@/components/tracking/TrackerSubscriptionModal";
import FeatureLockedNotice from "@/components/tracking/FeatureLockedNotice";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, Plus, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const FindMyPetPage = () => {
  const { trackers, loading: trackLoading, addTracker } = useTrackers();
  const { isTrackerActive, getTrackerSub, activateTracker, renewTracker, loading: subLoading } = useTrackerSubscriptions();
  const { canTrack, canUseChip, loading: accessLoading } = useFindMyPetAccess();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);
  const [subModal, setSubModal] = useState<{ open: boolean; trackerId: string; petName: string; isRenewal: boolean }>({
    open: false, trackerId: "", petName: "", isRenewal: false,
  });

  if (trackLoading || subLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg p-4 space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  const selectedTracker = trackers.find((t) => t.id === selectedTrackerId) || null;

  // If selecting a tracker, check subscription first
  if (selectedTracker) {
    if (!isTrackerActive(selectedTracker.id)) {
      return (
        <AppLayout>
          <div className="mx-auto max-w-lg p-4 flex flex-col items-center pt-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold font-display">Subscription Expired</h2>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
              Your subscription for {selectedTracker.pet_name} has expired. Renew to continue using FindMyPet.
            </p>
            <Button
              onClick={() => setSubModal({ open: true, trackerId: selectedTracker.id, petName: selectedTracker.pet_name, isRenewal: true })}
              className="mt-4 rounded-xl petkeep-gradient"
            >
              Renew Subscription
            </Button>
            <button onClick={() => setSelectedTrackerId(null)} className="text-sm text-muted-foreground mt-3">
              ← Back to trackers
            </button>

            <TrackerSubscriptionModal
              open={subModal.open}
              onOpenChange={(o) => setSubModal(prev => ({ ...prev, open: o }))}
              petName={subModal.petName}
              isRenewal
              onSelect={async (plan) => {
                await renewTracker(subModal.trackerId, plan);
                toast.success("Subscription renewed!");
              }}
            />
          </div>
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <TrackerDashboard
          tracker={selectedTracker}
          onBack={() => setSelectedTrackerId(null)}
        />
      </AppLayout>
    );
  }

  if (showAddForm) {
    return (
      <AppLayout>
        <AddTrackerForm
          onSubmit={async (data) => {
            const newTracker = await addTracker(data);
            setShowAddForm(false);
            if (newTracker) {
              // Open subscription modal for new tracker
              setSubModal({ open: true, trackerId: newTracker.id, petName: data.pet_name, isRenewal: false });
            }
          }}
          onCancel={() => setShowAddForm(false)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Find My Pet</h1>
            <p className="text-sm text-muted-foreground">Track your pets in real time</p>
          </div>
          <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" />
            Add Tracker
          </Button>
        </div>

        {trackers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
              <PawPrint className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-lg font-bold font-display">No Trackers Yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Add your first pet tracker to start monitoring your pet's location.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="mt-4 rounded-xl">
              Add Pet Tracker
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {trackers.map((tracker) => {
              const active = isTrackerActive(tracker.id);
              const sub = getTrackerSub(tracker.id);
              return (
                <button
                  key={tracker.id}
                  onClick={() => setSelectedTrackerId(tracker.id)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 petkeep-card-shadow hover:bg-secondary/30 transition-colors text-left"
                >
                  {tracker.pet_photo ? (
                    <img src={tracker.pet_photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">
                      🐾
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{tracker.pet_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tracker.pet_type} • {tracker.tracker_device_id}
                    </p>
                    {/* Subscription status */}
                    <div className="flex items-center gap-1 mt-1">
                      {active ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] text-green-600 font-medium">Active</span>
                          {sub && (
                            <span className="text-[10px] text-muted-foreground ml-1 flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              until {format(new Date(sub.end_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-destructive" />
                          <span className="text-[10px] text-destructive font-medium">
                            {sub ? "Expired" : "No subscription"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TrackerSubscriptionModal
        open={subModal.open}
        onOpenChange={(o) => setSubModal(prev => ({ ...prev, open: o }))}
        petName={subModal.petName}
        isRenewal={subModal.isRenewal}
        onSelect={async (plan) => {
          if (subModal.isRenewal) {
            await renewTracker(subModal.trackerId, plan);
            toast.success("Subscription renewed!");
          } else {
            await activateTracker(subModal.trackerId, plan);
            toast.success("Tracker activated!");
          }
        }}
      />
    </AppLayout>
  );
};

export default FindMyPetPage;

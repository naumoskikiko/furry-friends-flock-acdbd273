import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useSubscription, useTrackers } from "@/hooks/useTracking";
import FindMyPetUpgrade from "@/components/tracking/FindMyPetUpgrade";
import AddTrackerForm from "@/components/tracking/AddTrackerForm";
import TrackerDashboard from "@/components/tracking/TrackerDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { PawPrint, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const FindMyPetPage = () => {
  const { hasSubscription, loading: subLoading, activate } = useSubscription();
  const { trackers, loading: trackLoading, addTracker, toggleLost } = useTrackers();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);

  if (subLoading || trackLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg p-4 space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!hasSubscription) {
    return (
      <AppLayout>
        <FindMyPetUpgrade onUpgrade={activate} />
      </AppLayout>
    );
  }

  const selectedTracker = trackers.find((t) => t.id === selectedTrackerId) || null;

  if (selectedTracker) {
    return (
      <AppLayout>
        <TrackerDashboard
          tracker={selectedTracker}
          onBack={() => setSelectedTrackerId(null)}
          onToggleLost={toggleLost}
        />
      </AppLayout>
    );
  }

  if (showAddForm) {
    return (
      <AppLayout>
        <AddTrackerForm
          onSubmit={async (data) => {
            await addTracker(data);
            setShowAddForm(false);
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
            {trackers.map((tracker) => (
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
                </div>
                {tracker.is_lost && (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive">
                    LOST
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FindMyPetPage;

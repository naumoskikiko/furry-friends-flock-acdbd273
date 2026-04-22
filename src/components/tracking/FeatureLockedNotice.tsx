import { Lock } from "lucide-react";

interface Props {
  feature?: string;
}

const FeatureLockedNotice = ({ feature = "This feature" }: Props) => {
  return (
    <div className="mx-auto max-w-lg p-6 flex flex-col items-center pt-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-bold font-display">{feature} is locked</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        This feature is not available for your account. Contact PetKeep support if you believe this is a mistake.
      </p>
    </div>
  );
};

export default FeatureLockedNotice;

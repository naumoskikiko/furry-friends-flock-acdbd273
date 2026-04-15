import { useState } from "react";
import { X } from "lucide-react";
import { legalPages } from "@/data/legalContent";
import { ScrollArea } from "@/components/ui/scroll-area";

type LegalKey = "terms" | "privacy";

interface TermsPreviewModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: LegalKey;
}

const TermsPreviewModal = ({ open, onClose, initialTab = "terms" }: TermsPreviewModalProps) => {
  const [activeTab, setActiveTab] = useState<LegalKey>(initialTab);

  if (!open) return null;

  const page = legalPages[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-background border shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("terms")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "terms"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "privacy"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Privacy Policy
            </button>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          <h3 className="font-display text-base font-bold mb-3">{page.title}</h3>
          <div className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed pb-4">
            {page.content}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TermsPreviewModal;

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { legalPages } from "@/data/legalContent";

type LegalPage = keyof typeof legalPages | null;

const SettingsLegal = () => {
  const [activePage, setActivePage] = useState<LegalPage>(null);

  if (activePage) {
    const page = legalPages[activePage];
    return (
      <div className="px-4 py-4">
        <button onClick={() => setActivePage(null)} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="font-display text-lg font-bold mb-4">{page.title}</h2>
        <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
          {page.content}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-1">
      {Object.entries(legalPages).map(([key, page]) => (
        <button
          key={key}
          onClick={() => setActivePage(key as LegalPage)}
          className="w-full text-left px-3 py-3 rounded-xl hover:bg-secondary transition-colors"
        >
          <p className="text-sm font-semibold">{page.title}</p>
        </button>
      ))}
    </div>
  );
};

export default SettingsLegal;

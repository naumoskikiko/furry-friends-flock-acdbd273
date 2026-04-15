import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CreditsPanel from "@/components/credits/CreditsPanel";
import { useLanguage } from "@/i18n/LanguageContext";

const CreditsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold">{t("credits.title")}</h1>
      </header>
      <div className="mx-auto max-w-lg pb-8">
        <CreditsPanel />
      </div>
    </div>
  );
};

export default CreditsPage;

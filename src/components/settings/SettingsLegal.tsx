import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const legalPages = {
  terms: { title: "Terms of Service", content: "Welcome to PetKeep. By using our platform, you agree to these Terms of Service.\n\n1. Account Responsibility\nYou are responsible for maintaining the security of your account credentials.\n\n2. Service Usage\nPetKeep connects pet owners with pet sitters. We facilitate but do not guarantee the quality of services provided.\n\n3. Payments\nAll payments are processed through our secure platform. Refund policies are outlined in our booking terms.\n\n4. Content\nUsers retain ownership of content they post. By posting, you grant PetKeep a license to display this content.\n\n5. Liability\nPetKeep is not liable for any damages arising from services booked through the platform.\n\n6. Termination\nWe reserve the right to terminate accounts that violate these terms.\n\nLast updated: March 2026" },
  privacy: { title: "Privacy Policy", content: "PetKeep Privacy Policy\n\nWe take your privacy seriously.\n\n1. Data Collection\nWe collect information you provide: name, email, location, pet details, and booking history.\n\n2. Data Usage\nYour data is used to provide and improve our services, match you with sitters, and process payments.\n\n3. Data Sharing\nWe do not sell your data. We share necessary information with sitters/owners for booking purposes.\n\n4. Data Security\nWe use industry-standard encryption and security practices.\n\n5. Your Rights\nYou can request data export or deletion at any time through Settings → Privacy.\n\n6. Cookies\nWe use essential cookies for authentication and preferences.\n\nLast updated: March 2026" },
  cookies: { title: "Cookie Policy", content: "Cookie Policy\n\nPetKeep uses cookies to improve your experience.\n\n1. Essential Cookies\nRequired for authentication and core functionality.\n\n2. Analytics Cookies\nHelp us understand how users interact with our platform.\n\n3. Preference Cookies\nStore your settings like theme and language preferences.\n\nYou can manage cookies through your browser settings.\n\nLast updated: March 2026" },
  guidelines: { title: "Community Guidelines", content: "PetKeep Community Guidelines\n\n1. Be Respectful\nTreat all community members with kindness and respect.\n\n2. Be Honest\nProvide accurate information about yourself and your pets.\n\n3. Safety First\nPrioritize the safety and wellbeing of all pets.\n\n4. No Discrimination\nWe do not tolerate discrimination of any kind.\n\n5. Report Issues\nReport any concerns through our support system.\n\n6. Professional Conduct\nSitters should maintain professional standards at all times.\n\nViolations may result in account suspension or termination.\n\nLast updated: March 2026" },
};

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

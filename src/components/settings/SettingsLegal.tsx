import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const legalPages = {
  terms: { title: "Terms of Service", content: "Terms of Service – PetKeep\n\nWelcome to PetKeep. By accessing or using our platform, you agree to these Terms of Service.\n\n1. Account Responsibility\nYou are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. PetKeep is not liable for any loss or damage resulting from unauthorized access to your account.\n\n2. Platform Role\nPetKeep is a platform that connects pet owners with service providers. We do not provide pet care services directly and do not guarantee the quality, safety, legality, or reliability of any services offered by users.\n\nAll interactions, bookings, and agreements are made at your own risk.\n\n3. User Responsibility\nUsers are solely responsible for:\n• Their actions and behavior\n• The accuracy of their information\n• Any agreements made with other users\n\nPetKeep is not responsible for disputes, damages, losses, injuries, or misconduct between users.\n\n4. Payments and Payouts\nAll payments are processed through the platform where applicable. PetKeep is not responsible for:\n• Payment failures\n• Incorrect payout details entered by users\n• Disputes between users regarding payments\n\nUsers are responsible for ensuring their financial information is accurate.\n\n5. Content\nUsers retain ownership of content they post. By posting content, you grant PetKeep a non-exclusive license to use, display, and distribute that content within the platform.\n\nUsers are fully responsible for the content they share.\n\n6. Limitation of Liability\nTo the maximum extent permitted by law, PetKeep shall not be liable for any:\n• Direct or indirect damages\n• Loss of profits, data, or reputation\n• Personal injury or property damage\n\narising from the use of the platform.\n\nAll services are provided \"as is\" without warranties of any kind.\n\n7. No Guarantees\nPetKeep does not guarantee:\n• Service quality\n• User behavior\n• Availability of the platform\n• Accuracy of listings or profiles\n\nUse of the platform is entirely at your own risk.\n\n8. Account Suspension & Termination\nWe reserve the right to suspend or terminate any account at our discretion, especially in cases of misuse, violations, or harmful behavior.\n\n9. Changes to Terms\nWe may update these Terms at any time. Continued use of the platform means you accept the updated Terms.\n\n10. Acceptance\nBy using PetKeep, you confirm that you have read, understood, and agreed to these Terms.\n\nLast updated: April 2026" },
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

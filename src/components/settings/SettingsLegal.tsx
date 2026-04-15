import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const legalPages = {
  terms: { title: "Terms of Service", content: "Terms of Service – PetKeep\n\nWelcome to PetKeep. By accessing or using our platform, you agree to these Terms of Service.\n\n1. Account Responsibility\nYou are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. PetKeep is not liable for any loss or damage resulting from unauthorized access to your account.\n\n2. Platform Role\nPetKeep is a platform that connects pet owners with service providers. We do not provide pet care services directly and do not guarantee the quality, safety, legality, or reliability of any services offered by users.\n\nAll interactions, bookings, and agreements are made at your own risk.\n\n3. User Responsibility\nUsers are solely responsible for:\n• Their actions and behavior\n• The accuracy of their information\n• Any agreements made with other users\n\nPetKeep is not responsible for disputes, damages, losses, injuries, or misconduct between users.\n\n4. Payments and Payouts\nAll payments are processed through the platform where applicable. PetKeep is not responsible for:\n• Payment failures\n• Incorrect payout details entered by users\n• Disputes between users regarding payments\n\nUsers are responsible for ensuring their financial information is accurate.\n\n5. Content\nUsers retain ownership of content they post. By posting content, you grant PetKeep a non-exclusive license to use, display, and distribute that content within the platform.\n\nUsers are fully responsible for the content they share.\n\n6. Limitation of Liability\nTo the maximum extent permitted by law, PetKeep shall not be liable for any:\n• Direct or indirect damages\n• Loss of profits, data, or reputation\n• Personal injury or property damage\n\narising from the use of the platform.\n\nAll services are provided \"as is\" without warranties of any kind.\n\n7. No Guarantees\nPetKeep does not guarantee:\n• Service quality\n• User behavior\n• Availability of the platform\n• Accuracy of listings or profiles\n\nUse of the platform is entirely at your own risk.\n\n8. Account Suspension & Termination\nWe reserve the right to suspend or terminate any account at our discretion, especially in cases of misuse, violations, or harmful behavior.\n\n9. Changes to Terms\nWe may update these Terms at any time. Continued use of the platform means you accept the updated Terms.\n\n10. Acceptance\nBy using PetKeep, you confirm that you have read, understood, and agreed to these Terms.\n\nLast updated: April 2026" },
  privacy: { title: "Privacy Policy", content: "PetKeep Privacy Policy\n\nWe value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and protect your information when you use PetKeep.\n\n1. Data We Collect\nWe may collect the following information:\n• Personal details (name, email address)\n• Profile information (location, pet details, profile content)\n• Booking and transaction history\n• Messages and interactions within the platform\n• Technical data (device, browser, IP address)\n\n2. How We Use Your Data\nWe use your data to:\n• Provide and operate the platform\n• Match users with pet sitters or services\n• Process bookings and payments\n• Improve app performance and user experience\n• Communicate with you about your account or activity\n\n3. Data Sharing\nWe do not sell your personal data.\n\nWe may share your data:\n• With other users (only necessary info for bookings/interactions)\n• With service providers (e.g. hosting, analytics, payments)\n• If required by law or legal process\n\n4. Data Security\nWe implement reasonable technical and organizational measures to protect your data. However, no system is 100% secure, and we cannot guarantee absolute security.\n\n5. Your Rights (GDPR)\nIf you are in the EU, you have the right to:\n• Access your data\n• Correct inaccurate data\n• Request deletion (\"Right to be forgotten\")\n• Export your data\n• Restrict or object to processing\n\nYou can manage most of these via: Settings → Privacy\n\n6. Data Retention\nWe retain your data only as long as necessary to provide our services or comply with legal obligations.\n\n7. Cookies\nWe use cookies to:\n• Maintain login sessions\n• Store preferences (e.g. language, settings)\n• Improve performance\n\nYou can control cookies through your browser settings.\n\n8. Third-Party Services\nWe may use third-party tools (e.g. analytics, payments). These services may process your data according to their own privacy policies.\n\n9. Children's Privacy\nPetKeep is not intended for children under 13 (or applicable local age). We do not knowingly collect data from children.\n\n10. Changes to This Policy\nWe may update this Privacy Policy at any time. Continued use of the platform means you accept the updated policy.\n\n11. Contact\nIf you have questions about this Privacy Policy, you can contact us through the app.\n\nLast updated: April 2026" },
  cookies: { title: "Cookie Policy", content: "Cookie Policy\n\nThis Cookie Policy explains how PetKeep uses cookies and similar technologies when you use our platform.\n\n1. What Are Cookies\nCookies are small text files stored on your device when you visit a website or use an application. They help us improve functionality, security, and user experience.\n\n2. Types of Cookies We Use\n\na) Essential Cookies\nThese cookies are necessary for the platform to function properly. They include:\n• Authentication (keeping you logged in)\n• Security features\n• Core app functionality\n\nThese cookies cannot be disabled.\n\nb) Analytics Cookies\nThese cookies help us understand how users interact with the platform, such as:\n• Pages visited\n• Features used\n• Performance issues\n\nThis helps us improve the app.\n\nc) Preference Cookies\nThese cookies store your settings, such as:\n• Language selection\n• Theme (light/dark mode)\n• Other user preferences\n\n3. How We Use Cookies\nWe use cookies to:\n• Provide essential platform functionality\n• Improve performance and usability\n• Remember your preferences\n• Analyze usage to enhance features\n\n4. Managing Cookies\nYou can control or disable cookies through your browser settings.\n\nNote: Disabling essential cookies may affect the functionality of the platform.\n\n5. Third-Party Cookies\nWe may use third-party services (such as analytics tools) that place cookies on your device. These third parties have their own privacy and cookie policies.\n\n6. Consent (Important for GDPR)\nBy using PetKeep, you agree to the use of cookies as described in this policy.\n\nWhere required, we will request your consent before using non-essential cookies.\n\n7. Changes to This Policy\nWe may update this Cookie Policy at any time. Continued use of the platform means you accept the updated version.\n\nLast updated: April 2026" },
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

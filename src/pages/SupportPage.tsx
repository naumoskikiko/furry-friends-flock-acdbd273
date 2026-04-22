import { Link } from "react-router-dom";
import { ArrowLeft, Mail, LifeBuoy, Trash2, MessageSquare, ShieldCheck } from "lucide-react";

/**
 * Public support landing page — required by the App Store / Play Store
 * because the developer support URL in our data-safety manifest must
 * resolve to a usable page even for signed-out reviewers.
 *
 * Includes the in-app account-deletion path PLUS a public mailto fallback
 * — Google Play requires both options for accounts that hold user data.
 */
const SupportPage = () => (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
          aria-label="Back to PetKeep"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="flex-1 font-display text-lg font-extrabold uppercase tracking-tight">
          Support
        </h1>
        <LifeBuoy className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4 pb-24">
      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-display text-base font-bold flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
          Contact us
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          For questions about your account, bookings, payments, or to report abuse:
        </p>
        <a
          href="mailto:support@petkeepapp.com"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          support@petkeepapp.com
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          We aim to reply within <strong>24 hours</strong> for safety reports and{" "}
          <strong>2 business days</strong> for everything else.
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border p-5" id="delete-account">
        <h2 className="font-display text-base font-bold flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          Delete your account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You can permanently delete your PetKeep account and all associated data
          at any time. There are two ways:
        </p>
        <ol className="mt-3 space-y-2 text-sm text-foreground/90 list-decimal pl-5">
          <li>
            <strong>In the app:</strong> Settings → Danger Zone → Delete Account.
            Your account and content are removed immediately.
          </li>
          <li>
            <strong>By email:</strong> Send a deletion request from your account
            email to{" "}
            <a
              href="mailto:support@petkeepapp.com?subject=Account%20deletion%20request"
              className="font-semibold text-primary hover:underline"
            >
              support@petkeepapp.com
            </a>
            . We process within 7 days and confirm by reply.
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Some records (e.g. transaction logs required for tax compliance) may be
          retained in anonymised form for the period required by law.
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-display text-base font-bold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          Report content or behaviour
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every post, profile, message and meetup has a <strong>🚨 Report</strong>{" "}
          option. Reports are reviewed by our moderation team within{" "}
          <strong>24 hours</strong>; serious safety issues are actioned faster.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You can also <strong>block</strong> any user from their profile to stop
          all interaction.
        </p>
      </section>

      <section className="rounded-2xl bg-card border border-border p-5">
        <h2 className="font-display text-base font-bold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Legal
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <li><Link to="/legal/terms" className="font-semibold text-primary hover:underline">Terms of Service</Link></li>
          <li><Link to="/legal/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link></li>
          <li><Link to="/legal/cookies" className="font-semibold text-primary hover:underline">Cookie Policy</Link></li>
          <li><Link to="/legal/guidelines" className="font-semibold text-primary hover:underline">Community Guidelines</Link></li>
        </ul>
      </section>
    </main>
  </div>
);

export default SupportPage;

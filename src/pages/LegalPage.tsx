import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { legalPages, CURRENT_TERMS_VERSION } from "@/data/legalContent";

/**
 * Public legal pages — Terms, Privacy, Cookies, Community Guidelines.
 *
 * These routes MUST be accessible without authentication because:
 *  1. Apple App Store / Google Play reviewers fetch the URLs from
 *     `public/.well-known/app-data-safety.json` to verify our declarations.
 *  2. Users contacting support about account deletion or data requests
 *     need a stable shareable URL outside the app.
 *  3. EU GDPR / CCPA require the policy to be reachable without an account.
 *
 * Slug → content mapping mirrors the keys in `legalContent.ts` plus a few
 * common aliases (`tos`, `pp`) so external links stay deep-linkable.
 */
const SLUG_MAP: Record<string, keyof typeof legalPages> = {
  terms: "terms",
  tos: "terms",
  privacy: "privacy",
  pp: "privacy",
  cookies: "cookies",
  guidelines: "guidelines",
  community: "guidelines",
  // EULA aliases the same Terms doc — Apple requires either the standard
  // EULA URL or a custom one. We point both to our single source of truth.
  eula: "terms",
};

const LegalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const key = slug ? SLUG_MAP[slug.toLowerCase()] : undefined;
  const page = key ? legalPages[key] : undefined;

  // Update <title> + meta description so SEO and store reviewers see a
  // descriptive tab name. Reset on unmount to avoid leaking into other routes.
  useEffect(() => {
    if (!page) return;
    const prevTitle = document.title;
    document.title = `${page.title} · PetKeep`;
    return () => {
      document.title = prevTitle;
    };
  }, [page]);

  if (!page) {
    // Unknown slug → bounce to /legal/terms so reviewers / users always land on
    // *something* useful instead of a generic 404.
    return <Navigate to="/legal/terms" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
            aria-label="Back to PetKeep"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg font-extrabold uppercase tracking-tight truncate">
              {page.title}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              PetKeep · Terms version {CURRENT_TERMS_VERSION}
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground/90 bg-transparent p-0 m-0">
            {page.content}
          </pre>
        </article>

        <nav aria-label="Other legal documents" className="mt-10 border-t border-border pt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Other documents
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(legalPages) as Array<keyof typeof legalPages>).map((k) => (
              <li key={k}>
                <Link
                  to={`/legal/${k}`}
                  className={`block rounded-xl border border-border px-3 py-2 text-xs font-semibold text-center transition-colors ${
                    k === key ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-secondary"
                  }`}
                >
                  {legalPages[k].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Questions? Email{" "}
          <a
            href="mailto:support@petkeepapp.com"
            className="font-semibold text-primary hover:underline"
          >
            support@petkeepapp.com
          </a>
        </p>
      </main>
    </div>
  );
};

export default LegalPage;

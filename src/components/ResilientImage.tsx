import { useState, useCallback, ImgHTMLAttributes, SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  /** Final fallback shown when retries fail. Defaults to a neutral placeholder. */
  fallbackSrc?: string;
  /** Number of automatic retry attempts before showing the fallback. Default 2. */
  maxRetries?: number;
}

const DEFAULT_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0e6d2' width='100' height='100'/%3E%3Cpath fill='%23c9b896' d='M50 30c-8 0-14 6-14 14s6 14 14 14 14-6 14-14-6-14-14-14zm0 36c-12 0-22 6-22 14v6h44v-6c0-8-10-14-22-14z'/%3E%3C/svg%3E";

/**
 * Image component that survives flaky CDNs and cellular dropouts.
 *
 * Why this matters: the default <img> just shows a broken-image icon if the
 * CDN hiccups. On mobile that's frequent (radio handover, captive portals,
 * 5xx from image transforms). We retry with a cache-busting query param,
 * then fall back to a neutral placeholder so the layout never collapses.
 *
 * Use everywhere we render user-uploaded media (avatars, post images, story
 * thumbnails, product photos). Native <img> is fine for static bundled assets.
 */
export function ResilientImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  maxRetries = 2,
  className,
  alt,
  ...rest
}: Props) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src as string | undefined);
  const [attempt, setAttempt] = useState(0);

  const handleError = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      // Already on the fallback → stop. Without this guard a broken fallback
      // would loop forever and pin the CPU.
      if (currentSrc === fallbackSrc) return;

      if (attempt < maxRetries && src) {
        // Cache-bust so the browser actually refetches instead of returning
        // the cached failure response.
        const sep = (src as string).includes("?") ? "&" : "?";
        setCurrentSrc(`${src}${sep}_retry=${attempt + 1}`);
        setAttempt((a) => a + 1);
      } else {
        setCurrentSrc(fallbackSrc);
      }
      // Keep the React `onError` handler off the public API for now — callers
      // that need bespoke handling can wrap this component.
      e.currentTarget.classList.add("opacity-90");
    },
    [attempt, currentSrc, fallbackSrc, maxRetries, src],
  );

  return (
    <img
      {...rest}
      src={currentSrc ?? fallbackSrc}
      alt={alt ?? ""}
      onError={handleError}
      className={cn("transition-opacity", className)}
      // `loading="lazy"` keeps off-screen images from competing for bandwidth
      // on the feed — a measurable cellular win on long scroll sessions.
      loading={rest.loading ?? "lazy"}
      // `decoding="async"` lets the browser decode off the main thread.
      decoding={rest.decoding ?? "async"}
    />
  );
}

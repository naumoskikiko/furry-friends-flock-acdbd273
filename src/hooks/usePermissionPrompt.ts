import { useState, useCallback, useRef } from "react";
import type { PermissionKind } from "@/components/permissions/PermissionPrompt";

const STORAGE_KEY = "petkeep:permission-prompt:dismissed";

function getDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setDismissed(kind: PermissionKind) {
  const map = getDismissed();
  map[kind] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // re-prompt at most once per day

/**
 * Gates a native permission request behind an explanatory sheet.
 * Apple/Google reject apps that fire cold OS prompts without context.
 *
 * Usage:
 *   const { promptProps, request } = usePermissionPrompt("location");
 *   const allowed = await request();
 *   if (allowed) navigator.geolocation.getCurrentPosition(...);
 *   ...
 *   <PermissionPrompt {...promptProps} />
 */
export function usePermissionPrompt(kind: PermissionKind) {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((allowed: boolean) => void) | null>(null);

  const request = useCallback((): Promise<boolean> => {
    // Skip the rationale if user already dismissed it recently — re-prompting
    // every interaction is itself a rejection reason.
    const dismissedAt = getDismissed()[kind];
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) {
      return Promise.resolve(false);
    }
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, [kind]);

  const handleAllow = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleDeny = useCallback(() => {
    setDismissed(kind);
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, [kind]);

  return {
    request,
    promptProps: {
      kind,
      open,
      onAllow: handleAllow,
      onDeny: handleDeny,
    },
  };
}

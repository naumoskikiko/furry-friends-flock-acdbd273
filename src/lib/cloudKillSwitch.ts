/**
 * Runtime kill-switch that neutralizes every Lovable Cloud (Supabase) call
 * when USE_LOVABLE_CLOUD is false.
 *
 * We monkey-patch the singleton supabase client (instead of editing the
 * auto-generated client.ts) and intercept window.fetch for any direct hits
 * to the project URL (edge functions, REST, auth, storage, realtime).
 *
 * All stubs return shape-compatible "empty/disabled" responses so existing
 * call-sites don't crash:
 *   • db queries  →  { data: [] | null, error: null }
 *   • auth        →  no session, mutations return a CloudDisabled error
 *   • storage     →  uploads/downloads return CloudDisabled error, getPublicUrl returns ""
 *   • functions   →  invoke returns CloudDisabled error
 *   • realtime    →  channel().on().subscribe() chain is a silent no-op
 */
import { supabase } from "@/integrations/supabase/client";
import { USE_LOVABLE_CLOUD } from "@/config/cloudFlag";

const DISABLED_ERR = {
  message: "Lovable Cloud is disabled (USE_LOVABLE_CLOUD=false)",
  name: "CloudDisabled",
  status: 503,
} as const;

/** Builds a chainable + awaitable PostgREST-style query stub. */
function makeQueryStub(): any {
  let single = false;
  const result = () =>
    Promise.resolve({
      data: single ? null : [],
      error: null,
      count: 0,
      status: 200,
      statusText: "OK",
    });

  const proxy: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return (res: any, rej: any) => result().then(res, rej);
      if (prop === "catch") return (rej: any) => result().catch(rej);
      if (prop === "finally") return (cb: any) => result().finally(cb);
      if (prop === "single" || prop === "maybeSingle") {
        return () => {
          single = true;
          return proxy;
        };
      }
      // every other chained method (.select/.eq/.order/.limit/.insert/.update/.delete/...) → self
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy;
}

let applied = false;

export function applyCloudKillSwitch() {
  if (USE_LOVABLE_CLOUD || applied) return;
  applied = true;

  // ---- Database / RPC ----------------------------------------------------
  (supabase as any).from = () => makeQueryStub();
  (supabase as any).rpc = () => makeQueryStub();
  (supabase as any).schema = () => supabase;

  // ---- Realtime ----------------------------------------------------------
  const noopChannel: any = {
    on: () => noopChannel,
    subscribe: (cb?: any) => {
      try {
        cb?.("SUBSCRIBED");
      } catch {}
      return noopChannel;
    },
    unsubscribe: () => Promise.resolve("ok"),
    send: () => Promise.resolve(),
    track: () => Promise.resolve(),
    untrack: () => Promise.resolve(),
    topic: "noop",
    state: "closed",
  };
  (supabase as any).channel = () => noopChannel;
  (supabase as any).removeChannel = () => Promise.resolve("ok");
  (supabase as any).removeAllChannels = () => Promise.resolve([]);
  (supabase as any).getChannels = () => [];

  // ---- Auth --------------------------------------------------------------
  const auth: any = supabase.auth;
  auth.getSession = async () => ({ data: { session: null }, error: null });
  auth.getUser = async () => ({ data: { user: null }, error: null });
  auth.onAuthStateChange = (cb: any) => {
    setTimeout(() => {
      try {
        cb?.("INITIAL_SESSION", null);
      } catch {}
    }, 0);
    return {
      data: {
        subscription: {
          id: "noop",
          callback: cb,
          unsubscribe: () => {},
        },
      },
    };
  };
  auth.signInWithPassword = async () => ({
    data: { user: null, session: null },
    error: DISABLED_ERR,
  });
  auth.signUp = async () => ({
    data: { user: null, session: null },
    error: DISABLED_ERR,
  });
  auth.signInWithOAuth = async () => ({
    data: { provider: "google", url: null },
    error: DISABLED_ERR,
  });
  auth.signInWithOtp = async () => ({ data: {}, error: DISABLED_ERR });
  auth.verifyOtp = async () => ({
    data: { user: null, session: null },
    error: DISABLED_ERR,
  });
  auth.signOut = async () => ({ error: null });
  auth.resetPasswordForEmail = async () => ({ data: {}, error: DISABLED_ERR });
  auth.updateUser = async () => ({ data: { user: null }, error: DISABLED_ERR });
  auth.setSession = async () => ({
    data: { session: null, user: null },
    error: DISABLED_ERR,
  });
  auth.refreshSession = async () => ({
    data: { session: null, user: null },
    error: null,
  });
  auth.exchangeCodeForSession = async () => ({
    data: { session: null, user: null },
    error: DISABLED_ERR,
  });

  // ---- Storage -----------------------------------------------------------
  const noopBucket: any = {
    upload: async () => ({ data: null, error: DISABLED_ERR }),
    uploadToSignedUrl: async () => ({ data: null, error: DISABLED_ERR }),
    download: async () => ({ data: null, error: DISABLED_ERR }),
    remove: async () => ({ data: null, error: DISABLED_ERR }),
    list: async () => ({ data: [], error: null }),
    createSignedUrl: async () => ({ data: null, error: DISABLED_ERR }),
    createSignedUrls: async () => ({ data: [], error: null }),
    createSignedUploadUrl: async () => ({ data: null, error: DISABLED_ERR }),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
    move: async () => ({ data: null, error: DISABLED_ERR }),
    copy: async () => ({ data: null, error: DISABLED_ERR }),
    update: async () => ({ data: null, error: DISABLED_ERR }),
  };
  (supabase.storage as any).from = () => noopBucket;
  (supabase.storage as any).listBuckets = async () => ({ data: [], error: null });
  (supabase.storage as any).getBucket = async () => ({ data: null, error: DISABLED_ERR });

  // ---- Edge functions ----------------------------------------------------
  (supabase.functions as any).invoke = async () => ({
    data: null,
    error: DISABLED_ERR,
  });

  // ---- Block any direct fetch() to the Cloud project URL ----------------
  // Catches push-notification pings, raw REST calls, edge function URLs
  // built manually with VITE_SUPABASE_PROJECT_ID, etc.
  const projectId = (import.meta as any)?.env?.VITE_SUPABASE_PROJECT_ID || "";
  const supaUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL || "";
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    const orig = window.fetch.bind(window);
    window.fetch = ((input: any, init?: any) => {
      const url =
        typeof input === "string"
          ? input
          : input?.url || (input instanceof URL ? input.toString() : "");
      const hitsCloud =
        (projectId && url.includes(`${projectId}.supabase.co`)) ||
        (projectId && url.includes(`${projectId}.functions.supabase.co`)) ||
        (supaUrl && url.startsWith(supaUrl));
      if (hitsCloud) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ error: "Lovable Cloud disabled" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return orig(input, init);
    }) as typeof window.fetch;
  }

  // eslint-disable-next-line no-console
  console.warn(
    "%c[CloudKillSwitch] Lovable Cloud is DISABLED — all backend calls are stubbed. Flip USE_LOVABLE_CLOUD in src/config/cloudFlag.ts to re-enable.",
    "color:#f59e0b;font-weight:bold"
  );
}

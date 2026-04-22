import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";

// Read the app version from package.json at build time. Falls back to "0.0.0"
// if the file can't be parsed for any reason — never block the build on this.
function readAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
    return typeof pkg.version === "string" && pkg.version.length > 0 ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const appVersion = readAppVersion();
  // Short build identifier — useful for distinguishing two builds with the
  // same semver. Prefer a commit SHA when available (CI / native build),
  // otherwise an ISO timestamp so Xcode/Logcat lines remain unique.
  const buildId =
    process.env.LOVABLE_BUILD_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    new Date().toISOString();

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
    },
    build: {
      // Mobile cold-starts are network-bound — splitting heavy, route-specific
      // libraries into their own chunks lets the browser cache them between
      // releases and keeps the initial JS small.
      //
      // Each entry below was chosen because it is:
      //   - Large (>40 KB minified) AND
      //   - Used by a small number of routes (so it doesn't bloat the main bundle)
      //
      // Keep this list short — over-splitting hurts HTTP/2 multiplexing on slow
      // connections. Only add a chunk when bundle analysis shows real savings.
      rollupOptions: {
        output: {
          manualChunks: {
            // Map stack — only loaded on Explore, Tracking, Stories map, business address picker
            leaflet: ["leaflet", "leaflet-rotate"],
            // Push notifications — only loaded after the user opts in
            firebase: ["firebase/app", "firebase/messaging"],
            // Charts — only loaded in admin/professional dashboards
            charts: ["recharts"],
            // QR codes — only loaded in 2FA setup screen
            qrcode: ["qrcode.react"],
            // Carousel — only loaded in product gallery and stories
            carousel: ["embla-carousel-react"],
            // Date utilities — wide footprint, dedupe into one chunk
            "date-fns": ["date-fns"],
          },
        },
      },
      // Bump the inline-asset limit a bit so tiny SVG icons don't generate
      // extra HTTP requests but bigger images still get hashed filenames.
      assetsInlineLimit: 4096,
      // Hard-fail the build if a single chunk exceeds 1 MB — that almost
      // always means a heavy lib leaked into the main bundle.
      chunkSizeWarningLimit: 1000,
    },
    define: {
      // Exposed to client code as `import.meta.env.VITE_APP_VERSION` etc.
      // Stringified so they're inlined as JS literals.
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
      "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(buildId.slice(0, 12)),
      "import.meta.env.VITE_APP_BUILD_MODE": JSON.stringify(mode),
    },
  };
});

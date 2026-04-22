---
name: Bundle & Performance Audit
description: Vite manual chunks for heavy libs, lazy-loaded settings sections, and lazy/async-decoded images for store-grade cold start
type: feature
---
# Bundle & Performance Audit

App Store / Play Store reviewers and slow-cellular users punish heavy initial JS. Three layers keep us lean.

## 1. Manual chunks (`vite.config.ts → build.rollupOptions.output.manualChunks`)

Heavy libs are split into separate hashed chunks so the browser caches them across releases and only downloads them on routes that need them.

| Chunk | Libs | Routes |
|------|------|--------|
| `leaflet` | leaflet, leaflet-rotate (~171 KB) | Explore, Tracking, Stories, Address picker |
| `firebase` | firebase/app, firebase/messaging (~80 KB) | After push opt-in |
| `charts` | recharts (~142 KB) | Admin dashboards only |
| `qrcode` | qrcode.react (~17 KB) | 2FA setup only |
| `carousel` | embla-carousel-react | Product gallery, stories |
| `date-fns` | date-fns (~28 KB) | Shared utility |

**Rule**: only add a chunk when bundle analysis shows >40 KB minified AND limited route footprint. Over-splitting hurts HTTP/2 multiplexing.

`chunkSizeWarningLimit: 1000` fails the build if any single chunk exceeds 1 MB — early signal that a heavy lib leaked into the main bundle.

## 2. In-page lazy sections (`src/pages/SettingsPage.tsx`)

Settings sections (especially `ProfessionalMode`, which pulls every admin panel) are wrapped in `React.lazy` + `Suspense`. The Settings landing chunk dropped from **290 KB → 9 KB**; the 231 KB admin chunk only loads when an admin taps "Professional Mode".

Apply the same pattern to any page that branches into multiple heavy sub-views.

## 3. Lazy + async-decoded images

Every `<img>` in scroll-heavy lists has `loading="lazy" decoding="async"`. `<ResilientImage>` defaults both already; raw `<img>` tags in lists were swept via a one-off script (`/tmp/lazy_imgs.py`).

**When adding a new `<img>`**:
- Inside a feed/list/grid → use `<ResilientImage>` OR add `loading="lazy" decoding="async"`.
- Above-the-fold hero → leave default (`loading="eager"`), but still add `decoding="async"`.

## Verification

After any dependency change or new page, rerun `npx vite build` and check the chunk size table. Main bundle target: ≤200 KB gzipped.

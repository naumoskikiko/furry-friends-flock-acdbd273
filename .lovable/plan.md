# PetKeep — Full Application Spec Pack

Generate a structured set of Markdown documents under `/mnt/documents/petkeep-spec/` that fully describe the app so another AI can understand its scope, architecture, data model, and every feature. Each doc is written as a self-contained prompt-style brief (context → purpose → behavior → data → key code refs → edge cases), with code excerpts where useful.

## Deliverables

A downloadable folder (zipped) containing:

```
petkeep-spec/
  00_OVERVIEW.md                 # Vision, stack, roles, monetization, regional scope
  01_ARCHITECTURE.md             # Vite + React + Capacitor, routing, providers, error/crash flow
  02_DESIGN_SYSTEM.md            # Tailwind tokens, brand colors, typography, mobile UX gestures
  03_DATA_MODEL.md               # All Supabase tables, columns, relationships, RLS summary
  04_AUTH_AND_ROLES.md           # Owner/Admin/Business/Provider/User, has_role(), 2FA, providers
  05_BACKEND_EDGE_FUNCTIONS.md   # Every supabase/functions/* (purpose, inputs, outputs, secrets)
  06_REALTIME_AND_CACHING.md     # Channel sharing registry, SWR cache, infinite scroll batching
  07_NETWORK_AND_OFFLINE.md      # fetchWithTimeout, retry, ResilientImage, OfflineBanner
  08_OBSERVABILITY.md            # crashReporter, breadcrumbs, ingest-crash, /status, health fn
  09_SECURITY_BASELINE.md        # RLS, store_order_items_safe, edge_rate_limits, HIBP check
  10_NATIVE_AND_CAPACITOR.md     # capacitor.config, plugins, back button, push, BLE, geolocation

  features/
    feed_social.md               # Posts, likes, comments, optimistic UI, video/photo creation
    stories.md                   # 24h expiry, viewer, location map, drawing canvas
    blog_meetups.md              # Articles, Q&A, MeetUPs, group chats, phased cleanup
    explore_map.md               # Leaflet refs, fullscreen map, follow-my-location, blue dot
    care_system.md               # 5-step booking wizard, categories, scheduling, verification
    care_admin.md                # Suspend/ban providers, reports
    marketplace_vault.md         # PetVault, Wolt-style checkout, ranking algorithm
    marketplace_boost.md         # Visibility multipliers
    cart_checkout_orders.md      # Slide-to-pay, saved cards, hidden 10% platform fee
    payments_credits.md          # Stripe + CPay/Halkbank/NLB, 1 credit = 1 MKD, 4% cap
    rewards_economy.md           # Ad rewards, daily/monthly limits
    petmatch.md                  # Breed-priority matching, like/skip, verification gates
    shelter_adoption.md          # Non-commercial adoption flow
    tracking_findmypet.md        # 50m safe zones, BLE tag, €5/mo gating
    medications.md               # Reminders via FCM + minutely cron
    messaging.md                 # client_temp_id optimistic, drafts, interactive previews
    notifications.md             # Smart grouping, push/email/sms toggles
    profile_pets.md              # Inline editing, dynamic safety checklist, post viewer
    settings_hub.md              # Sections, language, font size, privacy, support
    professional_mode.md         # Owner/Admin operations hub
    discovery_explore.md         # Vets/Stores/Parks/Cafes only; tuning panel
    tags_search.md               # /tag/:tag, /post/:id, /user/:username
    legal_support_status.md      # Public legal/support/status routes for store reviewers
    accessibility.md             # WCAG 2.1 AA patterns
    analytics_privacy.md         # Opt-out telemetry

  hooks/                         # One file per src/hooks/*.ts — signature, behavior, deps
    useFeed.md, useMessages.md, useCare.md, useCart.md, useOrders.md,
    useUserLocation.md, useTracking.md, useStories.md, useNotifications.md,
    useCredits.md, usePayments.md, useBoosts.md, useRankedBusinesses.md, ... (all of them)

  components/                    # Grouped briefs (not one per file — would be too many)
    explore_components.md        # ExploreMap, FullscreenMap, NearbySection, SearchFilterModal
    feed_components.md           # FeedHeader, FeedPostCard, PostCard, StoriesBar, HeartAnimation
    messages_components.md       # ChatView, ConversationList, voice/forward/share modals
    marketplace_components.md    # ProductImage, Gallery, BoostBadge, SlideToPayButton
    care_components.md           # ProviderDashboard, BookingModal, all care/tabs/*
    profile_components.md        # AddPetFlow, PetProfileModal, PostScrollViewer, editors
    business_components.md       # BusinessDashboard + dashboard tabs
    stories_components.md        # CreateStoryModal, Viewer, DrawingCanvas, LocationMap
    tracking_components.md       # AddTrackerForm, BLEScanner, SafeZonePanel, dashboard, upgrade
    settings_components.md       # All src/components/settings/*
    shared_ui.md                 # ResilientImage, RetryableError, OfflineBanner, ErrorBoundary, etc.

  lib/                           # One file per src/lib/* — analytics, crashReporter, networkClient,
                                 # paymentGateway, rankingAlgorithm, petMatchAlgorithm,
                                 # mapMarkerIcon, userLocationMarker, bleService, firebase, cache, ...

  pages/                         # One file per src/pages/* — route, data deps, components used

  INDEX.md                       # Master table of contents linking every file
```

## Per-file template (used by the generator)

```
# <Name>

## Purpose
One paragraph: what it does and why it exists.

## Where it lives
File paths + route(s) if applicable.

## Inputs / Props / Params
Bulleted, typed.

## Behavior
Step-by-step description an AI can re-implement from.

## Data & side effects
Tables touched, RLS notes, realtime channels, edge functions called.

## Key code (excerpt)
Short snippet (≤30 lines) showing the critical logic.

## Edge cases / known constraints
From memory: optimistic UI, gesture preservation, 1000-row limit, etc.

## Related
Links to sibling spec files.
```

## How it will be generated

A Node script walks the repo:
1. Reads `src/pages/*`, `src/hooks/*`, `src/components/**`, `src/lib/*`, `supabase/functions/*`.
2. For each target, extracts: exported symbols, JSDoc, top-of-file comments, imports (to map data deps), and a 20–30 line representative excerpt.
3. Cross-references the memory index (vision, features, tech, style, auth, constraints) and inlines relevant rules into each doc's "Edge cases" section.
4. Pulls the live DB schema via `supabase--read_query` against `information_schema` to populate `03_DATA_MODEL.md` (tables, columns, FKs) plus a summarized RLS list from `pg_policies`.
5. Writes all `.md` files, builds `INDEX.md`, then zips to `/mnt/documents/petkeep-spec.zip`.

## Output

- `/mnt/documents/petkeep-spec/` (browsable)
- `/mnt/documents/petkeep-spec.zip` (single download)
- A `<lov-artifact>` link to the zip.

## Notes / scope choices

- One doc per **hook**, **page**, **edge function**, **lib module**, and **feature**. Components are grouped by domain (≈12 files) to avoid 150+ near-duplicate files; if you want one-per-component instead, say so.
- No business-logic changes. Read-only generation.
- Estimated ~120–160 markdown files, ~400–700 KB total.

Confirm and I'll generate the pack. Reply with any of:
- "go" → generate as planned
- "one file per component too" → expand components/ to per-file
- "skip the zip" → leave only the folder

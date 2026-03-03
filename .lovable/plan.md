

# PetKeep — Sectioned Execution Plan

The full feature set is broken into 6 executable sections. Each section delivers working functionality before moving to the next.

---

## Section 1: Authentication & Database Foundation
**Requires: Lovable Cloud enabled first**

- Create Supabase database schema: `profiles`, `user_roles`, `pets`, `sitter_profiles`, `credits`, `credit_transactions`, `followers`
- RLS policies on all tables
- Storage buckets for avatars and pet photos
- Auth pages: Login (email/password), Sign Up (with role selection: Owner/Sitter), Forgot Password, Reset Password
- Auto-create profile on signup via database trigger
- Protected routes — unauthenticated users redirected to `/auth`
- Profile page becomes functional: edit name/bio/location, upload avatar

## Section 2: Pet Management & Profile Features
- Full CRUD for pets (add/edit/delete with photo upload)
- Pet mini-profiles with breed, age, weight, medical notes
- Followers/following system (follow/unfollow, clickable lists)
- Share Profile (copy link)
- Credits wallet page with balance and transaction history
- Reviews page showing star breakdown and written reviews

## Section 3: Booking & Sitter Marketplace
- Sitter profile pages with availability, pricing, services
- Care page filters: price range, rating, student badge, service type
- Calendar-based booking flow with price calculation
- Booking status management (pending → confirmed → active → completed → cancelled)
- Home dashboard shows active/upcoming bookings
- Tables: `bookings`, `reviews`, `availability`

## Section 4: Real-Time Messaging
- Tables: `conversations`, `messages`
- Conversation list with unread indicators
- Real-time chat using Supabase realtime subscriptions
- Image sharing in chat
- Booking reference cards in conversations
- Auto-open chat after booking confirmation

## Section 5: Settings & Admin
- Full settings page: account, notifications, privacy, security, danger zone
- Dark mode toggle
- Admin panel (role-gated): user management, student verification, analytics dashboard
- Admin role assignment via `user_roles` table

## Section 6: Advanced Features
- Emergency "Find Immediate Help" button
- SOS during active booking
- Referral system with unique codes
- Achievement badges for sitters
- "Top Sitter of the Month" highlight
- In-app announcements banner
- Smart discovery with map view placeholders

---

## To Start Section 1

I need you to **enable Lovable Cloud** first. Click the Cloud icon in the left sidebar, or I can guide you through it. Once Cloud is enabled, I will immediately begin implementing the database schema, auth system, and functional profile page.


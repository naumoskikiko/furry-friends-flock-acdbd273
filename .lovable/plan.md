
The user wants to hide the Lovable badge. They've confirmed and noted the domain is petkeepapp.com.

**Plan:**
1. Call `publish_settings--set_badge_visibility` with `hide_badge: true` to hide the badge across all deployments (lovable.app subdomain + custom domains petkeepapp.com / www.petkeepapp.com).
2. Confirm to user. Note: requires Pro plan — if not on Pro, the toggle will fail and I'll point them to https://lovable.dev/pricing.

The badge setting is project-wide and applies to all connected domains automatically, so no per-domain action is needed.

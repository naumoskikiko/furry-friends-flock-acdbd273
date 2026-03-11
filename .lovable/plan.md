

## Plan: Owner Role with Full Role Control

### Overview
Add an "owner" value to the `app_role` enum, assign it to your account, create an `is_owner` check, build a Role Management panel in Professional Mode, and restrict admin capabilities.

### Database Changes (1 migration)

1. **Add "owner" to `app_role` enum**: `ALTER TYPE public.app_role ADD VALUE 'owner';`
2. **Insert owner role** for `hristijannaumoski3@gmail.com` (user_id `9bce8224-8080-43a1-9fce-16cd183eeeaa`) into `user_roles`
3. **Create `has_role_owner` helper function** — security definer function that checks specifically for owner role
4. **Update RLS on `user_roles`** table:
   - SELECT: owners can see all rows, others can see their own
   - INSERT/UPDATE/DELETE: only owner role can modify roles
5. **Add RLS policy** so owners can do everything admins can (owner inherits admin powers)

### New Hook: `useIsOwner`
- File: `src/hooks/useIsOwner.ts`
- Calls `has_role` with `'owner'` role
- Returns `{ isOwner, loading }`

### Update `useIsAdmin` Hook
- Return true for both `admin` AND `owner` roles (owner inherits admin access)
- Check both roles via two RPC calls or a single query to `user_roles`

### New Component: Role Management Panel
- File: `src/components/settings/RoleManagementPanel.tsx`
- Only visible to Owner
- Features:
  - Search/list all users (from `profiles` table)
  - View each user's current roles
  - Assign/remove `admin` role
  - View role for each user (user/admin/owner)
  - Cannot remove own owner role (safety)

### Update Professional Mode
- File: `src/components/settings/ProfessionalMode.tsx`
- Add "Role Management" section, gated behind `useIsOwner`
- Uses Crown icon

### Update Settings Page
- File: `src/pages/SettingsPage.tsx`
- Update `useIsAdmin` usage — Professional Mode visible to both admin and owner (already works since owner will return `isAdmin = true`)

### Security
- Role changes only possible through RLS-protected `user_roles` table
- Only owner can INSERT/UPDATE/DELETE on `user_roles`
- The `has_role` function already uses SECURITY DEFINER to prevent recursion

### Files to create/modify
| File | Action |
|------|--------|
| Migration SQL | Create — add enum value, insert role, update RLS |
| `src/hooks/useIsOwner.ts` | Create |
| `src/hooks/useIsAdmin.ts` | Modify — also return true for owner |
| `src/components/settings/RoleManagementPanel.tsx` | Create |
| `src/components/settings/ProfessionalMode.tsx` | Modify — add Role Management |


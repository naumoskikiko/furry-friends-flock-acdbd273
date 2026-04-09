

## Fix: 2FA Login Flow

### Problem
Current flow: Login → Sign out → Show 2FA → Re-login. The re-login fails because credentials may be invalid or the session was invalidated.

### Solution
Keep the session alive after the first login. Only navigate to "/" after TOTP verification succeeds. Sign out only if the user cancels or fails verification.

### Changes

**File: `src/pages/AuthPage.tsx`**

1. In `handleLogin` (line 115-121): Remove `await supabase.auth.signOut()`. Instead, just set `pendingUserId` and switch to 2FA view while keeping the session.

2. In `verify2FA` (lines 72-78): Remove the second `signInWithPassword` call. On success, just `navigate("/")` — the session is already active from step 1.

3. In the "Back to login" button (line 180): Add `supabase.auth.signOut()` when leaving the 2FA view, so canceling properly cleans up.

### Flow After Fix
1. User enters email + password → `signInWithPassword` succeeds
2. 2FA detected → show code input (session stays active)
3. Code verified → navigate to "/"
4. Code fails or user cancels → sign out


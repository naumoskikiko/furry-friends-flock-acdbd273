

## Fix "This Was Helpful" — Root Causes & Plan

### Problems Identified

1. **No UPDATE policy on `blog_comments`** — The RLS policies only allow SELECT, INSERT, and DELETE. The `update({ is_helpful: true })` call silently fails because there's no UPDATE permission.

2. **`createNotification` arguments are swapped** — The function signature is `createNotification(actorId, userId, ...)` but the code passes `(comment.user_id, user.id, ...)`, meaning it tries to notify the question asker instead of the answer author.

3. **`earnCredits` rewards the wrong user** — The `useCredits` hook always awards credits to the currently logged-in user (the question asker). The answer author should receive the credits instead. Since `earnCredits` only works for the current user, we need a different approach to award credits to another user.

### Plan

**Step 1: Add UPDATE RLS policy on `blog_comments`**
- Create a migration adding an UPDATE policy that allows the **article owner** to update `is_helpful` on comments belonging to their articles.
- Policy: authenticated users can update `blog_comments` where the associated `blog_post` has `user_id = auth.uid()`, restricted to only the `is_helpful` column.

**Step 2: Fix notification parameter order**
- Swap `createNotification(comment.user_id, user.id, ...)` → `createNotification(user.id, comment.user_id, ...)` so the answer author receives the notification.

**Step 3: Award credits to the answer author (not the current user)**
- Since `earnCredits` only works for the logged-in user, directly insert into `credits`, `credit_transactions`, and `credit_daily_log` for the answer author's `user_id` using Supabase calls in `markHelpful`.
- This bypasses the hook (which is scoped to the current user) and correctly credits the other user.

**Step 4: Add error handling**
- Check the result of the `update` call and only proceed with credits/notification if it succeeded.
- Show error toast if the update fails.

### Files Changed
- **Migration**: New SQL migration for UPDATE policy on `blog_comments`
- **Modified**: `src/components/blog/BlogArticleViewer.tsx` — fix `markHelpful` logic


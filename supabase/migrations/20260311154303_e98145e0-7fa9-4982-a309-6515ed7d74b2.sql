
-- Insert owner role for hristijannaumoski3@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('9bce8224-8080-43a1-9fce-16cd183eeeaa', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on user_roles if any
DROP POLICY IF EXISTS "Anyone can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- SELECT: users see own roles, owners see all
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'owner')
);

-- INSERT: only owner
CREATE POLICY "Owners can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'owner')
);

-- UPDATE: only owner
CREATE POLICY "Owners can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
);

-- DELETE: only owner, and cannot delete owner role
CREATE POLICY "Owners can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
  AND role != 'owner'
);


-- Update existing profiles to new role values
UPDATE public.profiles SET role = 'user' WHERE role = 'owner';
UPDATE public.profiles SET role = 'provider' WHERE role = 'sitter';

-- Update the handle_new_user function to default to 'user' instead of 'owner'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_type, 'user')
  );
  INSERT INTO public.credits (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

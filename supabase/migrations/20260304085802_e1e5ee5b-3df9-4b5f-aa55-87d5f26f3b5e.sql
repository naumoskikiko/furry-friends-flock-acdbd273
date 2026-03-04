
-- User settings table for privacy, appearance, and general preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Privacy
  private_account BOOLEAN NOT NULL DEFAULT false,
  show_in_search BOOLEAN NOT NULL DEFAULT true,
  show_rating_publicly BOOLEAN NOT NULL DEFAULT true,
  messaging_access TEXT NOT NULL DEFAULT 'everyone' CHECK (messaging_access IN ('everyone', 'booked_only')),
  show_activity_status BOOLEAN NOT NULL DEFAULT true,
  -- Appearance
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  font_size TEXT NOT NULL DEFAULT 'normal' CHECK (font_size IN ('small', 'normal', 'large')),
  language TEXT NOT NULL DEFAULT 'en',
  -- Professional mode
  professional_mode BOOLEAN NOT NULL DEFAULT false,
  -- Two-factor auth
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Emergency / pet settings
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  vet_name TEXT DEFAULT '',
  vet_phone TEXT DEFAULT '',
  medical_notes_privacy TEXT NOT NULL DEFAULT 'private' CHECK (medical_notes_privacy IN ('private', 'sitter_only', 'public')),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Push notifications
  push_booking_request BOOLEAN NOT NULL DEFAULT true,
  push_booking_confirmation BOOLEAN NOT NULL DEFAULT true,
  push_new_message BOOLEAN NOT NULL DEFAULT true,
  push_payment_received BOOLEAN NOT NULL DEFAULT true,
  push_new_review BOOLEAN NOT NULL DEFAULT true,
  push_promotions BOOLEAN NOT NULL DEFAULT false,
  -- Email notifications
  email_booking_request BOOLEAN NOT NULL DEFAULT true,
  email_booking_confirmation BOOLEAN NOT NULL DEFAULT true,
  email_new_message BOOLEAN NOT NULL DEFAULT true,
  email_payment_received BOOLEAN NOT NULL DEFAULT true,
  email_new_review BOOLEAN NOT NULL DEFAULT true,
  email_promotions BOOLEAN NOT NULL DEFAULT false,
  -- SMS
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification prefs" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification prefs" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification prefs" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Blocked users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to also create default settings and notification prefs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_type, 'owner')
  );
  INSERT INTO public.credits (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Create system_settings table for global platform parameters
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);
-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
-- Admins can manage settings
CREATE POLICY "admins_manage_settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Everyone can view settings (needed for maintenance guard)
CREATE POLICY "everyone_view_settings" ON public.system_settings FOR
SELECT TO authenticated,
    anon USING (true);
-- Seed initial values
INSERT INTO public.system_settings (key, value, description)
VALUES (
        'maintenance_mode',
        'false',
        'Enable/disable platform maintenance mode'
    ),
    (
        'registration_enabled',
        'true',
        'Allow new user registrations'
    ) ON CONFLICT (key) DO NOTHING;
-- Fix security linter warnings: set immutable search_path for security definer functions
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

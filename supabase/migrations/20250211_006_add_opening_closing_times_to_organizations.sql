-- Add opening_time and closing_time columns to organizations table
-- These times control when opening and closing stock are automatically calculated
-- If NULL, stock calculations work on-demand (when users visit the pages)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS opening_time TIME,
  ADD COLUMN IF NOT EXISTS closing_time TIME;

-- Add comments
COMMENT ON COLUMN public.organizations.opening_time IS 'Optional: Time of day when opening stock should be automatically calculated (HH:MM:SS format, e.g., 08:00:00). If NULL, opening stock is calculated on-demand.';
COMMENT ON COLUMN public.organizations.closing_time IS 'Optional: Time of day when closing stock should be automatically calculated (HH:MM:SS format, e.g., 22:00:00). If NULL, closing stock is calculated on-demand.';


-- Add business_type column to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Add comment
COMMENT ON COLUMN public.organizations.business_type IS 'Type of business (e.g., bar, restaurant, bakery, cafe, retail)';


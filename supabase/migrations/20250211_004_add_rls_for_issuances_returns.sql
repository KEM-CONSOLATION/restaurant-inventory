-- Enable RLS on issuances and returns tables
ALTER TABLE public.issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Issuances policies
-- Users can view issuances from their organization
CREATE POLICY "Users can view issuances from their organization"
  ON public.issuances FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

-- Controllers, branch managers, admins, and tenant admins can create issuances
CREATE POLICY "Controllers and managers can create issuances"
  ON public.issuances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('controller', 'branch_manager', 'admin', 'tenant_admin')
    )
    AND (
      organization_id = public.get_user_organization_id() OR
      public.is_superadmin()
    )
  );

-- Controllers, branch managers, admins, and tenant admins can update issuances
CREATE POLICY "Controllers and managers can update issuances"
  ON public.issuances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('controller', 'branch_manager', 'admin', 'tenant_admin')
    )
    AND (
      organization_id = public.get_user_organization_id() OR
      public.is_superadmin()
    )
  );

-- Admins and tenant admins can delete issuances
CREATE POLICY "Admins can delete issuances"
  ON public.issuances FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'superadmin')
    )
    AND (
      organization_id = public.get_user_organization_id() OR
      public.is_superadmin()
    )
  );

-- Returns policies
-- Users can view returns from their organization
CREATE POLICY "Users can view returns from their organization"
  ON public.returns FOR SELECT
  USING (
    organization_id = public.get_user_organization_id() OR
    public.is_superadmin()
  );

-- Controllers, branch managers, admins, and tenant admins can create returns
CREATE POLICY "Controllers and managers can create returns"
  ON public.returns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('controller', 'branch_manager', 'admin', 'tenant_admin')
    )
    AND (
      organization_id = public.get_user_organization_id() OR
      public.is_superadmin()
    )
  );

-- Controllers, branch managers, admins, and tenant admins can update returns
CREATE POLICY "Controllers and managers can update returns"
  ON public.returns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('controller', 'branch_manager', 'admin', 'tenant_admin')
    )
    AND (
      organization_id = public.get_user_organization_id() OR
      public.is_superadmin()
    )
  );

-- Admins and tenant admins can delete returns
CREATE POLICY "Admins can delete returns"
  ON public.returns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'superadmin')
    )
    AND (
      organization_id = public.get_user_organization_id() OR
      public.is_superadmin()
    )
  );

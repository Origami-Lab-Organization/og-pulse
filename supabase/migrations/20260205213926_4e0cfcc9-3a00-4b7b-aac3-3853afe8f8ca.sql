-- Add logo_url column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url text;

-- Add logo_url column to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for company-logos bucket
-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow admins and managers to upload logos
CREATE POLICY "Admins and managers can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

-- Allow admins and managers to update logos
CREATE POLICY "Admins and managers can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

-- Allow admins and managers to delete logos
CREATE POLICY "Admins and managers can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);
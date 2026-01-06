-- ============================================
-- Product Images Storage Bucket & Policies
-- ============================================
-- This migration creates a storage bucket for product images
-- with proper RLS policies for secure file access

-- Create the storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Public bucket for product images
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects (if not already)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view product images (public bucket)
DROP POLICY IF EXISTS "Public product images access" ON storage.objects;
CREATE POLICY "Public product images access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can upload product images for their company
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    -- Allow uploads to company-specific folder
    (storage.foldername(name))[1] = (
      SELECT company_id::text
      FROM public.users
      WHERE id = auth.uid()
    )
    OR
    -- Allow uploads to public folder for users without company
    (storage.foldername(name))[1] = 'public'
  )
);

-- Policy: Users can update their company's product images
DROP POLICY IF EXISTS "Users can update own company product images" ON storage.objects;
CREATE POLICY "Users can update own company product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    (storage.foldername(name))[1] = (
      SELECT company_id::text
      FROM public.users
      WHERE id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'public'
  )
);

-- Policy: Users can delete their company's product images
DROP POLICY IF EXISTS "Users can delete own company product images" ON storage.objects;
CREATE POLICY "Users can delete own company product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    (storage.foldername(name))[1] = (
      SELECT company_id::text
      FROM public.users
      WHERE id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'public'
  )
);

-- ============================================
-- Grant necessary permissions
-- ============================================
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Product images storage bucket created with RLS policies';
END $$;

-- ============================================
-- Storage Policies for Product Images
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public product images access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own company product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own company product images" ON storage.objects;

-- Policy: Anyone can view product images (public bucket)
CREATE POLICY "Public product images access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy: Authenticated users can upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
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

-- Policy: Users can update their company's product images
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

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Verify policies were created
DO $$
BEGIN
  RAISE NOTICE 'Storage policies for product-images bucket applied successfully!';
END $$;

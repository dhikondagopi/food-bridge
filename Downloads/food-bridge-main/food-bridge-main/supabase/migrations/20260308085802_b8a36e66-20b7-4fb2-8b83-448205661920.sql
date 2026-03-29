
-- Create public storage bucket for food donation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload food images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

-- Allow anyone to view food images (public bucket)
CREATE POLICY "Anyone can view food images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'food-images');

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'food-images' AND (storage.foldername(name))[1] = auth.uid()::text);


-- Add image_url column to stakeholders
ALTER TABLE public.stakeholders ADD COLUMN image_url TEXT;

-- Create stakeholder-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stakeholder-images', 'stakeholder-images', true);

-- Public read access
CREATE POLICY "Public can view stakeholder images"
ON storage.objects FOR SELECT
USING (bucket_id = 'stakeholder-images');

-- Cipher users can upload
CREATE POLICY "Cipher can upload stakeholder images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stakeholder-images' AND auth.role() = 'authenticated');

-- Cipher can update
CREATE POLICY "Cipher can update stakeholder images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stakeholder-images' AND auth.role() = 'authenticated');

-- Cipher can delete
CREATE POLICY "Cipher can delete stakeholder images"
ON storage.objects FOR DELETE
USING (bucket_id = 'stakeholder-images' AND auth.role() = 'authenticated');

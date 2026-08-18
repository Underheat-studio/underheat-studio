/*
# Create storage policies for feedback bucket

1. Security
- Allow public read access to the feedback storage bucket
- Allow anyone (anon + authenticated) to upload to the feedback bucket
- Allow anyone to delete from the feedback bucket (for admin post deletion)
*/

DROP POLICY IF EXISTS "feedback_bucket_read" ON storage.objects;
CREATE POLICY "feedback_bucket_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'feedback');

DROP POLICY IF EXISTS "feedback_bucket_upload" ON storage.objects;
CREATE POLICY "feedback_bucket_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback');

DROP POLICY IF EXISTS "feedback_bucket_delete" ON storage.objects;
CREATE POLICY "feedback_bucket_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'feedback');

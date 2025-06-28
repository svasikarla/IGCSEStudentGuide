INSERT INTO storage.buckets (id, name, public)
VALUES ('answer_sheets', 'answer_sheets', true);

CREATE POLICY "Allow authenticated users to upload answer sheets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'answer_sheets');

-- Create storage bucket for dossier files (photos, plans)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-files', 'dossier-files', true);

-- Allow anyone to read files (public bucket)
CREATE POLICY "Dossier files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'dossier-files');

-- Allow anyone to upload files (no auth yet)
CREATE POLICY "Anyone can upload dossier files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dossier-files');

-- Allow anyone to delete dossier files
CREATE POLICY "Anyone can delete dossier files"
ON storage.objects FOR DELETE
USING (bucket_id = 'dossier-files');
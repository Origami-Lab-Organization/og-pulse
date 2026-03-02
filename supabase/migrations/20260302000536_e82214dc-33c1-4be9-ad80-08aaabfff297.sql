
-- Add pdf_url column to market_analyses
ALTER TABLE public.market_analyses ADD COLUMN pdf_url text;

-- Create storage bucket for market analysis PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('market-analysis-pdfs', 'market-analysis-pdfs', true);

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload analysis PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'market-analysis-pdfs' AND auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Public can read analysis PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'market-analysis-pdfs');

-- Allow users to delete their own PDFs
CREATE POLICY "Users can delete their analysis PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'market-analysis-pdfs' AND auth.role() = 'authenticated');

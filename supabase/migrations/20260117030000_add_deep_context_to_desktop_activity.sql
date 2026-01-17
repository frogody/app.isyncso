-- ============================================================================
-- Add Deep Context Data to Desktop Activity Logs
-- ============================================================================

-- Add columns for OCR text, semantic analysis, and commitments
ALTER TABLE public.desktop_activity_logs
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS semantic_category TEXT,
ADD COLUMN IF NOT EXISTS commitments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS screen_captures JSONB DEFAULT '[]';

-- Add index for semantic category queries
CREATE INDEX IF NOT EXISTS idx_desktop_activity_semantic ON public.desktop_activity_logs(semantic_category);

-- Add comment
COMMENT ON COLUMN public.desktop_activity_logs.ocr_text IS 'Extracted text from screen captures via OCR';
COMMENT ON COLUMN public.desktop_activity_logs.semantic_category IS 'Semantic category: coding, browsing, communication, writing, etc.';
COMMENT ON COLUMN public.desktop_activity_logs.commitments IS 'Detected commitments, todos, and action items';
COMMENT ON COLUMN public.desktop_activity_logs.screen_captures IS 'Metadata about screen captures taken during this hour';

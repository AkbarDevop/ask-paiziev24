-- Allow Russian language for content from Russian interviews/podcasts
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_language_check;
ALTER TABLE documents ADD CONSTRAINT documents_language_check
  CHECK (language IN ('en', 'uz', 'ru'));

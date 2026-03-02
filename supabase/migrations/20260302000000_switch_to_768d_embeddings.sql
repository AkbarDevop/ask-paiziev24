-- Switch from OpenAI 1536D embeddings to Gemini 768D embeddings.
-- Safe: all 861 rows currently have embedding = NULL.

-- 1. Drop existing HNSW index (must drop before column type change)
DROP INDEX IF EXISTS documents_embedding_idx;

-- Also try the auto-generated name pattern
DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('DROP INDEX IF EXISTS ' || indexname, '; ')
    FROM pg_indexes
    WHERE tablename = 'documents'
      AND indexdef LIKE '%vector_cosine_ops%'
  );
EXCEPTION WHEN OTHERS THEN
  -- No vector indexes found, that's fine
  NULL;
END $$;

-- 2. Change column dimension from 1536 to 768
ALTER TABLE documents
  ALTER COLUMN embedding TYPE VECTOR(768);

-- 3. Recreate HNSW index for 768D vectors
CREATE INDEX documents_embedding_idx ON documents
  USING hnsw (embedding vector_cosine_ops);

-- 4. Create/replace match_documents function with 768D signature
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  source_url TEXT,
  source_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.source_url,
    documents.source_type,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

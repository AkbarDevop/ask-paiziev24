-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main documents table for storing chunked content + embeddings
CREATE TABLE documents (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536),
  source_url  TEXT,
  source_type TEXT CHECK (source_type IN (
    'interview', 'article', 'linkedin_post',
    'telegram_post', 'youtube_transcript',
    'presentation', 'bio'
  )),
  language    TEXT DEFAULT 'en' CHECK (language IN ('en', 'uz')),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index (HNSW for better recall on small corpus)
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops);

-- Search function called from the API route
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
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

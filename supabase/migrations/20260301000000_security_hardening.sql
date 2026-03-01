-- Enable Row Level Security on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for all roles (service_role bypasses RLS anyway, this is for safety)
CREATE POLICY "Allow public read access" ON documents
  FOR SELECT USING (true);

-- Block all writes via RLS (only service_role can write, which bypasses RLS)
-- No INSERT/UPDATE/DELETE policies = blocked for anon/authenticated roles

-- Drop the unsafe search_documents function that allows SQL injection
DROP FUNCTION IF EXISTS search_documents(TEXT, INT);

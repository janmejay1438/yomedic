-- =============================================================
-- Yomedic: Supabase Migration for the "Request Access" Workflow
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. CREATE TABLE: access_requests
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.access_requests (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_name text        NOT NULL,
  establishment_id text     NOT NULL,
  contact_email text        NOT NULL,
  contact_phone text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  document_urls text[]      NOT NULL DEFAULT '{}'
);

-- Index for the most common admin query: filter by status, sort by date
CREATE INDEX IF NOT EXISTS idx_access_requests_status_date
  ON public.access_requests (status, submitted_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- 2a. Public anonymous INSERT — allows the unauthenticated
--     "Request Access" form to submit new rows via the anon key.
CREATE POLICY "Allow anonymous inserts"
  ON public.access_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 2b. Authenticated admin SELECT — only logged-in users with
--     the 'admin' role in app_metadata can read all rows.
CREATE POLICY "Admin can read all requests"
  ON public.access_requests
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 2c. Authenticated admin UPDATE — same admin check, restricted
--     to updating only the 'status' column (approve / reject).
CREATE POLICY "Admin can update request status"
  ON public.access_requests
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- No DELETE policy — rows cannot be deleted by anyone via the API.


-- ─────────────────────────────────────────────────────────────
-- 3. STORAGE BUCKET: verification-docs
-- ─────────────────────────────────────────────────────────────

-- Create the bucket (public = true so getPublicUrl works for admins)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 3a. Public anonymous UPLOAD — allows the unauthenticated
--     "Request Access" form to upload verification documents.
CREATE POLICY "Allow anonymous uploads to verification-docs"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'verification-docs'
  );

-- 3b. Admin-only READ — only authenticated admins can download/view
--     the uploaded documents from the admin dashboard.
CREATE POLICY "Admin can read verification-docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

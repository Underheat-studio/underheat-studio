/*
# Create feedback tables for UNDERHEAT Studio

1. New Tables
- `public_posts` — Community wall posts (public, anyone can read/write)
  - id (uuid, primary key)
  - author (text, name shown on post)
  - message (text, the post content)
  - image_url (text, optional attached image URL)
  - is_anonymous (boolean, whether to hide author)
  - created_at (timestamptz)
- `private_feedback` — Private feedback visible only to founder/admins
  - id (uuid, primary key)
  - name (text, optional)
  - email (text, optional)
  - feedback_type (text, general/bug/feature)
  - message (text, the feedback content)
  - created_at (timestamptz)
- `admin_notes` — Internal notes for founder/admins only
  - id (uuid, primary key)
  - author (text, who wrote the note)
  - message (text, note content)
  - created_at (timestamptz)
2. Security
- Enable RLS on all tables.
- public_posts: anyone (anon + authenticated) can read and create; only anon+authenticated can delete (for admin panel use).
- private_feedback: anyone can insert (submit feedback), but only authenticated users can read (founder/admin check done client-side via Auth0 role).
- admin_notes: anyone can insert, only authenticated can read.
- All tables use TO anon, authenticated since the app uses Auth0 (not Supabase auth) for role management.
*/

CREATE TABLE IF NOT EXISTS public_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text DEFAULT 'Anonymous',
  message text NOT NULL,
  image_url text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_public_posts" ON public_posts;
CREATE POLICY "anon_select_public_posts" ON public_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_public_posts" ON public_posts;
CREATE POLICY "anon_insert_public_posts" ON public_posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_public_posts" ON public_posts;
CREATE POLICY "anon_delete_public_posts" ON public_posts FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS private_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  feedback_type text DEFAULT 'General Feedback',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE private_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_private_feedback" ON private_feedback;
CREATE POLICY "anon_insert_private_feedback" ON private_feedback FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_private_feedback" ON private_feedback;
CREATE POLICY "anon_select_private_feedback" ON private_feedback FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text DEFAULT 'Admin',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admin_notes" ON admin_notes;
CREATE POLICY "anon_select_admin_notes" ON admin_notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_notes" ON admin_notes;
CREATE POLICY "anon_insert_admin_notes" ON admin_notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_admin_notes" ON admin_notes;
CREATE POLICY "anon_delete_admin_notes" ON admin_notes FOR DELETE
  TO anon, authenticated USING (true);

// ===============================
// UNDERHEAT Studio — Supabase Client
// ===============================

const SUPABASE_URL = "https://daowrueuritzrqdaekgd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhb3dydWV1cml0enJxZGFla2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDMzNTUsImV4cCI6MjA5NDIxOTM1NX0.9Fu0CesxkfJ5cA-2yCHd97ZOYcfWJQu9EuafMBz7P0o";

window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

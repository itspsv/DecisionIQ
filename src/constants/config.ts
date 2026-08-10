// Publishable Supabase connection details — safe to ship in client code.
// The publishable key (sb_publishable_…) carries the same low privileges as
// the legacy anon key; all AI work happens in the `analyze-decision` Edge
// Function, which holds the real API key as a secret.
export const SUPABASE_URL = "https://rmakiwhrgwkstaefowkl.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_MExPxwMkN2i9Gq4gP3Q9kg_I8w7teZz";

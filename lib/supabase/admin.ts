import { createClient } from "@supabase/supabase-js";

// Service role client. Server only. Never import this in a client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://x.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "demo",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

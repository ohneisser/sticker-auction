import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Runs every 5 minutes: frees spots whose 10 minute checkout reservation ran out.
// Also keeps the Supabase free tier awake.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("slots")
    .update({ reserved_key: null, reserved_until: null })
    .eq("status", "open")
    .lt("reserved_until", new Date().toISOString())
    .select("key");
  return NextResponse.json({ released: (data || []).map((s) => s.key) });
}

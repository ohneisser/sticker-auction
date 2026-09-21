import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// CSV export of everyone who signed up. Only the ADMIN_EMAIL account can call this.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data: orders } = await admin.from("orders").select("*").order("created_at", { ascending: false });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["email", "name", "company", "website", "spot", "amount_usd", "design", "status", "created"].join(","),
    ...(orders || []).map((o) => [o.email, o.full_name, o.company, o.website, o.slot_key, o.amount_cents / 100, o.design_option, o.status, o.created_at].map(esc).join(",")),
  ];
  return new NextResponse(rows.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="sticker-orders.csv"` },
  });
}

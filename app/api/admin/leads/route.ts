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
  const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
  const { data: bids } = await admin.from("bids").select("user_id, slot_key, amount_cents, status");

  const byUser = new Map<string, string[]>();
  for (const b of bids || []) {
    const list = byUser.get(b.user_id) || [];
    list.push(`${b.slot_key}:${b.amount_cents / 100}:${b.status}`);
    byUser.set(b.user_id, list);
  }

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["email", "name", "company", "website", "role", "marketing_opt_in", "signed_up", "bids"].join(","),
    ...(profiles || []).map((p) =>
      [p.email, p.full_name, p.company, p.website, p.role, p.marketing_opt_in, p.created_at, (byUser.get(p.id) || []).join(" | ")]
        .map(esc)
        .join(",")
    ),
  ];
  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="sticker-auction-leads.csv"`,
    },
  });
}

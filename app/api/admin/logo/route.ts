import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Signed download link for a bidder's logo. Admin only.
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const path = new URL(req.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("logos").createSignedUrl(path, 600);
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}

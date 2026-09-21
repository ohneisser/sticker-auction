import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { DESIGN_FEE_CENTS } from "@/lib/format";

// Reserves the spot for 15 minutes and sends the buyer to Stripe Checkout.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  let body: { slotKey?: string; designOption?: string; designBrief?: string; logoPath?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const { slotKey, designOption, designBrief, logoPath } = body;
  const design = designOption === "custom" ? "custom" : "as_is";
  if (
    typeof slotKey !== "string" ||
    typeof logoPath !== "string" || !logoPath.startsWith(`${user.id}/`) ||
    (designBrief != null && (typeof designBrief !== "string" || designBrief.length > 600))
  ) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: slot, error } = await admin.rpc("reserve_slot", { p_slot_key: slotKey, p_user_id: user.id });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("slot_sold")) return NextResponse.json({ error: "slot_sold" }, { status: 409 });
    if (msg.includes("slot_reserved")) return NextResponse.json({ error: "slot_reserved" }, { status: 409 });
    if (msg.includes("prime_locked")) return NextResponse.json({ error: "prime_locked" }, { status: 409 });
    return NextResponse.json({ error: "reserve_failed" }, { status: 500 });
  }
  const price = slot.price_cents as number;
  const fee = design === "custom" ? DESIGN_FEE_CENTS : 0;

  const { data: profile } = await admin.from("profiles").select("email, stripe_customer_id, company").eq("id", user.id).single();
  const { data: order } = await admin
    .from("orders")
    .insert({ slot_key: slotKey, user_id: user.id, amount_cents: price + fee, design_option: design, design_fee_cents: fee, design_brief: design === "custom" ? designBrief || null : null, logo_path: logoPath })
    .select()
    .single();
  if (!order) return NextResponse.json({ error: "order_failed" }, { status: 500 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const items = [{ quantity: 1, price_data: { currency: "usd", unit_amount: price, product_data: { name: `${slot.label} sticker spot on Andries' MacBook` } } }];
  if (fee) items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: fee, product_data: { name: "Custom sticker design by Andries" } } });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: profile?.stripe_customer_id || undefined,
    customer_email: profile?.stripe_customer_id ? undefined : profile?.email || user.email,
    customer_creation: profile?.stripe_customer_id ? undefined : "always",
    line_items: items,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: { kind: "spot", order_id: order.id, slot_key: slotKey, user_id: user.id, company: profile?.company || "" },
    success_url: `${site}/slot/${slotKey}?paid=1`,
    cancel_url: `${site}/slot/${slotKey}`,
  });
  await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  return NextResponse.json({ url: session.url });
}

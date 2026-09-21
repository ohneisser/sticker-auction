import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { DESIGN_FEE_CENTS } from "@/lib/format";

const MAX_LOGO = 20 * 1024 * 1024;
const OK_TYPES = ["image/svg+xml", "application/pdf", "image/png", "application/postscript", "application/illustrator", "application/octet-stream"];

// One form, no account: buyer details + logo, then straight to Stripe Checkout.
export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const slotKey = String(form.get("slotKey") || "");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const fullName = String(form.get("fullName") || "").trim();
  const company = String(form.get("company") || "").trim();
  const website = String(form.get("website") || "").trim();
  const design = form.get("designOption") === "custom" ? "custom" : "as_is";
  const brief = String(form.get("designBrief") || "").slice(0, 600);
  const terms = form.get("terms") === "yes";
  const file = form.get("logo");

  if (!slotKey || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName || !company || !terms) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_LOGO || !(OK_TYPES.includes(file.type) || /\.(svg|pdf|ai|eps|png)$/i.test(file.name))) {
    return NextResponse.json({ error: "bad_logo" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: slot, error } = await admin.rpc("reserve_slot", { p_slot_key: slotKey, p_reserved_key: email });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("slot_sold")) return NextResponse.json({ error: "slot_sold" }, { status: 409 });
    if (msg.includes("slot_reserved")) return NextResponse.json({ error: "slot_reserved" }, { status: 409 });
    if (msg.includes("prime_locked")) return NextResponse.json({ error: "prime_locked" }, { status: 409 });
    return NextResponse.json({ error: "reserve_failed" }, { status: 500 });
  }

  const ext = (file.name.split(".").pop() || "file").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `orders/${slotKey}-${Date.now()}.${ext}`;
  const { error: upErr } = await admin.storage.from("logos").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream", upsert: false });
  if (upErr) return NextResponse.json({ error: "upload_failed" }, { status: 500 });

  const price = slot.price_cents as number;
  const fee = design === "custom" ? DESIGN_FEE_CENTS : 0;
  const { data: order } = await admin
    .from("orders")
    .insert({ slot_key: slotKey, email, full_name: fullName, company, website: website || null, amount_cents: price + fee, design_option: design, design_fee_cents: fee, design_brief: design === "custom" ? brief || null : null, logo_path: path, terms_accepted_at: new Date().toISOString() })
    .select()
    .single();
  if (!order) return NextResponse.json({ error: "order_failed" }, { status: 500 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const items = [{ quantity: 1, price_data: { currency: "usd", unit_amount: price, product_data: { name: `${slot.label} sticker spot on Andries' MacBook` } } }];
  if (fee) items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: fee, product_data: { name: "Custom sticker design by Andries" } } });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: items,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    custom_text: { submit: { message: "All sales are final. No refunds, unless your sticker never makes it onto the laptop." } },
    metadata: { kind: "spot", order_id: order.id, slot_key: slotKey, email, company },
    success_url: `${site}/slot/${slotKey}?paid=1`,
    cancel_url: `${site}/slot/${slotKey}`,
  });
  await admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  return NextResponse.json({ url: session.url });
}

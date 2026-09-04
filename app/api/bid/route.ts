import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { sendOutbid } from "@/lib/email";
import { usd, DESIGN_FEE_CENTS } from "@/lib/format";

const MAX_BID_CENTS = 5_000_000; // $50,000 sanity cap

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  let body: { slotKey?: string; amountCents?: number; paymentMethodId?: string; designOption?: string; designBrief?: string; logoPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { slotKey, amountCents, paymentMethodId, designOption, designBrief, logoPath } = body;
  const design = designOption === "custom" ? "custom" : "as_is";
  if (
    typeof slotKey !== "string" ||
    typeof paymentMethodId !== "string" ||
    !paymentMethodId.startsWith("pm_") ||
    !Number.isInteger(amountCents) ||
    amountCents! <= 0 ||
    amountCents! > MAX_BID_CENTS ||
    typeof logoPath !== "string" ||
    !logoPath.startsWith(`${user.id}/`) ||
    (designBrief != null && (typeof designBrief !== "string" || designBrief.length > 600))
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: "no_customer" }, { status: 400 });

  // make sure the payment method really belongs to this user
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== profile.stripe_customer_id) {
    return NextResponse.json({ error: "payment_method_mismatch" }, { status: 403 });
  }

  const { data, error } = await admin.rpc("place_bid", {
    p_slot_key: slotKey,
    p_user_id: user.id,
    p_amount_cents: amountCents,
    p_payment_method_id: paymentMethodId,
    p_design_option: design,
    p_design_fee_cents: design === "custom" ? DESIGN_FEE_CENTS : 0,
    p_design_brief: design === "custom" ? designBrief || null : null,
    p_logo_path: logoPath,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.startsWith("bid_too_low:")) {
      const min = parseInt(msg.split(":")[1], 10);
      return NextResponse.json({ error: "bid_too_low", minCents: min }, { status: 409 });
    }
    if (msg.includes("slot_closed")) return NextResponse.json({ error: "slot_closed" }, { status: 409 });
    if (msg.includes("already_leading")) return NextResponse.json({ error: "already_leading" }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "bid_failed" }, { status: 500 });
  }

  // tell the previous leader, in the background
  const prevBidder = data?.prev_bidder as string | null;
  if (prevBidder && prevBidder !== user.id) {
    const [{ data: prev }, { data: slot }] = await Promise.all([
      admin.from("profiles").select("email").eq("id", prevBidder).single(),
      admin.from("slots").select("label").eq("key", slotKey).single(),
    ]);
    if (prev?.email && slot) void sendOutbid(prev.email, slot.label, slotKey, usd(amountCents!));
  }

  return NextResponse.json({ ok: true, endsAt: data.ends_at });
}

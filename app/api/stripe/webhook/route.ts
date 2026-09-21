import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBought } from "@/lib/email";
import { usd } from "@/lib/format";

// Marks a spot as sold when the Checkout is paid, frees it when the Checkout expires.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const admin = createAdminClient();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    const cs = event.data.object;
    if (cs.metadata?.kind !== "spot") return NextResponse.json({ received: true });
    const orderId = cs.metadata.order_id;
    const slotKey = cs.metadata.slot_key;
    const userId = cs.metadata.user_id;

    if (event.type === "checkout.session.completed" && cs.payment_status === "paid") {
      const { data: order } = await admin.from("orders").update({ status: "paid", stripe_payment_intent_id: typeof cs.payment_intent === "string" ? cs.payment_intent : null }).eq("id", orderId).select().single();
      await admin.from("slots").update({ status: "sold", current_bidder: userId, current_bid_cents: order?.amount_cents ?? cs.amount_total, reserved_by: null, reserved_until: null }).eq("key", slotKey);
      if (typeof cs.customer === "string") await admin.from("profiles").update({ stripe_customer_id: cs.customer }).eq("id", userId).is("stripe_customer_id", null);
      const [{ data: profile }, { data: slot }] = await Promise.all([
        admin.from("profiles").select("email").eq("id", userId).single(),
        admin.from("slots").select("label").eq("key", slotKey).single(),
      ]);
      if (profile?.email && slot) void sendBought(profile.email, slot.label, usd(cs.amount_total || 0));
    } else if (event.type === "checkout.session.expired") {
      await admin.from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
      await admin.from("slots").update({ reserved_by: null, reserved_until: null }).eq("key", slotKey).eq("reserved_by", userId).eq("status", "open");
    }
  }
  return NextResponse.json({ received: true });
}

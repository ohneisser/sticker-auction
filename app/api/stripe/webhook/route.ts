import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBought, sendRefunded } from "@/lib/email";
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
    const { order_id: orderId, slot_key: slotKey, email, company } = cs.metadata;

    if (event.type === "checkout.session.completed" && cs.payment_status === "paid") {
      // safety net: if someone else bought this spot in the meantime, refund right away
      const { data: current } = await admin.from("slots").select("status").eq("key", slotKey).single();
      if (current?.status === "sold" && typeof cs.payment_intent === "string") {
        try { await stripe.refunds.create({ payment_intent: cs.payment_intent }); } catch {}
        await admin.from("orders").update({ status: "expired", stripe_payment_intent_id: cs.payment_intent }).eq("id", orderId);
        if (email) void sendRefunded(email);
        return NextResponse.json({ received: true });
      }
      const { data: order } = await admin.from("orders").update({ status: "paid", stripe_payment_intent_id: typeof cs.payment_intent === "string" ? cs.payment_intent : null }).eq("id", orderId).select().single();
      await admin.from("slots").update({ status: "sold", buyer_company: company || null, current_bid_cents: order?.amount_cents ?? cs.amount_total, reserved_key: null, reserved_until: null }).eq("key", slotKey);
      const { data: slot } = await admin.from("slots").select("label").eq("key", slotKey).single();
      if (email && slot) void sendBought(email, slot.label, usd(cs.amount_total || 0));
    } else if (event.type === "checkout.session.expired") {
      await admin.from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
      await admin.from("slots").update({ reserved_key: null, reserved_until: null }).eq("key", slotKey).eq("reserved_key", email).eq("status", "open");
    }
  }
  return NextResponse.json({ received: true });
}

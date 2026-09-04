import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Keeps bid status in sync if a payment settles or fails after the cron run
// (e.g. a 3DS challenge completed later).
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
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object;
    if (cs.metadata?.kind === "prime_ticket" && cs.payment_status === "paid") {
      await admin.from("prime_tickets").upsert(
        {
          user_id: cs.metadata.user_id,
          quantity: parseInt(cs.metadata.quantity || "1", 10),
          amount_cents: cs.amount_total || 0,
          stripe_checkout_session_id: cs.id,
        },
        { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }
      );
    }
  }
  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const bidId = pi.metadata?.bid_id;
    const slotKey = pi.metadata?.slot_key;
    if (bidId && slotKey) {
      const ok = event.type === "payment_intent.succeeded";
      await admin.from("bids").update({ status: ok ? "paid" : "failed", stripe_payment_intent_id: pi.id }).eq("id", bidId);
      await admin.from("slots").update({ status: ok ? "paid" : "failed" }).eq("key", slotKey);
    }
  }
  return NextResponse.json({ received: true });
}

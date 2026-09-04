import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { sendWon, sendPaymentFailed } from "@/lib/email";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

// Runs every 5 minutes on Vercel. Closes ended slots and charges the winner's saved card.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: ended } = await admin
    .from("slots")
    .select("*")
    .eq("status", "open")
    .lt("ends_at", new Date().toISOString());

  const results: Record<string, string> = {};

  for (const slot of ended || []) {
    // lock the slot first so a second cron run can't double charge
    const { data: locked } = await admin
      .from("slots")
      .update({ status: "closed" })
      .eq("key", slot.key)
      .eq("status", "open")
      .select()
      .single();
    if (!locked) continue;

    const { data: bid } = await admin
      .from("bids")
      .select("*")
      .eq("slot_key", slot.key)
      .eq("status", "leading")
      .single();

    if (!bid) {
      results[slot.key] = "no bids";
      continue;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email, stripe_customer_id, company")
      .eq("id", bid.user_id)
      .single();

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: bid.amount_cents + (bid.design_fee_cents || 0),
          currency: "usd",
          customer: profile!.stripe_customer_id!,
          payment_method: bid.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `${slot.label} sticker spot on Andries' MacBook${bid.design_option === "custom" ? " + custom sticker design" : ""}`,
          metadata: { slot_key: slot.key, bid_id: bid.id, company: profile?.company || "" },
        },
        { idempotencyKey: `bid-${bid.id}` }
      );
      const paid = pi.status === "succeeded";
      await admin.from("bids").update({ status: paid ? "paid" : "won", stripe_payment_intent_id: pi.id }).eq("id", bid.id);
      await admin.from("slots").update({ status: paid ? "paid" : "closed" }).eq("key", slot.key);
      if (paid && profile?.email) void sendWon(profile.email, slot.label, usd(bid.amount_cents + (bid.design_fee_cents || 0)));
      results[slot.key] = pi.status;
    } catch (e) {
      const err = e as { payment_intent?: { id: string }; message?: string };
      await admin.from("bids").update({ status: "failed", stripe_payment_intent_id: err.payment_intent?.id ?? null }).eq("id", bid.id);
      await admin.from("slots").update({ status: "failed" }).eq("key", slot.key);
      if (profile?.email) void sendPaymentFailed(profile.email, slot.label);
      results[slot.key] = `failed: ${err.message}`;
    }
  }

  return NextResponse.json({ closed: results });
}

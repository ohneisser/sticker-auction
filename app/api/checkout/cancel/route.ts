import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

// Buyer clicked "back" on the Stripe page: kill the session and free the spot right away.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("o") || "";
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, slot_key, email, status, stripe_checkout_session_id").eq("id", orderId).single();
  if (order && order.status === "pending") {
    if (order.stripe_checkout_session_id) {
      try { await stripe.checkout.sessions.expire(order.stripe_checkout_session_id); } catch {}
    }
    await admin.from("orders").update({ status: "expired" }).eq("id", order.id).eq("status", "pending");
    await admin.from("slots").update({ reserved_key: null, reserved_until: null }).eq("key", order.slot_key).eq("reserved_key", order.email).eq("status", "open");
  }
  return NextResponse.redirect(`${url.origin}/slot/${order?.slot_key || ""}`, { status: 303 });
}

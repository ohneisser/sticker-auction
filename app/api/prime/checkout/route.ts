import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { TICKET_PRICE_CENTS } from "@/lib/format";

// Starts a Stripe Checkout for Prime raffle tickets. Only works once every auction spot is paid.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  const { quantity } = await req.json().catch(() => ({}));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: slots } = await admin.from("slots").select("kind,status");
  const sellable = (slots || []).filter((s) => s.kind !== "prize");
  if (!sellable.length || !sellable.every((s) => s.status === "paid")) return NextResponse.json({ error: "locked" }, { status: 409 });
  const { data: prime } = await admin.from("slots").select("current_bidder").eq("kind", "prize").single();
  if (prime?.current_bidder) return NextResponse.json({ error: "already_drawn" }, { status: 409 });

  const { data: profile } = await admin.from("profiles").select("stripe_customer_id, email").eq("id", user.id).single();
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: profile?.stripe_customer_id || undefined,
    customer_email: profile?.stripe_customer_id ? undefined : profile?.email || user.email,
    line_items: [{ quantity, price_data: { currency: "usd", unit_amount: TICKET_PRICE_CENTS, product_data: { name: "Prime spot raffle ticket" } } }],
    metadata: { kind: "prime_ticket", user_id: user.id, quantity: String(quantity) },
    success_url: `${site}/prime?paid=1`,
    cancel_url: `${site}/prime`,
  });
  return NextResponse.json({ url: session.url });
}

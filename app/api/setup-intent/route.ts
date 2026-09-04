import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

// Creates (or reuses) a Stripe customer for the logged in user and returns a SetupIntent.
// The card is saved and verified now, charged only if the user wins.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_logged_in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 400 });

  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.company || profile.full_name || undefined,
      metadata: { supabase_user_id: user.id, company: profile.company || "" },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
    automatic_payment_methods: { enabled: true },
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}

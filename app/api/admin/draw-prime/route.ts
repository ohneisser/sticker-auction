import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomInt } from "crypto";

// Draws the Prime winner: one random ticket, tickets of spot winners count double. Admin only, runs once.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data: prime } = await admin.from("slots").select("*").eq("kind", "prize").single();
  if (!prime) return NextResponse.json({ error: "no_prime_slot" }, { status: 400 });
  if (prime.current_bidder) return NextResponse.json({ error: "already_drawn" }, { status: 409 });

  const [{ data: tickets }, { data: paid }] = await Promise.all([
    admin.from("prime_tickets").select("user_id, quantity"),
    admin.from("bids").select("user_id").eq("status", "paid"),
  ]);
  const winners = new Set((paid || []).map((b) => b.user_id));
  // every ticket is one entry; tickets held by someone who won a spot count twice
  const pool: string[] = [];
  for (const t of tickets || []) {
    const weight = t.quantity * (winners.has(t.user_id) ? 2 : 1);
    for (let i = 0; i < weight; i++) pool.push(t.user_id);
  }
  if (pool.length === 0) return NextResponse.json({ error: "no_tickets_yet" }, { status: 409 });

  const winner = pool[randomInt(pool.length)];
  await admin.from("slots").update({ current_bidder: winner, status: "paid" }).eq("key", prime.key);
  const { data: profile } = await admin.from("profiles").select("email, company").eq("id", winner).single();
  return NextResponse.json({ winner: profile, entries: pool.length });
}

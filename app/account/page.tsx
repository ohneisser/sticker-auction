import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  leading: "leading",
  outbid: "outbid",
  won: "won, payment pending",
  paid: "won and paid",
  failed: "won, payment failed",
};

export default async function Account() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: bids }, { data: slots }] = await Promise.all([
    supabase.from("bids").select("*").order("created_at", { ascending: false }),
    supabase.from("slots_public").select("key,label"),
  ]);
  const labelFor = (k: string) => slots?.find((s) => s.key === k)?.label || k;

  return (
    <div className="max-w-3xl mx-auto pt-6 md:pt-10">
      <h2>My bids</h2>
      <p className="mt-3 note">Logged in as {user?.email}</p>
      {!bids?.length ? (
        <p className="mt-8">No bids yet. <Link href="/">Pick a spot</Link>.</p>
      ) : (
        <ul className="mt-8 rule">
          {bids.map((b) => (
            <li key={b.id} className="rule first:border-t-0 py-4 flex justify-between gap-4">
              <div>
                <div className="font-semibold"><Link href={`/slot/${b.slot_key}`}>{labelFor(b.slot_key)}</Link></div>
                <div className="note">{new Date(b.created_at).toLocaleString("en-US")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{usd(b.amount_cents)}</div>
                <div className="note">{labels[b.status] || b.status}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

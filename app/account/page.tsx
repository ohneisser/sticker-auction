import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = { pending: "checkout not finished", paid: "paid, yours", expired: "checkout expired" };

export default async function Account() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: orders }, { data: slots }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("slots_public").select("key,label"),
  ]);
  const labelFor = (k: string) => slots?.find((s) => s.key === k)?.label || k;

  return (
    <div className="max-w-3xl mx-auto pt-6 md:pt-10">
      <h2>My spots</h2>
      <p className="mt-3 note">Logged in as {user?.email}</p>
      {!orders?.length ? (
        <p className="mt-8">Nothing yet. <Link href="/">Pick a spot</Link>.</p>
      ) : (
        <ul className="mt-8 rule">
          {orders.map((o) => (
            <li key={o.id} className="rule first:border-t-0 py-4 flex justify-between gap-4">
              <div>
                <div className="font-semibold"><Link href={`/slot/${o.slot_key}`}>{labelFor(o.slot_key)}</Link></div>
                <div className="note">{new Date(o.created_at).toLocaleString("en-US")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{usd(o.amount_cents)}</div>
                <div className="note">{labels[o.status] || o.status}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

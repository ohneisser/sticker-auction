import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usd } from "@/lib/format";
import DrawPrime from "@/components/DrawPrime";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect("/");

  const admin = createAdminClient();
  const [{ data: profiles }, { data: slots }, { data: bids }, { data: tickets }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.from("slots").select("*").order("sort_order"),
    admin.from("bids").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("prime_tickets").select("*"),
  ]);
  const ticketCount = (tickets || []).reduce((n, t) => n + t.quantity, 0);
  const ticketRevenue = (tickets || []).reduce((n, t) => n + t.amount_cents, 0);
  const nameOf = (id: string) => profiles?.find((p) => p.id === id);
  const total = (slots || []).reduce((sum, s) => sum + (s.current_bid_cents || 0), 0);

  return (
    <div className="max-w-5xl mx-auto pt-6 md:pt-10">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h2>Admin</h2>
        <div className="flex gap-3"><a href="/api/admin/leads" className="btn btn-ghost">Download leads CSV</a><DrawPrime /></div>
      </div>
      <p className="mt-3">{profiles?.length || 0} signups · {bids?.length || 0} bids · {usd(total)} on the table · {ticketCount} Prime tickets ({usd(ticketRevenue)})</p>
      <p className="note mt-1">Free Prime entries: <code>insert into prime_tickets (user_id, quantity) values ('&lt;user uuid&gt;', 1);</code></p>

      <h3 className="mt-10 text-xl font-semibold">Spots</h3>
      <table className="w-full mt-3 text-sm">
        <thead><tr className="text-left note"><th className="py-2">Spot</th><th>Bid</th><th>Leader</th><th>Ends</th><th>Status</th></tr></thead>
        <tbody>
          {slots?.map((s) => {
            const p = s.current_bidder ? nameOf(s.current_bidder) : null;
            return (
              <tr key={s.key} className="rule">
                <td className="py-2">{s.label}</td>
                <td>{s.current_bid_cents ? usd(s.current_bid_cents) : "–"}</td>
                <td>{p ? `${p.company} (${p.email})` : "–"}</td>
                <td>{new Date(s.ends_at).toLocaleString("en-US")}</td>
                <td>{s.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 className="mt-10 text-xl font-semibold">Signups</h3>
      <table className="w-full mt-3 text-sm">
        <thead><tr className="text-left note"><th className="py-2">Company</th><th>Name</th><th>Email</th><th>Role</th><th>Website</th><th>Emails ok</th></tr></thead>
        <tbody>
          {profiles?.map((p) => (
            <tr key={p.id} className="rule">
              <td className="py-2">{p.company}</td><td>{p.full_name}</td><td>{p.email}</td><td>{p.role}</td>
              <td>{p.website && <a href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\//, "")}</a>}</td>
              <td>{p.marketing_opt_in ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-10 text-xl font-semibold">Latest bids</h3>
      <table className="w-full mt-3 text-sm">
        <thead><tr className="text-left note"><th className="py-2">When</th><th>Spot</th><th>Who</th><th>Amount</th><th>Design</th><th>Logo</th><th>Status</th></tr></thead>
        <tbody>
          {bids?.map((b) => (
            <tr key={b.id} className="rule">
              <td className="py-2">{new Date(b.created_at).toLocaleString("en-US")}</td>
              <td>{b.slot_key}</td>
              <td>{nameOf(b.user_id)?.company}</td>
              <td>{usd(b.amount_cents)}{b.design_fee_cents ? ` + ${usd(b.design_fee_cents)}` : ""}</td>
              <td className="max-w-48 truncate" title={b.design_brief || ""}>{b.design_option === "custom" ? `custom: ${b.design_brief || "no brief"}` : "as is"}</td>
              <td>{b.logo_path && <a href={`/api/admin/logo?path=${encodeURIComponent(b.logo_path)}`}>file</a>}</td>
              <td>{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

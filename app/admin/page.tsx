import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect("/");

  const admin = createAdminClient();
  const [{ data: profiles }, { data: slots }, { data: orders }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.from("slots").select("*").order("sort_order"),
    admin.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  const nameOf = (id: string) => profiles?.find((p) => p.id === id);
  const paid = (orders || []).filter((o) => o.status === "paid");
  const revenue = paid.reduce((n, o) => n + o.amount_cents, 0);

  return (
    <div className="max-w-5xl mx-auto pt-6 md:pt-10">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h2>Admin</h2>
        <a href="/api/admin/leads" className="btn btn-ghost">Download leads CSV</a>
      </div>
      <p className="mt-3">{profiles?.length || 0} signups · {paid.length} spots sold · {usd(revenue)} revenue</p>

      <h3 className="mt-10 text-xl font-semibold">Spots</h3>
      <table className="w-full mt-3 text-sm">
        <thead><tr className="text-left note"><th className="py-2">Spot</th><th>Price</th><th>Status</th><th>Buyer</th></tr></thead>
        <tbody>
          {slots?.map((s) => {
            const p = s.current_bidder ? nameOf(s.current_bidder) : null;
            const held = s.reserved_until && new Date(s.reserved_until) > new Date();
            return (
              <tr key={s.key} className="rule">
                <td className="py-2">{s.label}</td>
                <td>{usd(s.min_bid_cents)}</td>
                <td>{s.status === "sold" ? "sold" : held ? "held (checkout)" : "open"}</td>
                <td>{p ? `${p.company} (${p.email})` : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 className="mt-10 text-xl font-semibold">Orders</h3>
      <table className="w-full mt-3 text-sm">
        <thead><tr className="text-left note"><th className="py-2">When</th><th>Spot</th><th>Who</th><th>Amount</th><th>Design</th><th>Logo</th><th>Status</th></tr></thead>
        <tbody>
          {orders?.map((o) => (
            <tr key={o.id} className="rule">
              <td className="py-2">{new Date(o.created_at).toLocaleString("en-US")}</td>
              <td>{o.slot_key}</td>
              <td>{nameOf(o.user_id)?.company}</td>
              <td>{usd(o.amount_cents)}</td>
              <td className="max-w-48 truncate" title={o.design_brief || ""}>{o.design_option === "custom" ? `custom: ${o.design_brief || "no brief"}` : "as is"}</td>
              <td>{o.logo_path && <a href={`/api/admin/logo?path=${encodeURIComponent(o.logo_path)}`}>file</a>}</td>
              <td>{o.status}</td>
            </tr>
          ))}
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
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [form, setForm] = useState({ full_name: "", company: "", website: "", role: "", email: "", password: "", marketing_opt_in: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: {
          full_name: form.full_name.trim(),
          company: form.company.trim(),
          website: form.website.trim(),
          role: form.role,
          marketing_opt_in: form.marketing_opt_in,
        },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <h2>Check your inbox</h2>
        <p className="mt-4">I sent a confirmation link to {form.email}. Click it and you're in.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-6 md:pt-10">
      <h2>Create your account</h2>
      <p className="mt-3 note">So I know whose logo goes on the laptop. Already signed up? <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>.</p>
      <div className="mt-8">
        <label className="field"><span>Your name</span><input value={form.full_name} onChange={set("full_name")} autoComplete="name" required /></label>
        <label className="field"><span>Company</span><input value={form.company} onChange={set("company")} autoComplete="organization" required /></label>
        <label className="field"><span>Website</span><input value={form.website} onChange={set("website")} placeholder="https://" type="url" /></label>
        <label className="field"><span>What do you do there</span>
          <select value={form.role} onChange={set("role")}>
            <option value="">Pick one</option>
            <option>Founder</option>
            <option>Marketing</option>
            <option>Partnerships</option>
            <option>Something else</option>
          </select>
        </label>
        <label className="field"><span>Work email</span><input value={form.email} onChange={set("email")} type="email" autoComplete="email" required /></label>
        <label className="field"><span>Password</span><input value={form.password} onChange={set("password")} type="password" autoComplete="new-password" minLength={8} required /></label>
        <label className="flex gap-3 items-start text-sm mb-6">
          <input type="checkbox" checked={form.marketing_opt_in} onChange={set("marketing_opt_in")} className="mt-1" />
          <span>Okay to email me about other stuff Andries does with brands. No spam, unsubscribe any time.</span>
        </label>
        {error && <div className="error mb-4">{error}</div>}
        <button className="btn w-full" onClick={submit} disabled={busy || !form.email || form.password.length < 8 || !form.company || !form.full_name}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}

"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError("That email and password don't match.");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto pt-6 md:pt-10">
      <h2>Log in</h2>
      <p className="mt-3 note">New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>, it's quick.</p>
      <div className="mt-8">
        <label className="field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
        <label className="field"><span>Password</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && submit()} /></label>
        {error && <div className="error mb-4">{error}</div>}
        <button className="btn w-full" onClick={submit} disabled={busy || !email || !password}>{busy ? "Logging in…" : "Log in"}</button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

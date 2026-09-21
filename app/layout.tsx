import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getUserSafe } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Put your logo on my laptop",
  description: "18 sticker spots on the laptop that gets seen by more AI founders than most ads. Fixed prices, first come first served.",
};
export const viewport: Viewport = { themeColor: "#E5DDD2", width: "device-width", initialScale: 1, colorScheme: "light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserSafe();
  const isAdmin = !!user && user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="flex items-center justify-between px-5 md:px-10 py-4 text-sm">
          <Link href="/" className="no-underline font-bold" style={{ color: "var(--ink)" }}>@ohneis652</Link>
          <nav className="flex gap-5">
            <a href="https://instagram.com/ohneis652" target="_blank" rel="noreferrer">Insta</a>
            {isAdmin && <Link href="/admin">Admin</Link>}
          </nav>
        </header>
        <main className="px-5 md:px-10 pb-32 md:pb-24">{children}</main>
        <footer className="px-5 md:px-10 py-8 rule text-sm note">
          <p>Fixed prices, first come first served. Payment via Stripe. All sales are final, no refunds unless the sticker never makes it onto the laptop. Ohneisser LLC, Sheridan WY. <a href="mailto:ohneis@ohneis652.com">ohneis@ohneis652.com</a></p>
        </footer>
      </body>
    </html>
  );
}

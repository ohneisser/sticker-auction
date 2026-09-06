import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getUserSafe } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Put your logo on my laptop",
  description: "16 sticker spots on the laptop that gets seen by more AI people than most ads. 7 days to bid. Highest bid wins.",
};
export const viewport: Viewport = { themeColor: "#ECEAE3", width: "device-width", initialScale: 1, colorScheme: "light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserSafe();
  const isAdmin = !!user && user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="flex items-center justify-between px-5 md:px-10 py-4 text-sm">
          <Link href="/" className="no-underline font-bold">@ohneis652</Link>
          <nav className="flex gap-5">
            {user ? (
              <>
                <Link href="/account">My bids</Link>
                {isAdmin && <Link href="/admin">Admin</Link>}
                <form action="/logout" method="post"><button className="underline underline-offset-4 cursor-pointer">Log out</button></form>
              </>
            ) : (
              <Link href="/login">Log in</Link>
            )}
          </nav>
        </header>
        <main className="px-5 md:px-10 pb-32 md:pb-24">{children}</main>
        <footer className="px-5 md:px-10 py-8 rule text-sm note">
          <p>Highest bid when the clock hits zero wins. You only pay if you win. Nobody sees who is bidding. Ohneisser LLC, Sheridan WY. <a href="mailto:ohneis@ohneis652.com">ohneis@ohneis652.com</a></p>
        </footer>
      </body>
    </html>
  );
}

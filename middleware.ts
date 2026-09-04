import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response; // demo mode, no auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://x.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {}

  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/slot/") || path.startsWith("/account") || path.startsWith("/admin");
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/cron).*)"],
};

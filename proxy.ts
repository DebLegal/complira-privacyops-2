import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { liveConfig } from "./server/config";
export async function proxy(request: NextRequest) {
  let config;
  try {
    config = liveConfig();
  } catch {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
          });
      },
    },
  });
  try {
    await client.auth.getUser();
  } catch {
    /* Page/API authorization still fails closed; no session is fabricated. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/app/:path*", "/login"] };

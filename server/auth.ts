import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { liveConfig } from "./config";
import { ServiceError } from "../lib/live-policy";
export async function authClient() {
  const config = liveConfig();
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values) {
            jar.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
            });
          }
        } catch {
          /* Server Components cannot write cookies; route handlers persist refreshes. */
        }
      },
    },
  });
}
export async function verifiedUser() {
  const auth = await authClient();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) throw new ServiceError(401, "Sign in required");
  if (!data.user.email_confirmed_at || !data.user.email)
    throw new ServiceError(403, "Verified email required");
  return data.user;
}

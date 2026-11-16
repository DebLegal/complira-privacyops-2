import "server-only";
import { ServiceError } from "../lib/live-policy";
export function liveConfig() {
  if (process.env.COMPLIRA_APP_ENABLED !== "true")
    throw new ServiceError(
      503,
      "Customer workspace is disabled pending security release verification. The synthetic demo remains available.",
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const database = process.env.DATABASE_URL;
  const origin = process.env.APP_ORIGIN;
  if (!url || !key || !database || !origin)
    throw new ServiceError(
      503,
      "Customer workspace configuration is incomplete.",
    );
  if (
    new URL(url).protocol !== "https:" ||
    (process.env.NODE_ENV === "production" &&
      new URL(origin).protocol !== "https:")
  )
    throw new ServiceError(503, "Secure service origins required");
  return { url, key, database, origin: new URL(origin).origin };
}

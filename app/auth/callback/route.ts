import { NextResponse, type NextRequest } from "next/server";
import { liveConfig } from "../../../server/config";
import { authClient } from "../../../server/auth";
export async function GET(req: NextRequest) {
  try {
    const config = liveConfig();
    const code = req.nextUrl.searchParams.get("code");
    if (!code)
      return NextResponse.redirect(config.origin + "/login?error=confirmation");
    const { error } = await (
      await authClient()
    ).auth.exchangeCodeForSession(code);
    return NextResponse.redirect(
      config.origin + (error ? "/login?error=confirmation" : "/app/setup"),
    );
  } catch {
    return NextResponse.json(
      { error: "Customer access disabled" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

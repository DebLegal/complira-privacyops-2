import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { liveConfig } from "../../../../server/config";
import { authClient, verifiedUser } from "../../../../server/auth";
import {
  loadWorkspace,
  listOrganizations,
  listMembers,
  createOrganization,
  mutateWorkspace,
  inviteMember,
  acceptInvitation,
  generateReport,
} from "../../../../server/workspace";
import {
  ServiceError,
  requireSameOrigin,
  organizationSchema,
  invitationSchema,
  acceptSchema,
  authInputSchema,
} from "../../../../lib/live-policy";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function body(req: NextRequest) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new ServiceError(415, "JSON required");
  const text = await req.text();
  if (Buffer.byteLength(text) > 1048576)
    throw new ServiceError(413, "Request too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new ServiceError(400, "Invalid JSON");
  }
}
function fail(error: unknown) {
  if (error instanceof ServiceError)
    return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json(
      {
        error: "Invalid input",
        issues: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      400,
    );
  if (
    error instanceof Error &&
    /Version conflict|Self-approval|Reviewer|Only |required|Unknown |missing|Draft|pending/.test(
      error.message,
    )
  )
    return json(
      { error: error.message },
      /Version conflict/.test(error.message) ? 409 : 403,
    );
  console.error("Customer API operation failed; details withheld");
  return json(
    { error: "Operation unavailable. No changes were committed." },
    503,
  );
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    liveConfig();
    const user = await verifiedUser();
    const path = (await params).path.join("/");
    if (path === "organizations")
      return json({ organizations: await listOrganizations(user.id) });
    const org = z.uuid().parse(req.nextUrl.searchParams.get("organizationId"));
    if (path === "members")
      return json({ members: await listMembers(user.id, org) });
    const result = await loadWorkspace(user.id, org);
    if (path === "workspace") return json(result);
    if (path === "reports") {
      const format = z
        .enum(["json", "csv"])
        .parse(req.nextUrl.searchParams.get("format") || "json");
      return new NextResponse(await generateReport(user.id, org, format), {
        headers: {
          "Content-Type":
            format === "csv" ? "text/csv;charset=utf-8" : "application/json",
          "Content-Disposition": `attachment; filename="complira-private-report.${format}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return json({ error: "Endpoint not found" }, 404);
  } catch (e) {
    return fail(e);
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const config = liveConfig();
    requireSameOrigin(req.headers.get("origin"), config.origin);
    const path = (await params).path.join("/");
    const input = await body(req);
    if (path === "auth") {
      const data = authInputSchema.parse(input);
      const client = await authClient();
      const result =
        data.action === "signup"
          ? await client.auth.signUp({
              email: data.email,
              password: data.password,
              options: { emailRedirectTo: config.origin + "/auth/callback" },
            })
          : await client.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });
      if (result.error)
        return json(
          {
            error:
              "Authentication unsuccessful. Check credentials, email confirmation and provider limits.",
          },
          401,
        );
      return json({
        message:
          data.action === "signup"
            ? "Check your email to confirm your account."
            : "Signed in.",
      });
    }
    const user = await verifiedUser();
    if (path === "signout") {
      await (await authClient()).auth.signOut();
      return json({ message: "Signed out" });
    }
    if (path === "organizations") {
      const data = organizationSchema.parse(input);
      return json(
        { organizationId: await createOrganization(user.id, data.name) },
        201,
      );
    }
    if (path === "mutations")
      return json(await mutateWorkspace(user.id, input));
    if (path === "invitations") {
      const data = invitationSchema.parse(input);
      const token = await inviteMember(user.id, data);
      return json(
        {
          invitationUrl: config.origin + "/app/accept?token=" + token,
          message:
            "Share this single-use link privately with the invited member. Expires in 48 hours.",
        },
        201,
      );
    }
    if (path === "accept") {
      const data = acceptSchema.parse(input);
      return json({
        organizationId: await acceptInvitation(
          user.id,
          user.email!,
          data.token,
        ),
      });
    }
    if (path === "evidence/upload")
      return json(
        { error: "File uploads are disabled. Metadata-only private beta." },
        403,
      );
    return json({ error: "Endpoint not found" }, 404);
  } catch (e) {
    return fail(e);
  }
}

import { z } from "zod";
import { commandSchema, type Command } from "./domain";
export const roleSchema = z.enum([
  "owner",
  "admin",
  "editor",
  "reviewer",
  "viewer",
]);
export type Role = z.infer<typeof roleSchema>;
export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function authorizeCommand(role: Role, cmd: Command) {
  if (role === "viewer")
    throw new ServiceError(403, "Viewer access is read only");
  if (cmd.type === "review" && role !== "reviewer")
    throw new ServiceError(403, "Reviewer role required");
  if (cmd.type === "closure" && role === "reviewer")
    throw new ServiceError(
      403,
      "An editor must request closure before independent review",
    );
}
export const mutationSchema = z
  .object({
    organizationId: z.uuid(),
    expectedVersion: z.number().int().positive(),
    requestId: z.uuid(),
    command: commandSchema,
  })
  .strict();
export const organizationSchema = z
  .object({ name: z.string().trim().min(1).max(160) })
  .strict();
export const invitationSchema = z
  .object({
    organizationId: z.uuid(),
    email: z.email().max(254),
    role: z.enum(["admin", "editor", "reviewer", "viewer"]),
  })
  .strict();
export const acceptSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const authInputSchema = z
  .object({
    action: z.enum(["signin", "signup"]),
    email: z.email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();
export function requireSameOrigin(origin: string | null, expected: string) {
  if (!origin || origin !== new URL(expected).origin)
    throw new ServiceError(403, "Same-origin request required");
}

import "server-only";
import { Pool, type PoolClient } from "pg";
import { liveConfig } from "./config";
import { ServiceError } from "../lib/live-policy";
let pool: Pool | undefined;
export async function withTenant<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  pool ??= new Pool({
    connectionString: liveConfig().database,
    max: 4,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read");
    await client.query("set local role complira_server");
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    if (e && typeof e === "object" && "code" in e && e.code === "40001")
      throw new ServiceError(
        409,
        "Workspace version conflict. Reload before retrying.",
      );
    throw e;
  } finally {
    client.release();
  }
}

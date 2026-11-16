import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
const name = "complira-rls-" + process.pid;
const dockerArgs = [
  "-u",
  "DOCKER_HOST",
  "-u",
  "DOCKER_CONTEXT",
  "-u",
  "DOCKER_TLS",
  "-u",
  "DOCKER_TLS_VERIFY",
  "-u",
  "DOCKER_CERT_PATH",
  "docker",
  "--host=unix:///var/run/docker.sock",
];
function docker(args, input) {
  return execFileSync("env", [...dockerArgs, ...args], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}
const password = randomBytes(24).toString("hex");
try {
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "-e",
    "POSTGRES_PASSWORD=" + password,
    "-p",
    "127.0.0.1::5432",
    "postgres:17",
  ]);
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      docker(["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"]);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!ready) throw Error("Disposable PostgreSQL did not become ready");
  const bootstrap = `create role authenticated nologin nobypassrls;create role anon nologin nobypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub' $$;`;
  // auth.uid has the exact UUID return type used by Supabase.
  docker(
    ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
    bootstrap.replace(
      "select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'",
      "select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid",
    ) + "grant usage on schema auth to public;",
  );
  docker(
    ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
    readFileSync("db/migrations/001_private_beta.sql", "utf8"),
  );
  const port = docker(["port", name, "5432/tcp"]).trim().split(":").at(-1);
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/db-integration.ts",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        COMPLIRA_APP_ENABLED: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://test-auth.invalid",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "synthetic-test-placeholder-not-a-credential",
        APP_ORIGIN: "https://test-app.invalid",
        DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`,
      },
    },
  );
  if (result.status !== 0) process.exitCode = result.status || 1;
} catch (e) {
  console.error("DB tests failed:", e.message);
  process.exitCode = 1;
} finally {
  try {
    docker(["stop", name]);
  } catch {}
}

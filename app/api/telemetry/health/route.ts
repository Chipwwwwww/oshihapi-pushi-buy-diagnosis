import { type Client as PgClient } from "pg";

type PgClientConstructor = new (config: {
  connectionString: string;
}) => PgClient;

export const runtime = "nodejs";

const ENV_HINT =
  "Set .env.local: POSTGRES_URL_NON_POOLING=... (or POSTGRES_URL/DATABASE_URL)";

const loadPgClient = () => {
  const requireFn = eval("require") as NodeRequire;
  const pgModule = requireFn("pg") as { Client: PgClientConstructor };
  return pgModule.Client;
};

const getConnectionString = () =>
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

const shortenError = (error: unknown) => {
  if (error instanceof Error) {
    const firstLine = error.message.split("\n")[0];
    return firstLine.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]").slice(0, 180);
  }
  return "unknown_error";
};

const buildDbHint = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("ssl")) {
    return "Check SSL settings for Neon/Vercel Postgres.";
  }
  if (lower.includes("password") || lower.includes("authentication")) {
    return "Check database username/password in env.";
  }
  if (lower.includes("timeout") || lower.includes("connect")) {
    return "Check database host/network access.";
  }
  return undefined;
};

export async function GET() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    const missing = ["POSTGRES_URL_NON_POOLING", "POSTGRES_URL", "DATABASE_URL"].filter(
      (key) => !process.env[key],
    );
    return Response.json(
      {
        ok: false,
        error: "db_env_missing",
        hint: ENV_HINT,
        missing,
      },
      { status: 500 },
    );
  }

  const Client = loadPgClient();
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return Response.json({ ok: true, db: "ok" });
  } catch (error) {
    console.error("Telemetry health check failed", error);
    const message = shortenError(error);
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : undefined;
    const hint = buildDbHint(message);
    return Response.json(
      {
        ok: false,
        error: "db_unreachable",
        detail: code ? `code=${code}; ${message}` : message,
        ...(hint ? { hint } : {}),
      },
      { status: 500 },
    );
  } finally {
    await client.end();
  }
}

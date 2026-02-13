import crypto from "crypto";

type PgClientConstructor = new (config: {
  connectionString: string;
}) => {
  connect: () => Promise<void>;
  query: (text: string, params?: unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
};

const MAX_PAYLOAD_BYTES = 64 * 1024;
const ALLOWED_EVENTS = new Set(["run_export", "l1_feedback"]);

export const runtime = "nodejs";

const ENV_HINT =
  "Set .env.local: DATABASE_URL=... (or POSTGRES_URL_NON_POOLING/POSTGRES_URL/DATABASE_URL_UNPOOLED)";

const DB_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
] as const;

const INVALID_DB_HOSTS = new Set(["base", "localhost", "127.0.0.1", "postgres", "db"]);

const loadPgClient = () => {
  const requireFn = eval("require") as NodeRequire;
  const pgModule = requireFn("pg") as { Client: PgClientConstructor };
  return pgModule.Client;
};

const jsonError = (
  status: number,
  error: string,
  options?: { hint?: string; detail?: string; missing?: string[] },
) => {
  const payload = {
    ok: false,
    error,
    ...(options?.hint ? { hint: options.hint } : {}),
    ...(options?.detail ? { detail: options.detail } : {}),
    ...(options?.missing ? { missing: options.missing } : {}),
  };

  return Response.json(payload, { status });
};

const getConnectionString = () => {
  for (const key of DB_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      return { connectionString: value, envKey: key };
    }
  }
  return null;
};

const getInvalidConnectionHost = (connectionString: string, envKey: string) => {
  try {
    const host = new URL(connectionString).hostname.toLowerCase();
    if (INVALID_DB_HOSTS.has(host)) {
      console.error(
        `[telemetry] invalid db host "${host}" from ${envKey}. Set Vercel Project Env DATABASE_URL to a Neon host (*.neon.tech) and redeploy.`,
      );
      return host;
    }
  } catch {
    // Keep existing behavior for malformed URLs; pg will produce its own runtime error.
  }

  return null;
};

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

export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return jsonError(413, "bad_request", { hint: "Payload too large." });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
    return jsonError(413, "bad_request", { hint: "Payload too large." });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "bad_request", { hint: "Invalid JSON." });
  }

  if (typeof parsed !== "object" || parsed === null) {
    return jsonError(400, "bad_request", { hint: "Invalid payload." });
  }

  const { event, sessionId, data } = parsed as {
    event?: string;
    sessionId?: string;
    data?: unknown;
  };

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return jsonError(400, "bad_request", { hint: "Invalid event." });
  }

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return jsonError(400, "bad_request", { hint: "Invalid session." });
  }

  if (typeof data !== "object" || data === null) {
    return jsonError(400, "bad_request", { hint: "Invalid data." });
  }

  const dbConfig = getConnectionString();

  if (!dbConfig) {
    const missing = DB_ENV_KEYS.filter((key) => !process.env[key]);
    return jsonError(500, "db_env_missing", { hint: ENV_HINT, missing });
  }

  const invalidHost = getInvalidConnectionHost(dbConfig.connectionString, dbConfig.envKey);
  if (invalidHost) {
    return jsonError(500, "db_insert_failed", {
      detail: `invalid_db_host=${invalidHost}`,
      hint: "Set Vercel Project Env DATABASE_URL to a Neon host (*.neon.tech) and redeploy.",
    });
  }

  const Client = loadPgClient();
  const client = new Client({ connectionString: dbConfig.connectionString });
  const id = crypto.randomUUID();
  try {
    await client.connect();
    const result = (await client.query(
      "INSERT INTO telemetry_runs (id, session_id, source, data) VALUES ($1, $2, $3, $4) RETURNING created_at",
      [id, sessionId, event, data],
    )) as { rows?: Array<{ created_at?: string | Date }> };
    const createdAtRaw = result?.rows?.[0]?.created_at;
    const createdAt =
      createdAtRaw instanceof Date ? createdAtRaw.toISOString() : createdAtRaw;
    return Response.json({ ok: true, id, createdAt });
  } catch (error) {
    console.error("Telemetry insert failed", error);
    const message = shortenError(error);
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : undefined;
    const hint = buildDbHint(message);
    return jsonError(500, "db_insert_failed", {
      detail: code ? `code=${code}; ${message}` : message,
      ...(hint ? { hint } : {}),
    });
  } finally {
    await client.end();
  }
}

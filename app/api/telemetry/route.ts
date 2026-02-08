import { randomUUID } from "crypto";

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
  "Set .env.local POSTGRES_URL_NON_POOLING=postgresql://USER:PASSWORD@HOST/db";

const loadPgClient = () => {
  const requireFn = eval("require") as NodeRequire;
  const pgModule = requireFn("pg") as { Client: PgClientConstructor };
  return pgModule.Client;
};

const jsonError = (
  status: number,
  error: string,
  options?: { hint?: string; detail?: string },
) =>
  Response.json(
    {
      ok: false,
      error,
      ...(options?.hint ? { hint: options.hint } : {}),
      ...(options?.detail ? { detail: options.detail } : {}),
    },
    { status },
  );

const getConnectionString = () =>
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

const shortenError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message.split("\n")[0].slice(0, 140);
  }
  return "unknown_error";
};

export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return jsonError(413, "Payload too large");
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
    return jsonError(413, "Payload too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "Invalid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    return jsonError(400, "Invalid payload");
  }

  const { event, sessionId, data } = parsed as {
    event?: string;
    sessionId?: string;
    data?: unknown;
  };

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return jsonError(400, "Invalid event");
  }

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return jsonError(400, "Invalid session");
  }

  if (typeof data !== "object" || data === null) {
    return jsonError(400, "Invalid data");
  }

  const connectionString = getConnectionString();

  if (!connectionString) {
    return jsonError(500, "DB env missing", { hint: ENV_HINT });
  }

  const Client = loadPgClient();
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query(
      "INSERT INTO telemetry_runs (id, session_id, source, data) VALUES ($1, $2, $3, $4)",
      [randomUUID(), sessionId, event, data],
    );
  } catch (error) {
    console.error("Telemetry insert failed", error);
    return jsonError(500, "DB insert failed", {
      detail: shortenError(error),
    });
  } finally {
    await client.end();
  }

  return Response.json({ ok: true });
}

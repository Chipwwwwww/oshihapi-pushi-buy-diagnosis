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

const loadPgClient = () => {
  const requireFn = eval("require") as NodeRequire;
  const pgModule = requireFn("pg") as { Client: PgClientConstructor };
  return pgModule.Client;
};

export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof parsed !== "object" || parsed === null) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { event, sessionId, data } = parsed as {
    event?: string;
    sessionId?: string;
    data?: unknown;
  };

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response("Invalid event", { status: 400 });
  }

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return new Response("Invalid session", { status: 400 });
  }

  if (typeof data !== "object" || data === null) {
    return new Response("Invalid data", { status: 400 });
  }

  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL;

  if (!connectionString) {
    return new Response("Missing database configuration", { status: 500 });
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
    return new Response("Failed to insert telemetry", { status: 500 });
  } finally {
    await client.end();
  }

  return Response.json({ ok: true });
}

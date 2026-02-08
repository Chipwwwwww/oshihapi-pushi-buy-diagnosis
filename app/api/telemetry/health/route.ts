type PgClientConstructor = new (config: {
  connectionString: string;
}) => {
  connect: () => Promise<void>;
  query: (text: string, params?: unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
};

export const runtime = "nodejs";

const ENV_HINT =
  "Set .env.local POSTGRES_URL_NON_POOLING=postgresql://USER:PASSWORD@HOST/db";

const loadPgClient = () => {
  const requireFn = eval("require") as NodeRequire;
  const pgModule = requireFn("pg") as { Client: PgClientConstructor };
  return pgModule.Client;
};

const getConnectionString = () =>
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

export async function GET() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    return Response.json(
      { ok: false, error: "DB env missing", hint: ENV_HINT },
      { status: 500 },
    );
  }

  const Client = loadPgClient();
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query("SELECT 1");
  } catch (error) {
    console.error("Telemetry health check failed", error);
    return Response.json(
      { ok: false, error: "DB health check failed" },
      { status: 500 },
    );
  } finally {
    await client.end();
  }

  return Response.json({ ok: true });
}

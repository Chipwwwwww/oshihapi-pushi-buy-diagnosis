export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Client } from "pg";

const ENV_HINT =
  "Vercel の Environment Variables に DATABASE_URL（推奨: pooled）または POSTGRES_URL を設定してください。";

function getConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL
  );
}

function redactMessage(error: unknown): string {
  const msg =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
  // redact connection strings
  return msg
    .split("\n")[0]
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
    .slice(0, 220);
}

function buildDbHint(messageLower: string): string | undefined {
  if (messageLower.includes("ssl")) return "SSL 設定（sslmode=require）を確認してください。";
  if (messageLower.includes("password") || messageLower.includes("authentication"))
    return "DB のユーザー/パスワード（env）を確認してください。";
  if (messageLower.includes("timeout") || messageLower.includes("connect") || messageLower.includes("econn"))
    return "DB ホスト/ネットワーク/接続制限を確認してください（pooler 推奨）。";
  return undefined;
}

export async function GET() {
  try {
    const connectionString = getConnectionString();

    if (!connectionString) {
      const keys = ["POSTGRES_URL_NON_POOLING", "POSTGRES_URL", "DATABASE_URL"] as const;
      const missing = keys.filter((k) => !process.env[k]);

      // debug しやすいように 200 で JSON を返す（ok=false）
      return NextResponse.json(
        {
          ok: false,
          error: "db_env_missing",
          hint: ENV_HINT,
          missing,
          present: {
            POSTGRES_URL_NON_POOLING: Boolean(process.env.POSTGRES_URL_NON_POOLING),
            POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
            DATABASE_URL: Boolean(process.env.DATABASE_URL),
          },
        },
        { status: 200 },
      );
    }

    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("SELECT 1 as ok");
      return NextResponse.json({ ok: true, db: "ok" }, { status: 200 });
    } finally {
      // end() が失敗しても health を壊さない
      await client.end().catch(() => {});
    }
  } catch (error) {
    const message = redactMessage(error);
    const lower = message.toLowerCase();
    const hint = buildDbHint(lower);

    // ここも 200 にして、白ページ 500 を避ける
    return NextResponse.json(
      {
        ok: false,
        error: "health_failed",
        message,
        ...(hint ? { hint } : {}),
      },
      { status: 200 },
    );
  }
}

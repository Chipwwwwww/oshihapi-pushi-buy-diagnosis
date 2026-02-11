import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown";

  return NextResponse.json(
    {
      commitSha: commitSha || "unknown",
      vercelEnv: process.env.VERCEL_ENV ?? "",
      vercelUrl: process.env.VERCEL_URL ?? "",
      gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GITHUB_REF_NAME ?? "",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

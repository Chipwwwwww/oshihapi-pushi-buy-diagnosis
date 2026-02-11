import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown";

  return NextResponse.json(
    {
      commitSha: commitSha || "unknown",
      vercelEnv: process.env.VERCEL_ENV ?? "",
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "",
      buildId: process.env.VERCEL_BUILD_ID ?? "",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
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

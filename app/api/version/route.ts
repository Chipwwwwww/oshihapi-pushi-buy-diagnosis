import { execSync } from "node:child_process";
import { NextResponse } from "next/server";

function resolveCommitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }

  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

export async function GET() {
  return NextResponse.json(
    {
      commitSha: resolveCommitSha(),
      vercelEnv: process.env.VERCEL_ENV ?? "",
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

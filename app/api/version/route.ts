import { execSync } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function resolveCommitSha(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel && fromVercel.trim()) return fromVercel.trim();

  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

export async function GET() {
  const commitSha = resolveCommitSha();
  const vercelEnv = process.env.VERCEL_ENV ?? "";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? "";

  return NextResponse.json(
    { commitSha, vercelEnv, deploymentId },
    { headers: { "cache-control": "no-store" } }
  );
}

import { NextResponse } from "next/server";
import { envConfig } from "@/utility/env/config";

/**
 * Exposes non-sensitive environment configuration to the client.
 *
 * Only returns URLs that are safe to expose publicly.
 * Server-side secrets like `DATABASE_URL` are never included.
 */
export async function GET() {
  return NextResponse.json({
    authServiceUrl: envConfig.authServiceUrl,
    appBaseUrl: envConfig.appBaseUrl,
  });
}

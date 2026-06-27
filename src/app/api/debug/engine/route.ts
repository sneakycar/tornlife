import { NextResponse } from "next/server";
import { inspectEngine } from "@/lib/character/inspect";
import { isEngineDebugEnabled } from "@/lib/character/inspect-types";
import { humanizeError } from "@/lib/utils/humanize-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isEngineDebugEnabled()) {
    return NextResponse.json({ error: "Engine debug is disabled" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const refreshTorn = searchParams.get("refresh") === "1";

  try {
    const inspection = await inspectEngine({ refreshTorn });
    return NextResponse.json(inspection);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: humanizeError(message) }, { status: 500 });
  }
}

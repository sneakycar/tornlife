import { NextResponse } from "next/server";
import { lifeService } from "@/lib/services/life-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const profile = await lifeService.regenerateAssessment();
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

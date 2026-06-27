import { NextResponse } from "next/server";
import { lifeService } from "@/lib/services/life-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  try {
    const { profile, entries } = await lifeService.lockCharacter();
    return NextResponse.json({ profile, entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

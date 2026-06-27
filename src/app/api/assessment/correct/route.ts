import { NextResponse } from "next/server";
import { lifeService } from "@/lib/services/life-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, value } = body as { type?: "quick" | "freeform"; value?: string };

    if (!value) {
      return NextResponse.json({ error: "value required" }, { status: 400 });
    }

    const profile = await lifeService.regenerateAssessment({
      type: type ?? "freeform",
      value,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

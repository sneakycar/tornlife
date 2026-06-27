import { NextResponse } from "next/server";
import { lifeService } from "@/lib/services/life-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { feedbackType, note, action } = body as {
      feedbackType?: string;
      note?: string;
      action?: "pin" | "unpin";
    };

    if (action === "pin") {
      const profile = await lifeService.pinCanon(id);
      return NextResponse.json({ profile });
    }

    if (action === "unpin") {
      const profile = await lifeService.unpinCanon(id);
      return NextResponse.json({ profile });
    }

    if (!feedbackType) {
      return NextResponse.json({ error: "feedbackType required" }, { status: 400 });
    }

    const result = await lifeService.applyEntryFeedback(id, feedbackType, note);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

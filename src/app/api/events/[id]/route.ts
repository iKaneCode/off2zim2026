import { NextResponse } from "next/server";
import { getMobileEvents } from "@/lib/mobile-backend";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const events = await getMobileEvents();
    const event = events.find((item) => item.id === resolvedParams.id);

    if (!event) {
      return apiError("Event not found.", 404);
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event detail route error:", error);
    return apiError("Unable to load the event right now.", 500);
  }
}

import { NextResponse } from "next/server";
import { getMobileDestinations } from "@/lib/mobile-backend";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const destinations = await getMobileDestinations();
    const destination = destinations.find(
      (item) => item.id === resolvedParams.id,
    );

    if (!destination) {
      return apiError("Destination not found.", 404);
    }

    return NextResponse.json({ destination });
  } catch (error) {
    console.error("Destination detail route error:", error);
    return apiError("Unable to load the destination right now.", 500);
  }
}

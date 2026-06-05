import { NextResponse } from "next/server";
import { getMobileStays } from "@/lib/mobile-backend";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const stays = await getMobileStays();
    const stay = stays.find((item) => item.id === resolvedParams.id);

    if (!stay) {
      return apiError("Stay not found.", 404);
    }

    return NextResponse.json({ stay });
  } catch (error) {
    console.error("Stay detail route error:", error);
    return apiError("Unable to load the stay right now.", 500);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LISTING_SELECT = {
  id: true,
  title: true,
  slug: true,
  category: true,
  listingType: true,
  shortDescription: true,
  location: true,
  basePrice: true,
  currency: true,
  images: true,
  company: {
    select: {
      id: true,
      companyName: true,
      isVerified: true,
    },
  },
} as const;

export async function GET() {
  const now = new Date();

  const entries = await prisma.featuredEntry.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      pathway: true,
      sortOrder: true,
      startDate: true,
      endDate: true,
      listing: { select: LISTING_SELECT },
    },
  });

  // Group by pathway
  const grouped: Record<string, typeof entries> = {
    sponsored: [],
    top_rated: [],
    editors_choice: [],
  };

  for (const entry of entries) {
    if (grouped[entry.pathway]) {
      grouped[entry.pathway].push(entry);
    }
  }

  return NextResponse.json({ featured: grouped, total: entries.length });
}

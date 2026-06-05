import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — toggle upvote on an answer
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    const answer = await prisma.forumAnswer.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, authorId: true, isRemoved: true },
    });

    if (!answer || answer.isRemoved) {
      return apiError("Answer not found.", 404);
    }
    if (answer.authorId === user.id) {
      return apiError("You cannot upvote your own answer.", 400);
    }

    const existing = await prisma.forumUpvote.findUnique({
      where: {
        answerId_userId: { answerId: resolvedParams.id, userId: user.id },
      },
    });

    if (existing) {
      // Remove upvote
      await prisma.$transaction([
        prisma.forumUpvote.delete({
          where: {
            answerId_userId: { answerId: resolvedParams.id, userId: user.id },
          },
        }),
        prisma.forumAnswer.update({
          where: { id: resolvedParams.id },
          data: { upvoteCount: { decrement: 1 } },
        }),
      ]);
      return NextResponse.json({ upvoted: false });
    }

    // Add upvote
    await prisma.$transaction([
      prisma.forumUpvote.create({
        data: { answerId: resolvedParams.id, userId: user.id },
      }),
      prisma.forumAnswer.update({
        where: { id: resolvedParams.id },
        data: { upvoteCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ upvoted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Forum upvote error:", error);
    return apiError("Unable to update upvote.", 500);
  }
}

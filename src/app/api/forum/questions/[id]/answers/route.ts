import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const answerSchema = z.object({
  body: z.string().min(10, "Answer must be at least 10 characters."),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const { user } = await requireSessionUser();

    const question = await prisma.forumQuestion.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, isRemoved: true },
    });

    if (!question || question.isRemoved) {
      return apiError("Question not found.", 404);
    }

    const payload = answerSchema.parse(await request.json());
    const isGuide = user.role === "guide";

    const answer = await prisma.forumAnswer.create({
      data: {
        questionId: resolvedParams.id,
        authorId: user.id,
        body: payload.body,
        isGuideAnswer: isGuide,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            role: true,
          },
        },
        _count: { select: { upvotes: true } },
      },
    });

    // Recalculate explorer score (answers = reviews written)
    if (!isGuide) {
      const { recalculateExplorerScore } = await import("@/lib/explorer-score");
      recalculateExplorerScore(user.id).catch(() => {});
    }

    return NextResponse.json(
      {
        answer: {
          id: answer.id,
          questionId: answer.questionId,
          body: answer.body,
          isGuideAnswer: answer.isGuideAnswer,
          upvoteCount: 0,
          createdAt: answer.createdAt.toISOString(),
          author: {
            id: answer.author.id,
            name:
              [answer.author.firstName, answer.author.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              answer.author.name ||
              "Explorer",
            avatarUrl: answer.author.image,
            isGuide: answer.author.role === "guide",
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid answer.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Post forum answer error:", error);
    return apiError("Unable to post answer.", 500);
  }
}

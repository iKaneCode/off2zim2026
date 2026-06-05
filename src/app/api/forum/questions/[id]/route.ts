import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeQuestion } from "@/app/api/forum/questions/route";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  try {
    const question = await prisma.forumQuestion.findUnique({
      where: { id: resolvedParams.id },
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
        _count: { select: { answers: { where: { isRemoved: false } } } },
        answers: {
          where: { isRemoved: false },
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
          orderBy: [
            { isGuideAnswer: "desc" },
            { upvoteCount: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!question || question.isRemoved) {
      return apiError("Question not found.", 404);
    }

    // Increment view count (fire-and-forget)
    prisma.forumQuestion
      .update({
        where: { id: resolvedParams.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    return NextResponse.json({
      question: serializeQuestion(question),
      answers: question.answers.map(serializeAnswer),
    });
  } catch (error) {
    console.error("Forum question detail error:", error);
    return apiError("Unable to load question.", 500);
  }
}

function serializeAnswer(answer: {
  id: string;
  questionId: string;
  authorId: string;
  body: string;
  isGuideAnswer: boolean;
  upvoteCount: number;
  createdAt: Date;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    image: string | null;
    role: string;
  };
  _count: { upvotes: number };
}) {
  return {
    id: answer.id,
    questionId: answer.questionId,
    body: answer.body,
    isGuideAnswer: answer.isGuideAnswer,
    upvoteCount: answer.upvoteCount,
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
  };
}

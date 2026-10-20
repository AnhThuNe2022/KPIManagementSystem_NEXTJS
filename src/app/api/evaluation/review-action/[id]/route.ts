import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";
import { UserRoleSystem } from "@/types/evaluation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await cookies()).has(appConfig.authCookieName)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (
    !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id)) ||
    !body ||
    typeof body.Comment !== "string" ||
    !body.Comment.trim() ||
    !Number.isSafeInteger(body.StepId) ||
    body.StepId < 1
  ) {
    return NextResponse.json({ message: "Invalid rejection details" }, { status: 400 });
  }

  try {
    await apiClient(`/KPIEvaluation/review-action/${id}`, {
      method: "POST",
      body: JSON.stringify({
        Action: 2, // ActionHistoty.Rejected
        Level: UserRoleSystem.ManagerMid,
        Comment: body.Comment.trim(),
        StepId: body.StepId,
      }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/evaluation/review-action/[id] failed:", error);
    return NextResponse.json(
      {
        message: "Unable to reject evaluation",
        ...(process.env.NODE_ENV === "development" && error instanceof Error
          ? {
              details:
                error.cause instanceof Error
                  ? `${error.message}: ${error.cause.message}`
                  : error.message,
            }
          : {}),
      },
      { status: getApiErrorStatus(error) },
    );
  }
}

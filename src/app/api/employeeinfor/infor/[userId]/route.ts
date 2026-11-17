import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await context.params;

    const result = await apiClient(
      `/employeeinfor/infor/${encodeURIComponent(userId)}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/employeeinfor/[userId] error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { message: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
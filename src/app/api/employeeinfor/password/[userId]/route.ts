import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await context.params;

    const body = await request.json();

    const result = await apiClient(
      `/employeeinfor/password/${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "POST /api/employeeinfor/password/[userId]/ error:",
      error
    );

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
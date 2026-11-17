import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await apiClient(
      "/notifications/sendMessage",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "POST /notifications/sendMessage error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
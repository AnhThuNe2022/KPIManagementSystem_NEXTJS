import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    console.log("UPsert route userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { message: "userId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    console.log("UPsert route body:", body);

    const result = await apiClient(
      `/userorganizations/upsert?userId=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "POST /api/userorganizations/upsert error:",
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
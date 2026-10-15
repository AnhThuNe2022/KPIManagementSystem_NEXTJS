// src/app/api/userorganizations/route.ts

import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "➡️ POST /userorganizations body:",
      body
    );

    const result = await apiClient(
      "/userorganizations/get-page",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "❌ POST /userorganizations error:",
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
      {
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
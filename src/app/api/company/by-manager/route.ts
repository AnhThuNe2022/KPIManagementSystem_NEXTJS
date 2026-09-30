// src/app/api/company/by-manager/route.ts

import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log(
      "➡️ POST /company/by-manager body:",
      body
    );

    const result = await apiClient(
      "/company/by-manager",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "❌ POST /api/company/by-manager error:",
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
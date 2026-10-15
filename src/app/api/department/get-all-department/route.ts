import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.toString();

    const result = await apiClient(
      `/department/get-all-department${query ? `?${query}` : ""}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "GET api/department/get-all-department error:",
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
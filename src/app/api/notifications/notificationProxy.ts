import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";

export async function proxyNotificationRequest(
  request: Request,
  backendPath: string,
  method: "GET" | "POST" | "DELETE"
) {
  try {
    const query = new URL(request.url).searchParams.toString();
    const endpoint = backendPath + (query ? "?" + query : "");
    const options: RequestInit = { method };

    if (method === "POST" && request.body) {
      options.body = await request.text();
    }

    const result = await apiClient(endpoint, options);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      method + " " + backendPath + " error:",
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

    const apiError =
      error instanceof Error
        ? error.message.match(/^API_ERROR_(\d{3}):/)
        : null;
    const upstreamStatus = Number(apiError?.[1]);

    if (
      Number.isInteger(upstreamStatus) &&
      upstreamStatus >= 400 &&
      upstreamStatus <= 599
    ) {
      return NextResponse.json(
        { message: "Backend API request failed" },
        { status: upstreamStatus }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
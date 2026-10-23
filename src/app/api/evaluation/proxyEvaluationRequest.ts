import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";

export async function proxyEvaluationRequest(endpoint: string, options: RequestInit = {}) {
  if (!(await cookies()).has(appConfig.authCookieName)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await apiClient(endpoint, options);
    return NextResponse.json(result ?? null);
  } catch (error) {
    console.error("Evaluation API request failed:", error);
    return NextResponse.json(
      {
        message: "Evaluation API request failed",
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

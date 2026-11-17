import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.toString();
  try {
    return NextResponse.json(
      await apiClient(`/department/get-all-department${query ? `?${query}` : ""}`, {
        signal: request.signal,
      }),
    );
  } catch (error) {
    const status = getApiErrorStatus(error);
    return NextResponse.json({ message: "Unable to load departments" }, { status });
  }
}

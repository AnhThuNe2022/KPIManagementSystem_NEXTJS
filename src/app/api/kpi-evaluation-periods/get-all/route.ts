import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { apiClient } from "@/lib/api/client";
import { getApiErrorStatus } from "@/lib/api/errors";
import { EvaluationStatus } from "@/types/evaluation";

export async function POST(request: Request) {
  if (!(await cookies()).has(appConfig.authCookieName)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  if (
    !body ||
    body.isactive !== "true" ||
    body.isevaluationenable !== "true" ||
    !Object.values(EvaluationStatus).includes(body.status)
  ) {
    return NextResponse.json({ message: "Invalid evaluation period filters" }, { status: 400 });
  }

  try {
    const result = await apiClient("/kpi-evaluation-periods/get-all", {
      method: "POST",
      body: JSON.stringify({
        isactive: body.isactive,
        isevaluationenable: body.isevaluationenable,
        status: body.status,
      }),
      signal: request.signal,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = getApiErrorStatus(error);
    return NextResponse.json({ message: "Unable to load evaluation periods" }, { status });
  }
}

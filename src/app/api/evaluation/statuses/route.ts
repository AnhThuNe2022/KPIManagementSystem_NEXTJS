import { NextResponse } from "next/server";
import { proxyEvaluationRequest } from "../proxyEvaluationRequest";

export async function GET(request: Request) {
  const templateId = new URL(request.url).searchParams.get("templateid") ?? "";
  if (!/^[1-9]\d*$/.test(templateId) || !Number.isSafeInteger(Number(templateId))) {
    return NextResponse.json({ message: "Invalid template ID" }, { status: 400 });
  }
  const query = new URLSearchParams({ "Filters[templateid]": templateId, "Filters[isactive]": "true" });
  return proxyEvaluationRequest(`/TemplateLevel/get-all-status?${query}`, {
    signal: request.signal,
  });
}

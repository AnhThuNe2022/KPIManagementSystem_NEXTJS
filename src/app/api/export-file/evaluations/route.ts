import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/client";
import { ApiError, getApiErrorStatus } from "@/lib/api/errors";
import { proxyApiRequest } from "@/lib/api/proxy";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }
  const ids = await request.json().catch(() => null);
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id < 1)) {
    return NextResponse.json({ message: "Danh sách ID đánh giá không hợp lệ." }, { status: 400 });
  }
  try {
    const records = await apiClient<{ evaluationDTO: { id: number } }[]>("/KPIEvaluation/GetListEvalautionAndDefByIds", {
      method: "POST", body: JSON.stringify(ids), signal: request.signal,
    });
    const receivedIds = new Set(records.map(record => record.evaluationDTO.id));
    if (records.length !== ids.length || ids.some(id => !receivedIds.has(id))) {
      return NextResponse.json({ message: "BE chưa trả đủ hồ sơ cần xuất." }, { status: 502 });
    }
    return proxyApiRequest(request, "/ExportFile/ExportEvaluationZip", {
      method: "POST", body: JSON.stringify(records), responseType: "response",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new NextResponse(error.body, { status: error.status, headers: { "Content-Type": error.contentType ?? "text/plain; charset=utf-8" } });
    }
    return NextResponse.json({ message: "Chưa xuất được file ZIP." }, { status: getApiErrorStatus(error) });
  }
}

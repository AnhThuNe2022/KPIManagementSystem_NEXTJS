import { NextResponse } from "next/server";
import { BACKEND_PATHS } from "@/server/adapters/backendContracts";
import { apiClient } from "@/server/api/client";
import { ApiError, getApiErrorStatus } from "@/server/api/errors";
import { isSameOriginMutation, proxyApiRequest, readJsonBody } from "@/server/api/proxy";

interface EvaluationWithDefRecord {
  evaluationDTO?: { id?: number };
  id?: number;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request, "POST")) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ message: "Danh sách ID đánh giá không hợp lệ." }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(body.map(Number)));
  if (uniqueIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    return NextResponse.json({ message: "ID đánh giá phải là số nguyên dương." }, { status: 400 });
  }

  let records: EvaluationWithDefRecord[];
  try {
    const raw = await apiClient<unknown>(BACKEND_PATHS.evaluationDefByIds, {
      method: "POST",
      body: JSON.stringify(uniqueIds),
      signal: request.signal,
    });
    records = Array.isArray(raw) ? (raw as EvaluationWithDefRecord[]) : [];
  } catch (error) {
    if (error instanceof ApiError) {
      return new NextResponse(error.body || JSON.stringify({ message: "Chưa xuất được file ZIP." }), {
        status: error.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    const status = getApiErrorStatus(error);
    return NextResponse.json(
      { message: status === 401 ? "Unauthorized" : "Chưa xuất được file ZIP." },
      { status },
    );
  }

  const receivedIds = new Set(
    records
      .map((item) => Number(item?.evaluationDTO?.id ?? item?.id))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  );
  if (records.length !== uniqueIds.length || uniqueIds.some((id) => !receivedIds.has(id))) {
    return NextResponse.json(
      { message: "Dữ liệu hồ sơ trả về chưa đầy đủ để xuất file ZIP." },
      { status: 502 },
    );
  }

  return proxyApiRequest(request, BACKEND_PATHS.exportEvaluationZip, {
    method: "POST",
    body: JSON.stringify(records),
    responseType: "response",
  });
}
